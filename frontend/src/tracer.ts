import { metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// Metrics & Logs SDKs
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

const BASE_URL = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'raid-frontend',
});

// 1. Setup Tracing
const tracerProvider = new WebTracerProvider({ resource });
tracerProvider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({ url: `${BASE_URL}/v1/traces` })));
tracerProvider.register();

// 2. Setup Metrics
const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${BASE_URL}/v1/metrics` }),
      exportIntervalMillis: 60000,
    }),
  ],
});
metrics.setGlobalMeterProvider(meterProvider);

// 3. Setup Logs
const loggerProvider = new LoggerProvider({ resource });
loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${BASE_URL}/v1/logs` })));
logs.setGlobalLoggerProvider(loggerProvider);

// 4. Register Auto-instrumentation (Fetch, XHR, etc.)
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [/.*/],
        clearTimingResources: true,
      },
    }),
  ],
});

// 5. Export Instruments
export const meter = metrics.getMeter('raid-frontend-meter');
export const logger = logs.getLogger('raid-frontend-logger');

// Create your counter
export const unreliableBtnCounter = meter.createCounter('button_call_unreliable_total', {
  description: 'Total number of times the unreliable button was clicked',
});

// Bonus: Create a Histogram to track latency
export const apiLatencyHistogram = meter.createHistogram('api_call_duration_ms', {
  description: 'Duration of unreliable API calls',
  unit: 'ms',
});