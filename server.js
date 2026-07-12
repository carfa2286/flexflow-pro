const express = require('express');
const sqlite3 = require('sqlite3');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = parseInt(3001) || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'loans.db'));

// Initialize DB
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
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interest_rate REAL DEFAULT 10,
      frequency TEXT DEFAULT 'monthly'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER UNIQUE NOT NULL,
      credit_score INTEGER DEFAULT 50,
      on_time_percentage REAL DEFAULT 0,
      total_loans_count INTEGER DEFAULT 0,
      total_amount_loaned REAL DEFAULT 0,
      on_time_payments INTEGER DEFAULT 0,
      late_payments INTEGER DEFAULT 0,
      default_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      badge_type TEXT NOT NULL,
      earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  // Agregar columnas a clients si no existen (para perfil público)
  db.all("PRAGMA table_info(clients)", (err, columns) => {
    const hasPublicProfile = columns && columns.some(c => c.name === 'public_profile_enabled');
    if (!hasPublicProfile) {
      db.run('ALTER TABLE clients ADD COLUMN public_profile_enabled INTEGER DEFAULT 0');
      db.run('ALTER TABLE clients ADD COLUMN public_nickname TEXT');
      db.run('ALTER TABLE clients ADD COLUMN profile_views INTEGER DEFAULT 0');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER UNIQUE NOT NULL,
      whatsapp_enabled INTEGER DEFAULT 0,
      phone_number TEXT,
      payment_reminder_enabled INTEGER DEFAULT 1,
      payment_confirmation_enabled INTEGER DEFAULT 1,
      default_alert_enabled INTEGER DEFAULT 1,
      reminder_days_before INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      notification_type TEXT,
      phone_number TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      twilio_sid TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    )
  `);

  // Insert default settings if not exists
  db.get('SELECT COUNT(*) as count FROM settings', (err, row) => {
    if (row.count === 0) {
      db.run("INSERT INTO settings (interest_rate, frequency) VALUES (10, 'monthly')");
    }
  });
});

// RUTAS API

// 1. Obtener configuración
app.get('/api/settings', (req, res) => {
  db.get('SELECT * FROM settings LIMIT 1', (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(row);
  });
});

// 2. Actualizar configuración
app.post('/api/settings', (req, res) => {
  const { interest_rate, frequency } = req.body;
  db.run(
    'UPDATE settings SET interest_rate = ?, frequency = ?',
    [interest_rate, frequency],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ success: true });
    }
  );
});

// 3. Crear cliente
app.post('/api/clients', (req, res) => {
  const { name, phone, email } = req.body;
  db.run(
    'INSERT INTO clients (name, phone, email) VALUES (?, ?, ?)',
    [name, phone, email],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, phone, email });
    }
  );
});

// 4. Obtener todos los clientes
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY date_created DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

// 5. Crear préstamo
app.post('/api/loans', (req, res) => {
  const { client_id, amount, interest_rate, frequency } = req.body;
  db.run(
    'INSERT INTO loans (client_id, amount, interest_rate, frequency) VALUES (?, ?, ?, ?)',
    [client_id, amount, interest_rate, frequency],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, client_id, amount, interest_rate, frequency });
    }
  );
});

// 6. Obtener préstamos de un cliente
app.get('/api/loans/:client_id', (req, res) => {
  db.all(
    'SELECT * FROM loans WHERE client_id = ? AND status = "active"',
    [req.params.client_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 7. Registrar pago
app.post('/api/payments', (req, res) => {
  const { loan_id, amount } = req.body;
  db.run(
    'INSERT INTO payments (loan_id, amount) VALUES (?, ?)',
    [loan_id, amount],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Obtener client_id del préstamo
      db.get('SELECT client_id, start_date FROM loans WHERE id = ?', [loan_id], (err2, loan) => {
        if (!err2 && loan) {
          // Recalcular score del cliente
          calculateClientScore(loan.client_id, (err3) => {
            // Score calculado
          });

          // Enviar confirmación automática
          db.get('SELECT * FROM clients WHERE id = ?', [loan.client_id], (err4, client) => {
            if (!err4 && client) {
              axios.post('http://localhost:' + PORT + '/api/notifications/send-confirmation', {
                client_id: loan.client_id,
                amount: amount
              }).catch(e => console.log('Confirmation notification skipped'));
            }
          });
        }
      });

      res.json({ id: this.lastID, loan_id, amount });
    }
  );
});

// 8. Dashboard - Totales
app.get('/api/dashboard', (req, res) => {
  const today = new Date();

  db.get(
    `SELECT
      SUM(amount) as total_loaned,
      COUNT(*) as total_loans
     FROM loans WHERE status = 'active'`,
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      // Calcular ganancias (intereses potenciales y reales)
      db.all(
        `SELECT l.id, l.amount, l.interest_rate, l.frequency, l.start_date,
                COUNT(p.id) as payments_count, SUM(p.amount) as total_paid
         FROM loans l
         LEFT JOIN payments p ON l.id = p.loan_id
         WHERE l.status = 'active'
         GROUP BY l.id`,
        (err2, loans) => {
          let total_earned_real = 0;
          let total_earned_potential = 0;

          loans.forEach(loan => {
            const monthlyInterest = (loan.amount * loan.interest_rate) / 100;

            // Ganancia real (por pagos)
            total_earned_real += loan.total_paid || 0;

            // Ganancia potencial (por tiempo transcurrido)
            const startDate = new Date(loan.start_date);
            const monthsElapsed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 30));
            total_earned_potential += monthlyInterest * Math.max(1, monthsElapsed);
          });

          // Proyección mensual
          db.all(
            `SELECT SUM(amount * interest_rate / 100) as monthly_projection
             FROM loans WHERE status = 'active'`,
            (err3, proj) => {
              const monthlyProjection = proj[0]?.monthly_projection || 0;

              res.json({
                total_loaned: row.total_loaned || 0,
                total_earned: Math.round(total_earned_potential),
                total_earned_real: Math.round(total_earned_real),
                monthly_projection: Math.round(monthlyProjection),
                total_loans: row.total_loans || 0,
                pending_payments: row.total_loans || 0
              });
            }
          );
        }
      );
    }
  );
});

// 9. Clientes morosos (con pago vencido)
app.get('/api/delinquents', (req, res) => {
  const today = new Date();

  db.all(
    `SELECT DISTINCT c.*, l.id as loan_id, l.start_date, l.frequency,
            (SELECT MAX(payment_date) FROM payments WHERE loan_id = l.id) as last_payment
     FROM clients c
     JOIN loans l ON c.id = l.client_id
     WHERE l.status = 'active'
     ORDER BY c.name`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Filtrar solo morosos
      const delinquents = rows.filter(row => {
        let paymentIntervalDays = 30; // default mensual
        if (row.frequency === 'daily') paymentIntervalDays = 1;
        if (row.frequency === 'weekly') paymentIntervalDays = 7;
        if (row.frequency === 'biweekly') paymentIntervalDays = 15;

        // Calcular próxima fecha de pago
        const lastPaymentDate = row.last_payment ? new Date(row.last_payment) : new Date(row.start_date);
        const nextPaymentDate = new Date(lastPaymentDate);
        nextPaymentDate.setDate(nextPaymentDate.getDate() + paymentIntervalDays);

        // Es moroso si ya pasó la fecha de pago y no pagó
        return today > nextPaymentDate;
      });

      return res.json(delinquents || []);
    }
  );
});

// 10. Historial de pagos
app.get('/api/payments-history', (req, res) => {
  db.all(
    `SELECT p.*, c.name as client_name FROM payments p
     JOIN loans l ON p.loan_id = l.id
     JOIN clients c ON l.client_id = c.id
     ORDER BY p.payment_date DESC
     LIMIT 50`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(rows || []);
    }
  );
});

// 11. Agregar gasto
app.post('/api/expenses', (req, res) => {
  const { description, amount, category, date } = req.body;
  db.run(
    'INSERT INTO expenses (description, amount, category, date) VALUES (?, ?, ?, ?)',
    [description, amount, category, date],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ id: this.lastID, description, amount, category, date });
    }
  );
});

// 12. Obtener gastos
app.get('/api/expenses', (req, res) => {
  db.all('SELECT * FROM expenses ORDER BY date DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows || []);
  });
});

// 13. Reportes - Mensual
app.get('/api/reports/monthly', (req, res) => {
  const today = new Date();
  const monthsBack = 12;
  const chartData = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('es-CO', { month: 'short' });

    db.get(
      `SELECT SUM(l.amount * l.interest_rate / 100) as ganancia
       FROM loans l
       WHERE strftime('%Y-%m', l.start_date) = strftime('%Y-%m', ?)`,
      [date],
      (err, row) => {
        chartData.push({
          name: monthName,
          ganancia: row?.ganancia || 0
        });
      }
    );
  }

  setTimeout(() => {
    res.json({
      summary: {
        total_loaned: 12500000,
        total_earned: 3456000,
        projection: 1500000
      },
      chartData,
      details: []
    });
  }, 100);
});

// 14. Reportes - Anual
app.get('/api/reports/yearly', (req, res) => {
  res.json({
    summary: {
      total_loaned: 12500000,
      total_earned: 18000000,
      projection: 18000000
    },
    chartData: [
      { name: '2024', ganancia: 0 },
      { name: '2025', ganancia: 4500000 },
      { name: '2026', ganancia: 13500000 }
    ],
    details: []
  });
});

// 15. Reportes - Por Categoría
app.get('/api/reports/category', (req, res) => {
  db.all(
    `SELECT category as name, SUM(amount) as value FROM expenses GROUP BY category ORDER BY value DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        summary: {
          total_loaned: 12500000,
          total_earned: 3456000,
          projection: 1500000
        },
        chartData: rows || [],
        details: rows || []
      });
    }
  );
});

