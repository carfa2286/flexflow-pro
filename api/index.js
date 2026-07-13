const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client/build')));

const db = new sqlite3.Database(path.join(__dirname, '../loans.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, cedula TEXT UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, date_created DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, amount REAL NOT NULL, interest_rate REAL NOT NULL, frequency TEXT NOT NULL, start_date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'active', FOREIGN KEY(client_id) REFERENCES clients(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, loan_id INTEGER NOT NULL, payment_date DATETIME DEFAULT CURRENT_TIMESTAMP, amount REAL NOT NULL, FOREIGN KEY(loan_id) REFERENCES loans(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, amount REAL NOT NULL, date DATETIME DEFAULT CURRENT_TIMESTAMP, description TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS client_scores (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER UNIQUE NOT NULL, score REAL DEFAULT 0, puntualidad REAL DEFAULT 0, volumen REAL DEFAULT 0, consistencia REAL DEFAULT 0, last_updated DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES clients(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS client_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, badge_name TEXT NOT NULL, earned_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES clients(id), UNIQUE(client_id, badge_name))`);
  db.run(`CREATE TABLE IF NOT EXISTS notification_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER UNIQUE NOT NULL, whatsapp_enabled BOOLEAN DEFAULT 0, whatsapp_number TEXT, notify_payment_reminder BOOLEAN DEFAULT 1, notify_payment_confirmation BOOLEAN DEFAULT 1, notify_default_alert BOOLEAN DEFAULT 1, FOREIGN KEY(client_id) REFERENCES clients(id))`);
  db.run(`CREATE TABLE IF NOT EXISTS notification_log (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, notification_type TEXT, message TEXT, sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(client_id) REFERENCES clients(id))`);
});

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

app.post('/api/clients', (req, res) => {
  const { cedula, name, phone, email } = req.body;
  db.run('INSERT INTO clients (cedula, name, phone, email) VALUES (?, ?, ?, ?)', [cedula, name, phone, email], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, cedula, name, phone, email });
  });
});

app.get('/api/loans/:client_id', (req, res) => {
  db.all('SELECT * FROM loans WHERE client_id = ?', [req.params.client_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

app.post('/api/loans', (req, res) => {
  const { client_id, amount, interest_rate, frequency, start_date } = req.body;
  db.run('INSERT INTO loans (client_id, amount, interest_rate, frequency, start_date) VALUES (?, ?, ?, ?, ?)', [client_id, amount, interest_rate, frequency, start_date || new Date()], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, client_id, amount, interest_rate, frequency });
  });
});

app.post('/api/payments', (req, res) => {
  const { loan_id, amount } = req.body;
  db.run('INSERT INTO payments (loan_id, amount, payment_date) VALUES (?, ?, ?)', [loan_id, amount, new Date()], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, loan_id, amount });
  });
});

app.get('/api/dashboard', (req, res) => {
  db.all('SELECT amount FROM loans', (err, loans) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalLoaned = loans.reduce((sum, l) => sum + l.amount, 0);
    res.json({ totalLoaned, totalEarned: 0, monthlyProjection: 0, loanCount: loans.length });
  });
});

app.get('/api/delinquents', (req, res) => {
  db.all(`SELECT c.*, l.*, p.payment_date, l.frequency, CASE WHEN l.frequency = 'Semanal' THEN 7 WHEN l.frequency = 'Quincenal' THEN 15 WHEN l.frequency = 'Mensual' THEN 30 ELSE 30 END as paymentIntervalDays FROM clients c JOIN loans l ON c.id = l.client_id LEFT JOIN payments p ON l.id = p.loan_id WHERE l.status = 'active' ORDER BY p.payment_date DESC`, (err, rows) => {
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

app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

module.exports = app;
