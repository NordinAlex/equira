const db = require('better-sqlite3')('data/equira.sqlite');

function getAllTasks() {
  return db.prepare("SELECT * FROM stable_tasks ORDER BY dueTime ASC").all();
}

function markTaskComplete(id) {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .replace('T', ' ')
    .substring(0, 19);
    
  return db.prepare(`
    UPDATE stable_tasks 
    SET status = 'Klar', completedAt = ?
    WHERE id = ?
  `).run(localTime, id);
}

function unmarkTaskComplete(id) {
  return db.prepare(`
    UPDATE stable_tasks 
    SET status = 'Kommande', completedAt = NULL 
    WHERE id = ?
  `).run(id);
}

function addTask(task) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    INSERT INTO stable_tasks (title, taskType, location, dueDate, dueTime, priority, status, instructions)
    VALUES (?, ?, ?, ?, ?, ?, 'Kommande', ?)
  `).run(task.title, task.taskType, task.location, today, task.dueTime, task.priority, task.instructions);
}

function deleteTask(id) {
  return db.prepare("DELETE FROM stable_tasks WHERE id = ?").run(id);
}

function resetCompletedTasks() {
  return db.prepare(`
    UPDATE stable_tasks 
    SET status = 'Kommande', completedAt = NULL 
    WHERE status = 'Klar' AND date(completedAt) < date('now')
  `).run();
}

module.exports = { getAllTasks, markTaskComplete, unmarkTaskComplete, addTask, deleteTask, resetCompletedTasks };