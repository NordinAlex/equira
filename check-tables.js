const db = require('better-sqlite3')('data/equira.sqlite');
const entries = db.prepare("SELECT * FROM time_entries LIMIT 5").all();
console.log(entries);