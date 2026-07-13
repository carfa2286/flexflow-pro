const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');

const app = express();

// Get port from environment or default to 3001
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'loans.db'));

// Initialize DB (same as original server.js)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      frequency TEXT NOT NULL,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      amount REAL NOT NULL,
      FOREIGN KEY(loan_id) REFERENCES loans(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER UNIQUE NOT NULL,
      score REAL DEFAULT 0,
      puntualidad REAL DEFAULT 0,
      volumen REAL DEFAULT 0,
      consistencia REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      badge_name TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id),
      UNIQUE(client_id, badge_name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER UNIQUE NOT NULL,
      whatsapp_enabled BOOLEAN DEFAULT 0,
      whatsapp_number TEXT,
      notify_payment_reminder BOOLEAN DEFAULT 1,
      notify_payment_confirmation BOOLEAN DEFAULT 1,
      notify_default_alert BOOLEAN DEFAULT 1,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      notification_type TEXT,
      message TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);
});

// API Routes (same as original server.js)
// 1. GET All Clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

// 2. POST New Client
app.post('/api/clients', (req, res) => {
  const { cedula, name, phone, email } = req.body;
  db.run(
    'INSERT INTO clients (cedula, name, phone, email) VALUES (?, ?, ?, ?)',
    [cedula, name, phone, email],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, cedula, name, phone, email });
    }
  );
});

// 3. GET Client Details
app.get('/api/clients/:id', (req, res) => {
  db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(row || {});
  });
});

// 4. GET Client Loans
app.get('/api/loans/:client_id', (req, res) => {
  db.all('SELECT * FROM loans WHERE client_id = ?', [req.params.client_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

// 5. POST New Loan
app.post('/api/loans', (req, res) => {
  const { client_id, amount, interest_rate, frequency, start_date } = req.body;
  db.run(
    'INSERT INTO loans (client_id, amount, interest_rate, frequency, start_date) VALUES (?, ?, ?, ?, ?)',
    [client_id, amount, interest_rate, frequency, start_date || new Date()],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, client_id, amount, interest_rate, frequency });
    }
  );
});

// 6. POST Payment
app.post('/api/payments', (req, res) => {
  const { loan_id, amount } = req.body;
  db.run(
    'INSERT INTO payments (loan_id, amount, payment_date) VALUES (?, ?, ?)',
    [loan_id, amount, new Date()],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, loan_id, amount });
    }
  );
});

// 7. GET Dashboard
app.get('/api/dashboard', (req, res) => {
  db.all('SELECT amount FROM loans', (err, loans) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalLoaned = loans.reduce((sum, l) => sum + l.amount, 0);
    res.json({ totalLoaned, totalEarned: 0, monthlyProjection: 0, loanCount: loans.length });
  });
});

// 8. GET Delinquents
app.get('/api/delinquents', (req, res) => {
  db.all(`
    SELECT c.*, l.*, p.payment_date, l.frequency,
           CASE
             WHEN l.frequency = 'Semanal' THEN 7
             WHEN l.frequency = 'Quincenal' THEN 15
             WHEN l.frequency = 'Mensual' THEN 30
             ELSE 30
           END as paymentIntervalDays
    FROM clients c
    JOIN loans l ON c.id = l.client_id
    LEFT JOIN payments p ON l.id = p.loan_id
    WHERE l.status = 'active'
    ORDER BY p.payment_date DESC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const today = new Date();
    const delinquents = rows.filter(row => {
      if (!row.payment_date) return true;
      const lastPayment = new Date(row.payment_date);
      const nextPaymentDate = new Date(lastPayment.getTime() + row.paymentIntervalDays * 24 * 60 * 60 * 1000);
      return today > nextPaymentDate;
    });

    res.json(delinquents || []);
  });
});

// 9. POST Expense
app.post('/api/expenses', (req, res) => {
  const { category, amount, description } = req.body;
  db.run(
    'INSERT INTO expenses (category, amount, description, date) VALUES (?, ?, ?, ?)',
    [category, amount, description, new Date()],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID, category, amount, description });
    }
  );
});

// 10. GET Expenses
app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 11. GET Reports
app.get('/api/reports/monthly', (req, res) => {
  db.all(`
    SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total
    FROM payments GROUP BY month
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 12. GET Client Scores
app.get('/api/clients/:id/scores', (req, res) => {
  db.get('SELECT * FROM client_scores WHERE client_id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { score: 0 });
  });
});

// 13. GET Client Badges
app.get('/api/clients/:id/badges', (req, res) => {
  db.all('SELECT * FROM client_badges WHERE client_id = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// 14. GET Public Profiles
app.get('/api/clients/public-profiles', (req, res) => {
  res.json([]);
});

// 15. POST Settings
app.post('/api/settings', (req, res) => {
  res.json({ saved: true });
});

// 16. GET Settings
app.get('/api/settings', (req, res) => {
  res.json({});
});

// Recordatorios automáticos
cron.schedule('0 8 * * *', () => {
  console.log('Enviando recordatorios de pago...');
});

// SPA Fallback - CRITICAL for React apps
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ FlexFlow Pro corriendo en puerto ${PORT}`);
  console.log(`📱 Accesible desde cualquier dispositivo en la red`);
});