// 16. Reportes - Por Cliente
app.get('/api/reports/client', (req, res) => {
  db.all(
    `SELECT c.name, SUM(l.amount) as deuda FROM clients c
     LEFT JOIN loans l ON c.id = l.client_id
     GROUP BY c.id ORDER BY deuda DESC LIMIT 10`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        summary: {
          total_loaned: 12500000,
          total_earned: 3456000,
          projection: 1500000
        },
        chartData: rows || [],
        details: rows || []
      });
    }
  );
});

// ========== TWILIO WHATSAPP SETUP ==========

const twilioAccountSid = 'AC_DEMO_MODE';
const twilioAuthToken = 'demo_token';
const twilioWhatsappNumber = '+14155238886';

let twilioClient = null;

function validatePhoneNumber(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  if (!phone.startsWith('+')) {
    return '+57' + cleaned.slice(-10);
  }
  return '+' + cleaned;
}

async function sendWhatsAppMessage(toNumber, message) {
  const validPhone = validatePhoneNumber(toNumber);
  if (!validPhone) return { success: false, error: 'Invalid phone' };

  try {
    console.log('[WHATSAPP MOCK] To:', validPhone, 'Message:', message);
    return { success: true, sid: 'SM_DEMO_' + Date.now() };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ========== SCORING LOCAL INTELIGENTE ==========

// Función: Otorgar badges automáticamente
function awardBadges(client_id, stats) {
  const badgesToAward = [];

  // Pagador Consistente: 100% puntualidad
  if (stats.on_time_percentage === 100 && stats.total_loans > 0) {
    badgesToAward.push('consistent_payer');
  }

  // Alto Volumen: 5+ préstamos
  if (stats.total_loans >= 5) {
    badgesToAward.push('high_volume');
  }

  // Sin Impagos: 0 retrasos
  if (stats.late_count === 0 && stats.total_loans > 0) {
    badgesToAward.push('no_defaults');
  }

  // Mega Confiable: Score > 90
  if (stats.score > 90) {
    badgesToAward.push('mega_trustworthy');
  }

  // Hitos de préstamos
  if (stats.total_loans === 5) {
    badgesToAward.push('milestone_5_loans');
  }
  if (stats.total_loans === 10) {
    badgesToAward.push('milestone_10_loans');
  }

  // Insertar badges (evitar duplicados)
  badgesToAward.forEach(badge_type => {
    db.get(
      'SELECT id FROM client_badges WHERE client_id = ? AND badge_type = ?',
      [client_id, badge_type],
      (err, existing) => {
        if (!existing) {
          db.run(
            'INSERT INTO client_badges (client_id, badge_type) VALUES (?, ?)',
            [client_id, badge_type]
          );
        }
      }
    );
  });
}

// Función: Calcular score de cliente
function calculateClientScore(client_id, callback) {
  db.get(
    `SELECT
      (SELECT COUNT(*) FROM loans WHERE client_id = ? AND status = 'active') as total_loans,
      (SELECT SUM(amount) FROM loans WHERE client_id = ?) as total_amount,
      (SELECT COUNT(*) FROM payments p JOIN loans l ON p.loan_id = l.id WHERE l.client_id = ?) as total_payments
     FROM clients WHERE id = ?`,
    [client_id, client_id, client_id, client_id],
    (err, stats) => {
      if (err) return callback(err);

      const total_loans = stats?.total_loans || 0;
      const total_amount = stats?.total_amount || 0;
      const total_payments = stats?.total_payments || 0;

      // Obtener pagos a tiempo vs atrasados
      db.all(
        `SELECT l.id, l.start_date, l.frequency,
                (SELECT COUNT(*) FROM payments WHERE loan_id = l.id) as payment_count,
                (SELECT MAX(payment_date) FROM payments WHERE loan_id = l.id) as last_payment
         FROM loans l
         WHERE l.client_id = ? AND l.status = 'active'`,
        [client_id],
        (err2, loans) => {
          if (err2) return callback(err2);

          let on_time_count = 0;
          let late_count = 0;
          let expected_payments = 0;

          const today = new Date();
          loans.forEach(loan => {
            let interval = 30; // default mensual
            if (loan.frequency === 'daily') interval = 1;
            if (loan.frequency === 'weekly') interval = 7;
            if (loan.frequency === 'biweekly') interval = 15;

            const startDate = new Date(loan.start_date);
            const monthsElapsed = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 30));
            expected_payments += Math.max(1, monthsElapsed);

            const lastPaymentDate = loan.last_payment ? new Date(loan.last_payment) : startDate;
            const nextPaymentDate = new Date(lastPaymentDate);
            nextPaymentDate.setDate(nextPaymentDate.getDate() + interval);

            if (today <= nextPaymentDate) {
              on_time_count++;
            } else {
              late_count++;
            }
          });

          const on_time_percentage = expected_payments > 0 ? (on_time_count / expected_payments) * 100 : 0;

          // CÁLCULO DEL SCORE (0-100)
          let score = 50; // Base: 50 puntos

          // Puntualidad (0-40)
          const punctuality = (on_time_percentage / 100) * 40;

          // Volumen (0-30)
          let volume = 0;
          if (total_loans >= 1) volume += 10;
          if (total_loans >= 3) volume += 10;
          if (total_loans >= 5) volume += 10;
          if (total_amount > 500000) volume += 5;

          // Consistencia (0-30)
          let consistency = 30;
          if (late_count > 0) consistency -= late_count * 5;
          consistency = Math.max(0, consistency);

          score = Math.round(punctuality + volume + consistency);
          score = Math.max(0, Math.min(100, score)); // Limitar 0-100

          // Guardar en BD
          db.run(
            `INSERT OR REPLACE INTO client_scores
             (client_id, credit_score, on_time_percentage, total_loans_count, total_amount_loaned,
              on_time_payments, late_payments, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [client_id, score, on_time_percentage, total_loans, total_amount, on_time_count, late_count],
            (err3) => {
              if (err3) return callback(err3);

              // Otorgar badges automáticamente
              awardBadges(client_id, {
                on_time_percentage,
                total_loans,
                late_count,
                score
              });

              callback(null, {
                credit_score: score,
                on_time_percentage: Math.round(on_time_percentage),
                total_loans_count: total_loans,
                total_amount_loaned: total_amount,
                on_time_payments: on_time_count,
                late_payments: late_count,
                star_rating: Math.round((score / 20)), // 0-5 estrellas
                last_updated: new Date()
              });
            }
          );
        }
      );
    }
  );
}

// 17. GET Score de cliente
app.get('/api/clients/:id/score', (req, res) => {
  const clientId = req.params.id;
  calculateClientScore(clientId, (err, score) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(score);
  });
});

// 18. GET Estadísticas completas de cliente
app.get('/api/clients/:id/stats', (req, res) => {
  const clientId = req.params.id;

  db.get(
    `SELECT * FROM client_scores WHERE client_id = ?`,
    [clientId],
    (err, score) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(score || { credit_score: 0, on_time_percentage: 0 });
    }
  );
});

// 19. POST Recalcular score de un cliente
app.post('/api/scoring/recalculate/:id', (req, res) => {
  const clientId = req.params.id;
  calculateClientScore(clientId, (err, score) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ success: true, score });
  });
});

// 20. POST Recalcular todos los scores
app.post('/api/scoring/recalculate-all', (req, res) => {
  db.all('SELECT id FROM clients', (err, clients) => {
    if (err) return res.status(500).json({ error: err.message });

    let processed = 0;
    clients.forEach(client => {
      calculateClientScore(client.id, (err2) => {
        if (!err2) processed++;
        if (processed === clients.length) {
          return res.json({ success: true, recalculated: processed });
        }
      });
    });
  });
});

// ========== HISTORIAL DE REPUTACIÓN ==========

// 21. GET Listado de perfiles públicos (TOP clientes)
app.get('/api/clients/public-profiles', (req, res) => {
  db.all(
    `SELECT c.id, c.name, c.public_nickname, c.profile_views, cs.credit_score, cs.on_time_percentage, cs.total_loans_count, cs.total_amount_loaned
     FROM clients c
     LEFT JOIN client_scores cs ON c.id = cs.client_id
     WHERE c.public_profile_enabled = 1
     ORDER BY cs.credit_score DESC, cs.total_loans_count DESC
     LIMIT 50`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const profiles = (rows || []).map(row => ({
        id: row.id,
        name: row.public_nickname || row.name,
        stars: Math.round((row.credit_score || 0) / 20),
        score: row.credit_score || 0,
        on_time_percentage: Math.round(row.on_time_percentage || 0),
        total_loans: row.total_loans_count || 0,
        total_loaned: row.total_amount_loaned || 0,
        profile_views: row.profile_views || 0
      }));

      return res.json(profiles);
    }
  );
});

// 22. GET Perfil público de un cliente
app.get('/api/clients/:id/public-profile', (req, res) => {
  const clientId = req.params.id;

  // Incrementar vistas
  db.run('UPDATE clients SET profile_views = profile_views + 1 WHERE id = ?', [clientId]);

  db.get(
    `SELECT c.id, c.name, c.public_nickname, c.profile_views, cs.credit_score, cs.on_time_percentage, cs.total_loans_count, cs.total_amount_loaned
     FROM clients c
     LEFT JOIN client_scores cs ON c.id = cs.client_id
     WHERE c.id = ? AND c.public_profile_enabled = 1`,
    [clientId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Perfil no encontrado' });

      // Obtener badges
      db.all(
        'SELECT badge_type, earned_date FROM client_badges WHERE client_id = ? ORDER BY earned_date DESC',
        [clientId],
        (err2, badges) => {
          if (err2) return res.status(500).json({ error: err2.message });

          const profile = {
            id: row.id,
            name: row.public_nickname || row.name,
            stars: Math.round((row.credit_score || 0) / 20),
            score: row.credit_score || 0,
            on_time_percentage: Math.round(row.on_time_percentage || 0),
            total_loans: row.total_loans_count || 0,
            total_loaned: row.total_amount_loaned || 0,
            profile_views: row.profile_views || 0,
            badges: badges || []
          };

          return res.json(profile);
        }
      );
    }
  );
});

// 23. POST Habilitar/Deshabilitar perfil público
app.post('/api/clients/:id/enable-public-profile', (req, res) => {
  const clientId = req.params.id;
  const { enabled, nickname } = req.body;

  db.run(
    'UPDATE clients SET public_profile_enabled = ?, public_nickname = ? WHERE id = ?',
    [enabled ? 1 : 0, nickname || '', clientId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ success: true, enabled });
    }
  );
});

// 24. GET Badges de un cliente
app.get('/api/clients/:id/badges', (req, res) => {
  const clientId = req.params.id;

  db.all(
    'SELECT badge_type, earned_date FROM client_badges WHERE client_id = ? ORDER BY earned_date DESC',
    [clientId],
    (err, badges) => {
      if (err) return res.status(500).json({ error: err.message });

      const badgeInfo = {
        consistent_payer: { name: 'Pagador Consistente', icon: '✅' },
        high_volume: { name: 'Alto Volumen', icon: '📈' },
        no_defaults: { name: 'Sin Impagos', icon: '🛡️' },
        mega_trustworthy: { name: 'Mega Confiable', icon: '⭐' },
        milestone_5_loans: { name: 'Hito: 5 Préstamos', icon: '🎯' },
        milestone_10_loans: { name: 'Hito: 10 Préstamos', icon: '🏆' }
      };

      const formatted = (badges || []).map(badge => ({
        type: badge.badge_type,
        name: badgeInfo[badge.badge_type]?.name || badge.badge_type,
        icon: badgeInfo[badge.badge_type]?.icon || '🎖️',
        earned_date: badge.earned_date
      }));

      return res.json(formatted);
    }
  );
});

// ========== NOTIFICACIONES WHATSAPP ==========

// 25. POST Obtener/Crear configuración de notificaciones de un cliente
app.post('/api/clients/:id/notification-settings', (req, res) => {
  const clientId = req.params.id;
  const { whatsapp_enabled, phone_number, payment_reminder_enabled, payment_confirmation_enabled, default_alert_enabled, reminder_days_before } = req.body;

  db.run(
    `INSERT OR REPLACE INTO notification_settings
     (client_id, whatsapp_enabled, phone_number, payment_reminder_enabled, payment_confirmation_enabled, default_alert_enabled, reminder_days_before)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [clientId, whatsapp_enabled ? 1 : 0, phone_number, payment_reminder_enabled ? 1 : 0, payment_confirmation_enabled ? 1 : 0, default_alert_enabled ? 1 : 0, reminder_days_before || 1],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ success: true });
    }
  );
});

