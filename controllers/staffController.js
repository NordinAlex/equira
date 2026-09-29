const stableTaskService = require('../services/stableTaskService');
const db = require('better-sqlite3')('data/equira.sqlite');

// Hjälpfunktion för datum
function getDateString() {
  const now = new Date();
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}.`;
}

const staffController = {

  getTimeTracking: (req, res) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    res.render('Staff/time-tracking', {
      title: 'Stämpling',
      currentPage: 'time-tracking',
      layout: false,
      dateString: getDateString(),
      currentTime
    });
  },

  getOverview: (req, res) => {
    const allTasks = db.prepare(`
      SELECT stable_tasks.*, horses.name as horseName, horses.paddockNumber, horses.photoUrl
      FROM stable_tasks
      LEFT JOIN horses ON stable_tasks.horseId = horses.id
      WHERE date(stable_tasks.dueDate) = date('now')
      OR stable_tasks.dueDate IS NULL
    `).all();

    const todoCount = allTasks.filter(t => t.status !== 'Klar').length;
    const doneCount = allTasks.filter(t => t.status === 'Klar').length;

    const grouped = {};
    allTasks.forEach(task => {
      const key = task.taskType || 'Övrigt';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });

    res.render('Staff/overview', {
      title: 'Översikt',
      currentPage: 'overview-staff',
      layout: false,
      dateString: getDateString(),
      todoCount,
      doneCount,
      grouped
    });
  },

  getTasks: (req, res) => {
    stableTaskService.resetCompletedTasks();
    const tasks = stableTaskService.getAllTasks();
    res.render('Staff/tasks', {
      title: 'Uppgifter',
      currentPage: 'tasks',
      tasks,
      layout: false,
      dateString: getDateString()
    });
  },

  getTaskDetail: (req, res) => {
    res.redirect('/staff/tasks');
  },

  postCompleteTask: (req, res) => {
    stableTaskService.markTaskComplete(req.params.id);
    const referer = req.headers.referer || '/staff/tasks';
    res.redirect(referer);
  },

  postToggleChecklist: (req, res) => {
    res.redirect('/staff/tasks');
  },

  addTask: (req, res) => {
    stableTaskService.addTask(req.body);
    res.redirect('/staff/tasks');
  },

  deleteTask: (req, res) => {
    stableTaskService.deleteTask(req.params.id);
    res.redirect('/staff/tasks');
  },

  unmarkTask: (req, res) => {
    stableTaskService.unmarkTaskComplete(req.params.id);
    const referer = req.headers.referer || '/staff/tasks';
    res.redirect(referer);
  },

  getSchedule: (req, res) => {
    res.render('Staff/schedule', {
      title: 'Schema',
      currentPage: 'schedule',
      layout: false,
      dateString: getDateString()
    });
  },

  getHorses: (req, res) => {
    const horses = db.prepare("SELECT * FROM horses WHERE status = 'Aktiv & Tjänstbar'").all();
    const tasks = db.prepare("SELECT * FROM stable_tasks WHERE horseId IS NOT NULL").all();

    const horsesWithTasks = horses.map(horse => ({
      ...horse,
      tasks: tasks.filter(t => t.horseId === horse.id)
    }));

    res.render('Staff/horses', {
      title: 'Hästar',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horses: horsesWithTasks
    });
  },

  getHorseProfile: (req, res) => {
    const horse = db.prepare("SELECT * FROM horses WHERE id = ?").get(req.params.id);
    const tasks = db.prepare("SELECT * FROM stable_tasks WHERE horseId = ?").all(req.params.id);

    res.render('Staff/horseProfile', {
      title: horse?.name || 'Häst',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horse,
      tasks
    });
  },

  getProfile: (req, res) => {
    res.render('Staff/profile', {
      title: 'Min Profil',
      currentPage: 'profile',
      layout: false,
      dateString: getDateString()
    });
  }
};

module.exports = staffController;