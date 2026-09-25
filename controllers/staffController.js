const stableTaskService = require('../services/stableTaskService');
const db = require('better-sqlite3')('data/equira.sqlite');

// Hjälpfunktion för datum
function getDateString() {
  const now = new Date();

  const days = [
    'Söndag',
    'Måndag',
    'Tisdag',
    'Onsdag',
    'Torsdag',
    'Fredag',
    'Lördag'
  ];

  const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'maj',
    'jun',
    'jul',
    'aug',
    'sep',
    'okt',
    'nov',
    'dec'
  ];

  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}.`;
}


const staffController = {

  // ============================================================
  // STAFF - ÖVERSIKT
  // ============================================================

  getOverview: (req, res) => {
    const allTasks = db.prepare(`
      SELECT
        stable_tasks.*,
        horses.name as horseName,
        horses.paddockNumber,
        horses.photoUrl
      FROM stable_tasks
      LEFT JOIN horses
        ON stable_tasks.horseId = horses.id
      WHERE date(stable_tasks.dueDate) = date('now')
         OR stable_tasks.dueDate IS NULL
    `).all();

    const todoCount = allTasks.filter(
      task => task.status !== 'Klar'
    ).length;

    const doneCount = allTasks.filter(
      task => task.status === 'Klar'
    ).length;


    // Gruppera uppgifter efter taskType
    const grouped = {};

    allTasks.forEach(task => {
      const key = task.taskType || 'Övrigt';

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(task);
    });


    res.render('staff/overview', {
      title: 'Översikt',
      currentPage: 'overview-staff',
      layout: false,
      dateString: getDateString(),
      todoCount,
      doneCount,
      grouped
    });
  },


  // ============================================================
  // STAFF - UPPGIFTER
  // ============================================================

  getTasks: (req, res) => {
    stableTaskService.resetCompletedTasks();

    const tasks = stableTaskService.getAllTasks();

    res.render('staff/tasks', {
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

    res.redirect('/staff/tasks');
  },


  postToggleChecklist: (req, res) => {
    res.redirect('/staff/tasks');
  },


  deleteTask: (req, res) => {
    stableTaskService.deleteTask(req.params.id);

    res.redirect('/staff/tasks');
  },


  unmarkTask: (req, res) => {
    stableTaskService.unmarkTaskComplete(req.params.id);

    res.redirect('/staff/tasks');
  },


  // ============================================================
  // STAFF - HÄSTAR
  // ============================================================

  getHorses: (req, res) => {

    const horses = db.prepare(`
      SELECT *
      FROM horses
      WHERE status = 'Aktiv & Tjänstbar'
      ORDER BY name ASC
    `).all();


    const tasks = db.prepare(`
      SELECT *
      FROM stable_tasks
      WHERE horseId IS NOT NULL
    `).all();


    const horsesWithTasks = horses.map(horse => ({
      ...horse,

      tasks: tasks.filter(
        task => Number(task.horseId) === Number(horse.id)
      )
    }));


    res.render('staff/horses', {
      title: 'Hästar',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horses: horsesWithTasks
    });
  },


  // ============================================================
  // STAFF - DETALJERAD HÄSTPROFIL
  // ============================================================

  getHorseProfile: (req, res) => {

    const horseId = Number(req.params.id);

    if (!Number.isInteger(horseId)) {
      return res.redirect('/staff/horses');
    }


    // Hämta hästen
    const horse = db.prepare(`
      SELECT *
      FROM horses
      WHERE id = ?
    `).get(horseId);


    if (!horse) {
      return res.redirect('/staff/horses');
    }


    // Hämta alla åtgärder för hästen
    const tasks = db.prepare(`
      SELECT *
      FROM stable_tasks
      WHERE horseId = ?
      ORDER BY
        CASE
          WHEN status = 'Klar' THEN 1
          ELSE 0
        END,
        dueTime ASC
    `).all(horseId);


    res.render('staff/horseProfile', {
      title: horse.name,
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horse,
      tasks
    });
  },


  // ============================================================
  // STAFF - PROFIL
  // ============================================================

  getProfile: (req, res) => {
    res.render('staff/profile', {
      title: 'Min Profil',
      currentPage: 'profile',
      layout: false,
      dateString: getDateString()
    });
  }

};


module.exports = staffController;