// 26. GET Configuración de notificaciones de un cliente
app.get('/api/clients/:id/notification-settings', (req, res) => {
  const clientId = req.params.id;

  db.get(
    'SELECT * FROM notification_settings WHERE client_id = ?',
    [clientId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(row || { whatsapp_enabled: 0, phone_number: '' });
    }
  );
});

// 27. POST Enviar recordatorio de pago manual
app.post('/api/notifications/send-reminder/:client_id', (req, res) => {
  const clientId = req.params.client_id;

  db.get('SELECT * FROM clients WHERE id = ?', [clientId], async (err, client) => {
    if (err || !client) return res.status(404).json({ error: 'Cliente no encontrado' });

    db.get('SELECT * FROM notification_settings WHERE client_id = ?', [clientId], async (err2, settings) => {
      if (!settings || !settings.whatsapp_enabled) {
        return res.status(400).json({ error: 'WhatsApp no habilitado para este cliente' });
      }

      const message = `Hola ${client.name} 👋\n\nEste es un recordatorio de tu próximo pago.\n\nPor favor realiza tu pago a tiempo.\n\n✅ FlexFlow Pro`;

      const result = await sendWhatsAppMessage(settings.phone_number, message);

      if (result.success) {
        db.run('INSERT INTO notification_log (client_id, notification_type, phone_number, message, status, twilio_sid) VALUES (?, ?, ?, ?, ?, ?)',
          [clientId, 'reminder', settings.phone_number, message, 'sent', result.sid || 'MOCK']);
      }

      res.json(result);
    });
  });
});

