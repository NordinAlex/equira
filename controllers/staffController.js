const stableTaskService = require('../services/stableTaskService');

// Hjälpfunktion för datum
function getDateString() {
  const now = new Date();
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}.`;
}

const staffController = {
  getOverview: (req, res) => {
    res.render('staff/overview', {
      title: 'Översikt',
      currentPage: 'overview-staff',
      layout: false,
      dateString: getDateString()
    });
  },

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
    res.redirect('/staff/tasks');
  },

  getSchedule: (req, res) => {
    res.render('staff/schedule', {
      title: 'Schema',
      currentPage: 'schedule',
      layout: false,
      dateString: getDateString()
    });
  },

  getHorses: (req, res) => {
    res.render('staff/horses', {
      title: 'Hästar',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString()
    });
  },

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