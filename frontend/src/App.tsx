import { useState, useEffect, useCallback } from 'react'
// Import your OTel instruments
import { unreliableBtnCounter, apiLatencyHistogram, logger } from './tracer'
import { SeverityNumber } from '@opentelemetry/api-logs'

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

interface UnreliableResult {
  status: 'ok' | 'error' | 'idle'
  message: string
  timestamp?: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function App() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreliable, setUnreliable] = useState<UnreliableResult>({ status: 'idle', message: 'Not yet called' })
  const [unreliableLoading, setUnreliableLoading] = useState(false)

  useEffect(() => {
    logger.emit({
      severityNumber: SeverityNumber.INFO,
      body: 'App initialized: Fetching initial data',
    });

    Promise.all([
      fetch(`${API_URL}/api/users`).then(res => res.json()),
      fetch(`${API_URL}/api/companies`).then(res => res.json())
    ])
      .then(([usersData, companiesData]) => {
        setUsers(usersData)
        setCompanies(companiesData)
        setLoading(false)
      })
      .catch((err) => {
        setError('Failed to load data')
        setLoading(false)
        logger.emit({
          severityNumber: SeverityNumber.ERROR,
          body: 'Initial data fetch failed',
          attributes: { error: String(err) }
        });
      })
  }, [])

  const callUnreliable = useCallback(() => {
    const startTime = performance.now(); // Start timer for Histogram
    setUnreliableLoading(true);

    // 1. Increment Metric: Button Clicked
    unreliableBtnCounter.add(1, { 'action': 'click' });

    fetch(`${API_URL}/api/unreliable`)
      .then(async res => {
        const duration = performance.now() - startTime;

        // 2. Record Metric: API Latency
        apiLatencyHistogram.record(duration, { 'status_code': res.status });

        if (!res.ok) {
          const text = await res.text();
          const errorMsg = `HTTP ${res.status} — ${text.slice(0, 120)}`;
          setUnreliable({ status: 'error', message: errorMsg });

          // 3. Log Error
          logger.emit({
            severityNumber: SeverityNumber.WARN,
            body: 'Unreliable API returned an error status',
            attributes: { status: res.status, message: text }
          });
        } else {
          const data = await res.json();
          setUnreliable({ status: 'ok', message: data.message, timestamp: data.timestamp });

          // 4. Log Success
          logger.emit({
            severityNumber: SeverityNumber.INFO,
            body: 'Unreliable API call successful',
            attributes: { duration_ms: Math.round(duration) }
          });
        }
      })
      .catch(err => {
        setUnreliable({ status: 'error', message: String(err) });

        logger.emit({
          severityNumber: SeverityNumber.ERROR,
          body: 'Network error calling unreliable API',
          attributes: { error: String(err) }
        });
      })
      .finally(() => setUnreliableLoading(false))
  }, [])

  // ... (rest of your styles and JSX remains the same)
  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px'
  }

  const thStyle: React.CSSProperties = {
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold'
  }

  const tdStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '12px'
  }

  const unreliableBg =
    unreliable.status === 'ok' ? '#e6ffed' :
      unreliable.status === 'error' ? '#fff0f0' : '#fafafa'

  const unreliableBadge =
    unreliable.status === 'ok' ? { text: 'SUCCESS', color: '#2e7d32' } :
      unreliable.status === 'error' ? { text: 'FAILED', color: '#c62828' } :
        { text: 'IDLE', color: '#888' }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      <h1>Users</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li key={user.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '12px', marginBottom: '8px' }}>
            <div>
              <strong>First Name:</strong> {user.first_name}
            </div>
            <div>
              <strong>Last Name:</strong> {user.last_name}
            </div>
            <div>
              <strong>Email:</strong> <span style={{ color: '#666' }}>{user.email}</span>
            </div>
          </li>
        ))}
      </ul>

      <h2>Companies</h2>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Company Domain</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(domain => (
            <tr key={domain}>
              <td style={tdStyle}>{domain}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>
        Unreliable Endpoint{' '}
        <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#888' }}>
          — fails ~50% of the time (check Jaeger for error spans)
        </span>
      </h2>
      <p style={{ color: '#555', fontSize: '14px', marginTop: 0 }}>
        Each call to <code>/api/unreliable</code> has a 50 % chance of returning HTTP 500.
        The auto-instrumented Express span is automatically marked as an error in Jaeger — no extra OTel SDK needed.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Result</th>
            <th style={thStyle}>Message</th>
            <th style={thStyle}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: unreliableBg }}>
            <td style={tdStyle}>
              <span style={{ fontWeight: 'bold', color: unreliableBadge.color }}>
                {unreliableBadge.text}
              </span>
            </td>
            <td style={tdStyle}>{unreliable.message}</td>
            <td style={tdStyle}>{unreliable.timestamp ?? '—'}</td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={callUnreliable}
        disabled={unreliableLoading}
        style={{
          marginTop: '12px',
          padding: '8px 20px',
          cursor: unreliableLoading ? 'not-allowed' : 'pointer',
          backgroundColor: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
        }}
      >
        {unreliableLoading ? 'Calling…' : 'Call /api/unreliable'}
      </button>
    </div>
  )
}

export default App