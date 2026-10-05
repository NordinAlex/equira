const stableTaskService = require('../services/stableTaskService');
const db = require('better-sqlite3')('data/equira.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    checkInTime TEXT,
    checkOutTime TEXT,
    plannedStartTime TEXT DEFAULT '07:00',
    plannedEndTime TEXT DEFAULT '16:00',
    plannedHours REAL DEFAULT 8,
    breakMinutes INTEGER DEFAULT 0,
    durationMinutes INTEGER DEFAULT 0,
    overtimeMinutes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'EJ_INSTAMPLAD',
    updatedAt TEXT DEFAULT (datetime('now')),
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

function getDateString() {
  const now = new Date();
  const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
  const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}.`;
}

function getCurrentUser(req) {
  const userId = req.session?.user?.id;
  if (!userId) return null;
  return db.prepare(`
    SELECT id, username, email, fullName, phone, avatarUrl, role
    FROM users WHERE id = ?
  `).get(userId);
}

const staffController = {

  getTimeTracking: (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');
    const user = getCurrentUser(req);
    if (!user) return res.redirect('/login');

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

    const entry = db.prepare(`
      SELECT * FROM time_entries
      WHERE userId = ? AND date = ?
      ORDER BY id DESC LIMIT 1
    `).get(userId, date);

    let isClockedIn = false;
    let workedMinutes = 0;
    let checkInTime = null;
    let plannedStartTime = '07:00';
    let plannedEndTime = '16:00';

    if (entry) {
      plannedStartTime = entry.plannedStartTime || '07:00';
      plannedEndTime = entry.plannedEndTime || '16:00';

      if (entry.checkInTime && !entry.checkOutTime) {
        isClockedIn = true;
        checkInTime = entry.checkInTime;
        workedMinutes = Math.max(0, Math.floor((now - new Date(entry.checkInTime)) / 60000));
      } else if (entry.checkInTime && entry.checkOutTime) {
        workedMinutes = Number(entry.durationMinutes || 0);
      }
    }

    const workedHours = Math.floor(workedMinutes / 60);
    const remainingMinutes = workedMinutes % 60;
    const workedTime = `${workedHours}h ${String(remainingMinutes).padStart(2, '0')}m`;

    const [startHour, startMinute] = plannedStartTime.split(':').map(Number);
    const [endHour, endMinute] = plannedEndTime.split(':').map(Number);
    const shiftStart = startHour * 60 + startMinute;
    const shiftEnd = endHour * 60 + endMinute;
    const totalShiftMinutes = shiftEnd - shiftStart;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let progress = 0;
    if (totalShiftMinutes > 0) {
      progress = Math.min(100, Math.max(0, ((currentMinutes - shiftStart) / totalShiftMinutes) * 100));
    }

    res.render('Staff/time-tracking', {
      title: 'Stämpling',
      currentPage: 'time-tracking',
      layout: false,
      dateString: getDateString(),
      currentTime,
      isClockedIn,
      progress,
      workedTime,
      checkInTime,
      plannedStartTime,
      plannedEndTime,
      user
    });
  },

  clockIn: (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');

    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const timestamp = now.toISOString();

    const existingEntry = db.prepare(`
      SELECT * FROM time_entries
      WHERE userId = ? AND date = ?
      AND checkInTime IS NOT NULL AND checkOutTime IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(userId, date);

    if (existingEntry) return res.redirect('/staff/time-tracking');

    const todayEntry = db.prepare(`
      SELECT * FROM time_entries
      WHERE userId = ? AND date = ?
      ORDER BY id DESC LIMIT 1
    `).get(userId, date);

    if (todayEntry) {
      db.prepare(`
        UPDATE time_entries
        SET checkInTime = ?, checkOutTime = NULL,
            durationMinutes = 0, overtimeMinutes = 0,
            status = 'INSTAMPLAD', updatedAt = datetime('now')
        WHERE id = ?
      `).run(timestamp, todayEntry.id);
    } else {
      db.prepare(`
        INSERT INTO time_entries (userId, date, checkInTime, status)
        VALUES (?, ?, ?, 'INSTAMPLAD')
      `).run(userId, date, timestamp);
    }

    res.redirect('/staff/time-tracking');
  },

  clockOut: (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');

    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
    const timestamp = now.toISOString();

    const entry = db.prepare(`
      SELECT * FROM time_entries
      WHERE userId = ? AND date = ?
      AND checkInTime IS NOT NULL AND checkOutTime IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(userId, date);

    if (!entry) return res.redirect('/staff/time-tracking');

    const checkIn = new Date(entry.checkInTime);
    const elapsedMinutes = Math.max(0, Math.floor((now - checkIn) / 60000));
    const breakMinutes = Number(entry.breakMinutes || 0);
    const durationMinutes = Math.max(0, elapsedMinutes - breakMinutes);
    const plannedMinutes = Number(entry.plannedHours || 8) * 60;
    const overtimeMinutes = Math.max(0, durationMinutes - plannedMinutes);

    db.prepare(`
      UPDATE time_entries
      SET checkOutTime = ?, durationMinutes = ?,
          overtimeMinutes = ?, status = 'EJ_INSTAMPLAD',
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(timestamp, durationMinutes, overtimeMinutes, entry.id);

    res.redirect('/staff/time-tracking');
  },

  getOverview: (req, res) => {
    const user = getCurrentUser(req);
    if (!user) return res.redirect('/login');

    stableTaskService.resetCompletedTasks();

    const allTasks = db.prepare(`
      SELECT stable_tasks.*, horses.name as horseName, horses.paddockNumber, horses.photoUrl
      FROM stable_tasks
      LEFT JOIN horses ON stable_tasks.horseId = horses.id
    `).all();

    const todoCount = allTasks.filter(t => t.status !== 'Klar').length;
    const doneCount = allTasks.filter(t => t.status === 'Klar').length;

    const activeTasks = allTasks.filter(t => t.status !== 'Klar');

    const grouped = {};
    activeTasks.forEach(task => {
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
      grouped,
      user
    });
  },

  getTasks: (req, res) => {
    const user = getCurrentUser(req);
    if (!user) return res.redirect('/login');

    stableTaskService.resetCompletedTasks();
    const tasks = stableTaskService.getAllTasks();

    res.render('Staff/tasks', {
      title: 'Uppgifter',
      currentPage: 'tasks',
      tasks,
      layout: false,
      dateString: getDateString(),
      user
    });
  },

  getTaskDetail: (req, res) => {
    res.redirect('/staff/tasks');
  },

  postCompleteTask: (req, res) => {
    stableTaskService.markTaskComplete(req.params.id);
    const userId = req.session?.user?.id;
    if (userId) {
      db.prepare(`
        UPDATE stable_tasks
        SET completedByUserId = ?,
            completedAt = COALESCE(completedAt, datetime('now')),
            updatedAt = datetime('now')
        WHERE id = ? AND status = 'Klar'
      `).run(userId, req.params.id);
    }
    res.redirect(req.headers.referer || '/staff/tasks');
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
    db.prepare(`
      UPDATE stable_tasks
      SET completedByUserId = NULL, completedAt = NULL,
          updatedAt = datetime('now')
      WHERE id = ?
    `).run(req.params.id);
    res.redirect(req.headers.referer || '/staff/tasks');
  },

  getSchedule: (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');
    const user = getCurrentUser(req);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const entries = db.prepare(`
      SELECT * FROM time_entries
      WHERE userId = ?
      AND date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(userId, firstDay, lastDay);

    res.render('Staff/schedule', {
      title: 'Schema',
      currentPage: 'schedule',
      layout: false,
      dateString: getDateString(),
      user,
      entries,
      mondayStr: firstDay,
      sundayStr: lastDay
    });
  },

  getHorses: (req, res) => {
    const user = getCurrentUser(req);
    if (!user) return res.redirect('/login');

    const horses = db.prepare(`SELECT * FROM horses WHERE status = 'Aktiv & Tjänstbar'`).all();
    const tasks = db.prepare(`
      SELECT * FROM stable_tasks
      WHERE horseId IS NOT NULL AND status != 'Klar'
    `).all();

    const horsesWithTasks = horses.map(horse => ({
      ...horse,
      tasks: tasks.filter(task => Number(task.horseId) === Number(horse.id))
    }));

    res.render('Staff/horses', {
      title: 'Hästar',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horses: horsesWithTasks,
      user
    });
  },

  getHorseProfile: (req, res) => {
    const horse = db.prepare(`SELECT * FROM horses WHERE id = ?`).get(req.params.id);
    if (!horse) return res.redirect('/staff/horses');

    const tasks = db.prepare(`
      SELECT * FROM stable_tasks WHERE horseId = ?
      ORDER BY CASE WHEN status = 'Klar' THEN 1 ELSE 0 END, dueTime ASC
    `).all(req.params.id);

    res.render('Staff/horseProfile', {
      title: horse.name || 'Häst',
      currentPage: 'horses',
      layout: false,
      dateString: getDateString(),
      horse,
      tasks
    });
  },

  getProfile: (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');

    const user = db.prepare(`
      SELECT id, username, email, fullName, phone, avatarUrl, role
      FROM users WHERE id = ?
    `).get(userId);
    if (!user) return res.redirect('/login');

    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');

    const todayTasks = db.prepare(`
      SELECT * FROM stable_tasks WHERE dueDate = ? OR dueDate IS NULL
    `).all(today);

    const completedTasks = todayTasks.filter(t => t.status === 'Klar').length;
    const totalTasks = todayTasks.length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const recentActivities = db.prepare(`
      SELECT stable_tasks.*, horses.name AS horseName
      FROM stable_tasks
      LEFT JOIN horses ON horses.id = stable_tasks.horseId
      WHERE stable_tasks.status = 'Klar'
      ORDER BY stable_tasks.completedAt DESC
      LIMIT 5
    `).all();

    res.render('Staff/profile', {
      title: 'Min Profil',
      currentPage: 'profile',
      layout: false,
      dateString: getDateString(),
      user,
      completedTasks,
      totalTasks,
      completionPercentage,
      recentActivities
    });
  }
};

module.exports = staffController;