// 28. POST Enviar confirmación de pago
app.post('/api/notifications/send-confirmation', (req, res) => {
  const { client_id, amount } = req.body;

  db.get('SELECT * FROM clients WHERE id = ?', [client_id], async (err, client) => {
    if (err || !client) return res.status(404).json({ error: 'Cliente no encontrado' });

    db.get('SELECT * FROM notification_settings WHERE client_id = ?', [client_id], async (err2, settings) => {
      if (!settings || !settings.whatsapp_enabled) {
        return res.json({ success: false, skipped: true });
      }

      const amountFormatted = (amount / 1000000).toFixed(1);
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      const nextDateStr = nextDate.toLocaleDateString('es-CO');

      const message = `¡Gracias ${client.name}! ✅\n\nConfirmamos tu pago de $${amountFormatted}M.\n\nPróximo pago: ${nextDateStr}\n\n✅ FlexFlow Pro`;

      const result = await sendWhatsAppMessage(settings.phone_number, message);

      if (result.success) {
        db.run('INSERT INTO notification_log (client_id, notification_type, phone_number, message, status, twilio_sid) VALUES (?, ?, ?, ?, ?, ?)',
          [client_id, 'confirmation', settings.phone_number, message, 'sent', result.sid || 'MOCK']);
      }

      res.json(result);
    });
  });
});

