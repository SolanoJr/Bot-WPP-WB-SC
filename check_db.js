const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/bot_database.db');

db.all('SELECT * FROM feedbacks LIMIT 5', (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows));
  db.close();
});
