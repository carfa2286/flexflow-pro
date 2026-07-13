const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Mock data
let clients = [
  { id: 1, cedula: '123456', name: 'Juan', phone: '3001234567', email: 'juan@example.com' },
  { id: 2, cedula: '234567', name: 'María', phone: '3007654321', email: 'maria@example.com' }
];

let loans = [
  { id: 1, client_id: 1, amount: 200000, interest_rate: 12, frequency: 'Mensual', start_date: new Date(), status: 'active' }
];

// API Routes
app.get('/api/clients', (req, res) => res.json(clients));
app.post('/api/clients', (req, res) => {
  const newClient = { ...req.body, id: Math.max(...clients.map(c => c.id), 0) + 1 };
  clients.push(newClient);
  res.json(newClient);
});

app.get('/api/loans/:client_id', (req, res) => {
  res.json(loans.filter(l => l.client_id == req.params.client_id));
});

app.post('/api/loans', (req, res) => {
  const newLoan = { ...req.body, id: Math.max(...loans.map(l => l.id), 0) + 1 };
  loans.push(newLoan);
  res.json(newLoan);
});

app.post('/api/payments', (req, res) => {
  res.json({ id: 1, loan_id: req.body.loan_id, amount: req.body.amount });
});

app.get('/api/dashboard', (req, res) => {
  const totalLoaned = loans.reduce((sum, l) => sum + l.amount, 0);
  res.json({ totalLoaned, totalEarned: 0, monthlyProjection: 0, loanCount: loans.length });
});

app.get('/api/delinquents', (req, res) => res.json([]));
app.get('/api/expenses', (req, res) => res.json([]));
app.get('/api/clients/:id/scores', (req, res) => res.json({ score: 85 }));
app.get('/api/clients/:id/badges', (req, res) => res.json([]));
app.post('/api/settings', (req, res) => res.json({ saved: true }));
app.get('/api/settings', (req, res) => res.json({}));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

module.exports = app;