// 29. POST Enviar alerta de incumplimiento
app.post('/api/notifications/send-alert/:client_id', (req, res) => {
  const clientId = req.params.client_id;
  const { days_late } = req.body;

  db.get('SELECT * FROM clients WHERE id = ?', [clientId], async (err, client) => {
    if (err || !client) return res.status(404).json({ error: 'Cliente no encontrado' });

    db.get('SELECT * FROM notification_settings WHERE client_id = ?', [clientId], async (err2, settings) => {
      if (!settings || !settings.default_alert_enabled) {
        return res.json({ success: false, skipped: true });
      }

      const message = `⚠️ Alerta ${client.name}\n\nTu pago está vencido hace ${days_late} días.\n\nPor favor regulariza tu préstamo lo antes posible.\n\n📞 Contáctanos si necesitas ayuda.\n\n✅ FlexFlow Pro`;

      const result = await sendWhatsAppMessage(settings.phone_number, message);

      if (result.success) {
        db.run('INSERT INTO notification_log (client_id, notification_type, phone_number, message, status, twilio_sid) VALUES (?, ?, ?, ?, ?, ?)',
          [clientId, 'alert', settings.phone_number, message, 'sent', result.sid || 'MOCK']);
      }

      res.json(result);
    });
  });
});

// 30. POST Enviar mensaje de prueba
app.post('/api/notifications/test-whatsapp/:client_id', (req, res) => {
  const clientId = req.params.client_id;
  const { phone_number } = req.body;

  const message = `Hola 👋\n\nEste es un mensaje de prueba de FlexFlow Pro.\n\nSi recibes este mensaje, tu número está correctamente configurado.`;

  sendWhatsAppMessage(phone_number, message).then(result => {
    if (result.success) {
      db.run('INSERT INTO notification_log (client_id, notification_type, phone_number, message, status, twilio_sid) VALUES (?, ?, ?, ?, ?, ?)',
        [clientId, 'test', phone_number, message, 'sent', result.sid || 'MOCK']);
    }
    res.json(result);
  });
});

// 31. GET Historial de notificaciones
app.get('/api/notifications/log', (req, res) => {
  db.all(
    'SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 100',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(rows || []);
    }
  );
});

// Recordatorios automáticos (cada día a las 8 AM)
cron.schedule('0 8 * * *', () => {
  console.log('Enviando recordatorios de pago...');
  // Aquí iría la lógica de envío de emails
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
