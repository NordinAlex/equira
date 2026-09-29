const express = require('express');

const router = express.Router();

const adminController = require('../controllers/adminController');

const { requireLogin, requireRole } = require('../middleware/authMiddleware');

const { uploadAvatar, uploadHorse } = require('../middleware/uploadMiddleware');

router.use(requireLogin, requireRole('ADMIN'));

// ============================================================
// ADMIN - ÖVERSIKT
// ============================================================

router.get('/overview', (req, res) => adminController.getOverview(req, res));

// ============================================================
// ADMIN - HÄSTAR
// ============================================================

router.get('/horses', (req, res) => adminController.getHorses(req, res));

// Skapa häst
router.get('/horses/create', (req, res) =>
  adminController.getHorseCreate(req, res),
);

// Hästprofil
router.get('/horses/:id', (req, res) =>
  adminController.getHorseProfile(req, res),
);

// Lägg till åtgärd för specifik häst
router.post('/horses/:id/tasks', (req, res) =>
  adminController.postHorseTask(req, res),
);

router.post('/horses/create', uploadHorse.single('photo'), (req, res) =>
  adminController.postHorseCreate(req, res),
);

// Redigera häst
router.get('/horses/:id/edit', (req, res) =>
  adminController.getHorseEdit(req, res),
);

router.post('/horses/:id/edit', uploadHorse.single('photo'), (req, res) =>
  adminController.postHorseEdit(req, res),
);

// Ta bort häst
router.post('/horses/:id/delete', (req, res) =>
  adminController.postHorseDelete(req, res),
);

// ============================================================
// ADMIN - HÄSTTILLDELNING
// ============================================================

router.get('/assign', (req, res) => adminController.getHorseAssign(req, res));

router.get('/assign/:lessonId', (req, res) =>
  adminController.getHorseAssign(req, res),
);

router.post('/assign', (req, res) => adminController.postAssignHorse(req, res));

// ============================================================
// ADMIN - LEKTIONER
// ============================================================

router.get('/lessons', (req, res) => adminController.getLessons(req, res));

router.get('/lessons/create', (req, res) =>
  adminController.getLessonCreate(req, res),
);

router.post('/lessons/create', (req, res) =>
  adminController.postLessonCreate(req, res),
);

// ============================================================
// ADMIN - ELEVER
// ============================================================

router.get('/students', (req, res) => adminController.getStudents(req, res));

router.get('/students/create', (req, res) =>
  adminController.getStudentCreate(req, res),
);

router.post('/students/create', uploadAvatar.single('avatar'), (req, res) =>
  adminController.postStudentCreate(req, res),
);

router.get('/students/:id/edit', (req, res) =>
  adminController.getStudentEdit(req, res),
);

router.post('/students/:id/edit', uploadAvatar.single('avatar'), (req, res) =>
  adminController.postStudentEdit(req, res),
);

router.post('/students/:id/delete', (req, res) =>
  adminController.postStudentDelete(req, res),
);

// ============================================================
// ADMIN - PERSONAL
// ============================================================

router.get('/staff', (req, res) => adminController.getStaff(req, res));

router.get('/staff/create', (req, res) =>
  adminController.getStaffCreate(req, res),
);

router.post('/staff/create', uploadAvatar.single('avatar'), (req, res) =>
  adminController.postStaffCreate(req, res),
);

router.get('/staff/:id/edit', (req, res) =>
  adminController.getStaffEdit(req, res),
);

router.post('/staff/:id/edit', uploadAvatar.single('avatar'), (req, res) =>
  adminController.postStaffEdit(req, res),
);

router.post('/staff/:id/delete', (req, res) =>
  adminController.postStaffDelete(req, res),
);

// ============================================================
// ADMIN - STALLUPPGIFTER
// ============================================================

router.get('/tasks', (req, res) => adminController.getStableTasks(req, res));

router.get('/tasks/create', (req, res) =>
  adminController.getStableTaskCreate(req, res),
);

router.post('/tasks/create', (req, res) =>
  adminController.postStableTaskCreate(req, res),
);

router.get('/tasks/:id/edit', (req, res) =>
  adminController.getStableTaskEdit(req, res),
);

router.post('/tasks/:id/edit', (req, res) =>
  adminController.postStableTaskEdit(req, res),
);

router.post('/tasks/:id/delete', (req, res) =>
  adminController.postStableTaskDelete(req, res),
);

// ============================================================
// ADMIN - QUIZ
// ============================================================

router.get('/quizzes', (req, res) => adminController.getQuizzes(req, res));

router.get('/quizzes/create', (req, res) =>
  adminController.getQuizCreate(req, res),
);

router.post('/quizzes/create', (req, res) =>
  adminController.postQuizCreate(req, res),
);

router.get('/quizzes/:id/edit', (req, res) =>
  adminController.getQuizEdit(req, res),
);

router.post('/quizzes/:id/edit', (req, res) =>
  adminController.postQuizEdit(req, res),
);

router.post('/quizzes/:id/delete', (req, res) =>
  adminController.postQuizDelete(req, res),
);

// ============================================================
// ADMIN - SCHEMA
// ============================================================

router.get('/schedule', (req, res) => adminController.getSchedule(req, res));

// ============================================================
// ADMIN - PROFIL
// ============================================================

router.get('/profile', (req, res) => adminController.getProfile(req, res));

router.post('/profile', (req, res) => adminController.postProfile(req, res));

router.post('/profile/avatar', uploadAvatar.single('avatar'), (req, res) =>
  adminController.postProfileAvatar(req, res),
);

router.post('/profile/password', (req, res) =>
  adminController.postChangePassword(req, res),
);

// Time Tracking & Punch Management
router.get('/stampling', (req, res) => adminController.getStampling(req, res));
router.post('/stampling/in', (req, res) =>
  adminController.postAdminCheckIn(req, res),
);
router.post('/stampling/out/:id', (req, res) =>
  adminController.postAdminCheckOut(req, res),
);
router.post('/stampling/edit/:id', (req, res) =>
  adminController.postAdminEditTimeEntry(req, res),
);
router.post('/stampling/delete/:id', (req, res) =>
  adminController.postAdminDeleteTimeEntry(req, res),
);

// Staff Workforce Scheduling (Arbetsschema & Bemanning)
router.get('/staff-schedule', (req, res) =>
  adminController.getStaffSchedule(req, res),
);
router.get('/staff/schedule', (req, res) =>
  adminController.getStaffSchedule(req, res),
);
router.post('/staff-schedule/create', (req, res) =>
  adminController.postCreateStaffShift(req, res),
);
router.post('/staff-schedule/quick-week', (req, res) =>
  adminController.postQuickWeekStaffShift(req, res),
);
router.post('/staff-schedule/edit/:id', (req, res) =>
  adminController.postEditStaffShift(req, res),
);
router.post('/staff-schedule/delete/:id', (req, res) =>
  adminController.postDeleteStaffShift(req, res),
);

module.exports = router;
