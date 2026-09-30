const stableTaskService = require('../services/stableTaskService');
const db = require('better-sqlite3')('data/equira.sqlite');


// =========================
// HJÄLPFUNKTION FÖR DATUM
// =========================

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


// =========================
// STAFF CONTROLLER
// =========================

const staffController = {

  // =========================
  // STÄMPLING
  // =========================

  getTimeTracking: (req, res) => {

    const userId = req.session?.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    const now = new Date();

    // Aktuell tid
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    // Dagens datum
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');


    // =========================
    // HÄMTA DAGENS STÄMPLING
    // =========================

    const entry = db.prepare(`
      SELECT *
      FROM time_entries
      WHERE userId = ?
        AND date = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(userId, date);


    let isClockedIn = false;
    let workedMinutes = 0;
    let checkInTime = null;
    let plannedStartTime = '07:00';
    let plannedEndTime = '16:00';


    if (entry) {

      plannedStartTime =
        entry.plannedStartTime || '07:00';

      plannedEndTime =
        entry.plannedEndTime || '16:00';


      // =========================
      // INSTÄMPLAD
      // =========================

      if (
        entry.checkInTime &&
        !entry.checkOutTime
      ) {

        isClockedIn = true;
        checkInTime = entry.checkInTime;

        const checkIn =
          new Date(entry.checkInTime);

        const elapsedMinutes =
          Math.max(
            0,
            Math.floor(
              (now - checkIn) / 60000
            )
          );

        // Visa faktisk tid sedan instämpling.
        // Den schemalagda rasten dras inte av här.
        workedMinutes =
          elapsedMinutes;
      }


      // =========================
      // UTSTÄMPLAD
      // =========================

      else if (
        entry.checkInTime &&
        entry.checkOutTime
      ) {

        workedMinutes =
          Number(entry.durationMinutes || 0);
      }
    }


    // =========================
    // ARBETAD TID
    // =========================

    const workedHours =
      Math.floor(workedMinutes / 60);

    const remainingMinutes =
      workedMinutes % 60;

    const workedTime =
      `${workedHours}h ${String(
        remainingMinutes
      ).padStart(2, '0')}m`;


    // =========================
    // PROGRESS
    // =========================

    const [startHour, startMinute] =
      plannedStartTime.split(':').map(Number);

    const [endHour, endMinute] =
      plannedEndTime.split(':').map(Number);

    const shiftStart =
      startHour * 60 + startMinute;

    const shiftEnd =
      endHour * 60 + endMinute;

    const totalShiftMinutes =
      shiftEnd - shiftStart;

    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes();

    let progress = 0;

    if (totalShiftMinutes > 0) {

      progress = Math.min(
        100,
        Math.max(
          0,
          (
            (currentMinutes - shiftStart) /
            totalShiftMinutes
          ) * 100
        )
      );
    }


    // =========================
    // RENDER
    // =========================

    res.render('Staff/time-tracking', {
      title: 'Stämpling',
      currentPage: 'time-tracking',
      layout: false,

      dateString: getDateString(),
      currentTime,

      isClockedIn,
      progress,
      workedTime,

      plannedStartTime,
      plannedEndTime,
      checkInTime
    });
  },


  // =========================
  // STÄMPLA IN
  // =========================

  clockIn: (req, res) => {

    const userId = req.session?.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    const now = new Date();

    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    const timestamp =
      now.toISOString();


    // =========================
    // KOLLA OM REDAN INSTÄMPLAD
    // =========================

    const existingEntry = db.prepare(`
      SELECT *
      FROM time_entries
      WHERE userId = ?
        AND date = ?
        AND checkInTime IS NOT NULL
        AND checkOutTime IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(userId, date);


    if (existingEntry) {
      return res.redirect('/staff/time-tracking');
    }


    // =========================
    // HÄMTA EVENTUELL RAD FÖR IDAG
    // =========================

    const todayEntry = db.prepare(`
      SELECT *
      FROM time_entries
      WHERE userId = ?
        AND date = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(userId, date);


    // =========================
    // UPPDATERA BEFINTLIG RAD
    // =========================

    if (todayEntry) {

      db.prepare(`
        UPDATE time_entries
        SET
          checkInTime = ?,
          checkOutTime = NULL,
          durationMinutes = 0,
          overtimeMinutes = 0,
          status = 'INSTAMPLAD',
          updatedAt = datetime('now')
        WHERE id = ?
      `).run(
        timestamp,
        todayEntry.id
      );

    }


    // =========================
    // SKAPA NY RAD
    // =========================

    else {

      db.prepare(`
        INSERT INTO time_entries (
          userId,
          date,
          checkInTime,
          status
        )
        VALUES (?, ?, ?, 'INSTAMPLAD')
      `).run(
        userId,
        date,
        timestamp
      );
    }


    res.redirect('/staff/time-tracking');
  },


  // =========================
  // STÄMPLA UT
  // =========================

  clockOut: (req, res) => {

    const userId = req.session?.user?.id;

    if (!userId) {
      return res.redirect('/login');
    }

    const now = new Date();

    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    const timestamp =
      now.toISOString();


    // =========================
    // HÄMTA AKTIV STÄMPLING
    // =========================

    const entry = db.prepare(`
      SELECT *
      FROM time_entries
      WHERE userId = ?
        AND date = ?
        AND checkInTime IS NOT NULL
        AND checkOutTime IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(userId, date);


    if (!entry) {
      return res.redirect('/staff/time-tracking');
    }


    // =========================
    // BERÄKNA ARBETAD TID
    // =========================

    const checkIn =
      new Date(entry.checkInTime);

    const checkOut =
      now;

    const elapsedMinutes =
      Math.max(
        0,
        Math.floor(
          (checkOut - checkIn) / 60000
        )
      );


    // =========================
    // SPARA UTSTÄMPLING
    // =========================

    // Vi sparar faktisk arbetad tid.
    // Den schemalagda rasten dras inte bort
    // automatiskt från ett kort testpass.

    const durationMinutes =
      elapsedMinutes;


    // =========================
    // BERÄKNA ÖVERTID
    // =========================

    const plannedHours =
      Number(entry.plannedHours || 8);

    const plannedMinutes =
      plannedHours * 60;

    const overtimeMinutes =
      Math.max(
        0,
        durationMinutes - plannedMinutes
      );


    // =========================
    // SPARA UTSTÄMPLING
    // =========================

    db.prepare(`
      UPDATE time_entries
      SET
        checkOutTime = ?,
        durationMinutes = ?,
        overtimeMinutes = ?,
        status = 'EJ_INSTAMPLAD',
        updatedAt = datetime('now')
      WHERE id = ?
    `).run(
      timestamp,
      durationMinutes,
      overtimeMinutes,
      entry.id
    );


    res.redirect('/staff/time-tracking');
  },


  // =========================
  // ÖVERSIKT
  // =========================

  getOverview: (req, res) => {

    const allTasks = db.prepare(`
      SELECT stable_tasks.*,
             horses.name as horseName,
             horses.paddockNumber,
             horses.photoUrl
      FROM stable_tasks
      LEFT JOIN horses
        ON stable_tasks.horseId = horses.id
      WHERE date(stable_tasks.dueDate) = date('now')
         OR stable_tasks.dueDate IS NULL
    `).all();


    const todoCount =
      allTasks.filter(
        t => t.status !== 'Klar'
      ).length;


    const doneCount =
      allTasks.filter(
        t => t.status === 'Klar'
      ).length;


    const grouped = {};


    allTasks.forEach(task => {

      const key =
        task.taskType || 'Övrigt';


      if (!grouped[key]) {
        grouped[key] = [];
      }


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


  // =========================
  // UPPGIFTER
  // =========================

  getTasks: (req, res) => {

    stableTaskService.resetCompletedTasks();

    const tasks =
      stableTaskService.getAllTasks();


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

    stableTaskService.markTaskComplete(
      req.params.id
    );

    const referer =
      req.headers.referer ||
      '/staff/tasks';


    res.redirect(referer);
  },


  postToggleChecklist: (req, res) => {

    res.redirect('/staff/tasks');
  },


  addTask: (req, res) => {

    stableTaskService.addTask(
      req.body
    );

    res.redirect('/staff/tasks');
  },


  deleteTask: (req, res) => {

    stableTaskService.deleteTask(
      req.params.id
    );

    res.redirect('/staff/tasks');
  },


  unmarkTask: (req, res) => {

    stableTaskService.unmarkTaskComplete(
      req.params.id
    );

    const referer =
      req.headers.referer ||
      '/staff/tasks';


    res.redirect(referer);
  },


  // =========================
  // SCHEMA
  // =========================

  getSchedule: (req, res) => {

    res.render('Staff/schedule', {
      title: 'Schema',
      currentPage: 'schedule',
      layout: false,
      dateString: getDateString()
    });
  },


  // =========================
  // HÄSTAR
  // =========================

  getHorses: (req, res) => {

    const horses = db.prepare(`
      SELECT *
      FROM horses
      WHERE status = 'Aktiv & Tjänstbar'
    `).all();


    const tasks = db.prepare(`
      SELECT *
      FROM stable_tasks
      WHERE horseId IS NOT NULL
    `).all();


    const horsesWithTasks =
      horses.map(horse => ({

        ...horse,

        tasks: tasks.filter(
          t =>
            Number(t.horseId) ===
            Number(horse.id)
        )
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

    const horse = db.prepare(`
      SELECT *
      FROM horses
      WHERE id = ?
    `).get(req.params.id);


    if (!horse) {
      return res.redirect('/staff/horses');
    }


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


  // =========================
  // PROFIL
  // =========================

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