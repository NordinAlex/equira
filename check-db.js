const db = require('better-sqlite3')('data/equira.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

const columns = db.prepare("PRAGMA table_info(stable_tasks)").all();
console.log(columns);