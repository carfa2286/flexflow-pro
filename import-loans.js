const sqlite3 = require('sqlite3');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'loans.db'));

// Configuración
const INTEREST_RATE = 12;
const AMOUNT_SMALL = 200000;
const AMOUNT_LARGE = 300000;
const TODAY = new Date('2026-07-10');
const TWO_MONTHS_AGO = new Date('2026-05-10');
const THREE_MONTHS_AGO = new Date('2026-04-10');

// Obtener clientes
db.all('SELECT id FROM clients ORDER BY id', (err, clients) => {
  if (err) {
    console.error('Error obteniendo clientes:', err);
    process.exit(1);
  }

  console.log(`\n📊 Creando préstamos para ${clients.length} clientes...\n`);

  let inserted = 0;
  let total_19 = 0;
  let total_rest = 0;

  clients.forEach((client, idx) => {
    let amount, start_date;
    let dateLabel = '';

    if (idx < 19) {
      // Primeros 19: $200,000
      amount = AMOUNT_SMALL;
      start_date = THREE_MONTHS_AGO.toISOString().split('T')[0]; // 2026-04-10
      dateLabel = '(hace 3 meses)';
      total_19 += amount;
    } else {
      // Rest: $300,000
      amount = AMOUNT_LARGE;
      start_date = TWO_MONTHS_AGO.toISOString().split('T')[0]; // 2026-05-10
      dateLabel = '(hace 2 meses)';
      total_rest += amount;
    }

    db.run(
      `INSERT INTO loans (client_id, amount, interest_rate, frequency, start_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [client.id, amount, INTEREST_RATE, 'monthly', start_date, 'active'],
      function(err) {
        if (err) {
          console.error(`❌ Error con cliente ${client.id}:`, err.message);
        } else {
          const number = idx + 1;
          console.log(`✅ ${number}. Cliente ID ${client.id} - $${amount.toLocaleString()} ${dateLabel}`);
          inserted++;
        }

        // Mensaje final
        if (idx === clients.length - 1) {
          setTimeout(() => {
            console.log(`\n✅ Préstamos creados exitosamente!\n`);
            console.log(`📈 Resumen:`);
            console.log(`   - Primeros 19 clientes: $${(total_19).toLocaleString()} (total)`);
            console.log(`   - Resto 29 clientes: $${(total_rest).toLocaleString()} (total)`);
            console.log(`   - TOTAL PRESTADO: $${(total_19 + total_rest).toLocaleString()}`);
            console.log(`   - Interés: 12% mensual`);
            console.log(`   - Frecuencia: Mensual\n`);

            // Calcular ganancias estimadas
            const gain_19 = (total_19 * 0.12) / 100;
            const gain_rest = (total_rest * 0.12) / 100;
            console.log(`💰 Ganancias mensuales estimadas:`);
            console.log(`   - Primeros 19: $${(gain_19).toLocaleString()}`);
            console.log(`   - Resto: $${(gain_rest).toLocaleString()}`);
            console.log(`   - TOTAL/MES: $${(gain_19 + gain_rest).toLocaleString()}\n`);

            db.close();
          }, 500);
        }
      }
    );
  });
});
