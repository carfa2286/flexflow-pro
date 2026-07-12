const sqlite3 = require('sqlite3');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'loans.db'));

const clients = [
  { cedula: '8704649', nombre: 'SANCHEZ MOSQUERA JUSTINIANO JAVIER' },
  { cedula: '72198536', nombre: 'HERNANDEZ AHUMADA MANUEL' },
  { cedula: '72292910', nombre: 'BARRERA BILBAO FABER JOSE' },
  { cedula: '1143130102', nombre: 'CERVANTES HERNANDEZ RICHARD ALFONSO' },
  { cedula: '1140896215', nombre: 'PEREZ MONTIEL FAUSTO FABIAN' },
  { cedula: '1042425569', nombre: 'ARRIETA PAJARO JUAN CARLOS' },
  { cedula: '1042455837', nombre: 'BUELVAS OÑATE WILLIAM ERMITH' },
  { cedula: '1046817805', nombre: 'CHARRIS BOLIVAR ADRIAN JUNIOR' },
  { cedula: '8784213', nombre: 'DE LA HOZ ESCORCIA SANTIAGO' },
  { cedula: '1007175782', nombre: 'FERRER AYALA LUIS' },
  { cedula: '8800285', nombre: 'PERTUZ ROA JORGE LUIS' },
  { cedula: '72433452', nombre: 'RODRIGUEZ MORALES JAIMER' },
  { cedula: '72098251', nombre: 'ROMERO DORIA ROBERTO CARLOS' },
  { cedula: '1129513553', nombre: 'TORRES ACOSTA JAVIER' },
  { cedula: '72216583', nombre: 'CASTRO PACHECO LUIS MIGUEL' },
  { cedula: '1045721775', nombre: 'GIRALDO PAYARES ARLEY DANIEL' },
  { cedula: '1048323971', nombre: 'MARIN GRAVINI JOSE ALFREDO' },
  { cedula: '1143427081', nombre: 'ROSEMBERG CABRERA AARON SALIM' },
  { cedula: '72198658', nombre: 'VILLARREAL LUIS CARLOS' },
  { cedula: '1233489249', nombre: 'NOVA SUAREZ JUAN SEBASTIAN' },
  { cedula: '1193236094', nombre: 'GUTIERREZ ROSALES FERNANDO JOSE' },
  { cedula: '1143142324', nombre: 'MOLINARES BARRIOS JHAN CARLOS' },
  { cedula: '1079941112', nombre: 'PINZON DE LA HOZ LUIS ROBERTO' },
  { cedula: '8498947', nombre: 'MERCADO BROCHADO ARGEMIRO SEGUNDO' },
  { cedula: '72049550', nombre: 'BARRIOS CERVANTES ALDEMAR' },
  { cedula: '1004188605', nombre: 'DE LA HOZ MORALES JHAN CARLOS' },
  { cedula: '1042355734', nombre: 'GARCIA CABRERA IVAN' },
  { cedula: '1129506347', nombre: 'LIZCANO BARCASNEGRA DAYRO JUNIOR' },
  { cedula: '72021491', nombre: 'LLANOS CAMARGO CARLOS BLADIMIR' },
  { cedula: '1002237078', nombre: 'MIRANDA FONTALVO BRAYAN JOSE' },
  { cedula: '1042426555', nombre: 'ROCA GUTIERREZ YEISON ADOLFO' },
  { cedula: '1001851883', nombre: 'RUA PEREZ NEIDER YESID' },
  { cedula: '15610523', nombre: 'MONTES BERROCAL ORLANDO' },
  { cedula: '1001876924', nombre: 'ORTIZ DE ALBA YOANDRI JOSE' },
  { cedula: '8777917', nombre: 'CEPEDA GUTIERREZ MIGUEL' },
  { cedula: '1047221225', nombre: 'FERRER CAAMAÑO LUIS EDUARDO' },
  { cedula: '72431523', nombre: 'PAJARO GERALDINO ULISES JOSE' },
  { cedula: '8753790', nombre: 'TAPIA BLANCO TIRSO ENRIQUE' },
  { cedula: '8497254', nombre: 'TRUYOL FONTALVO NEICER' },
  { cedula: '72287876', nombre: 'URIBE GALVIS LUIS CARLOS' },
  { cedula: '1048264706', nombre: 'ACOSTA CANTILLO LUIS MIGUEL' },
  { cedula: '1129576124', nombre: 'GARCIA ESCOBAR FERNANDO ALBERTO' },
  { cedula: '1045167147', nombre: 'MARTINEZ RINCON JOHAN ALEXANDER' },
  { cedula: '72122371', nombre: 'ARTETA ALBA MEDARDO' },
  { cedula: '72051594', nombre: 'MARRUGO MARQUEZ JHON JAIRO' },
  { cedula: '72000847', nombre: 'BOLAÑO VARGAS ZAMIR ENRIQUE' },
  { cedula: '72201414', nombre: 'GARCIA JIMENEZ LUIS EDUARDO' },
  { cedula: '72183581', nombre: 'HURTADO VILLALBA TEDDYS' }
];

db.serialize(() => {
  // Crear tabla si no existe
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err && !err.message.includes('already exists')) {
      console.error('Error creando tabla:', err);
    }
  });

  let inserted = 0;
  let skipped = 0;

  clients.forEach((client, index) => {
    db.run(
      'INSERT OR IGNORE INTO clients (cedula, name) VALUES (?, ?)',
      [client.cedula, client.nombre],
      function(err) {
        if (err) {
          console.error(`❌ Error con ${client.nombre}:`, err.message);
        } else {
          inserted++;
          console.log(`✅ ${inserted}. ${client.nombre} (${client.cedula})`);
        }

        // Mensaje final cuando termina
        if (index === clients.length - 1) {
          setTimeout(() => {
            console.log(`\n✅ Importación completada!`);
            console.log(`   Total insertados: ${inserted} clientes`);
            db.close();
          }, 500);
        }
      }
    );
  });
});
