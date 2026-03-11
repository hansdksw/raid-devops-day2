import './tracer';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Mock database
const mockDatabase = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com' },
];

// Transform user data: split name into first and last name
export const transformUserData = (user: typeof mockDatabase[0]) => {
  const [firstName, lastName] = user.name.split('-');
  return {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    email: user.email,
  };
};

// Extract company domain from email
export const extractCompanyDomain = (email: string) => {
  return email.split('@')[1];
};

// Simulate database retrieval
const getUsersFromDatabase = () => {
  return mockDatabase;
};

app.get('/api/users', (req, res) => {
  const users = getUsersFromDatabase();
  const transformedUsers = users.map(transformUserData);
  res.json(transformedUsers);
});

app.get('/api/companies', (req, res) => {
  const users = getUsersFromDatabase();
  const domains = users.map(user => extractCompanyDomain(user.email));
  const uniqueDomains = Array.from(new Set(domains));
  res.json(uniqueDomains);
});

// Unreliable endpoint: fails ~50% of the time
// The auto-instrumented Express span will be marked as error in Jaeger automatically
app.get('/api/unreliable', (req, res) => {
  if (Math.random() < 0.5) {
    // Throwing will cause the auto-instrumented span to record the error
    throw new Error('Simulated intermittent failure');
  }
  res.json({
    status: 'ok',
    message: 'You got lucky — this endpoint fails ~50% of the time.',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
