const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireLogin, requireRole } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

router.use(requireLogin, requireRole('ADMIN'));

router.get('/overview', (req, res) => adminController.getOverview(req, res));
router.get('/horses', (req, res) => adminController.getHorses(req, res));
router.get('/horses/create', (req, res) => adminController.getHorseCreate(req, res));
router.post('/horses/create', (req, res) => adminController.postHorseCreate(req, res));

router.get('/assign', (req, res) => adminController.getHorseAssign(req, res));
router.get('/assign/:lessonId', (req, res) => adminController.getHorseAssign(req, res));
router.post('/assign', (req, res) => adminController.postAssignHorse(req, res));

router.get('/lessons', (req, res) => adminController.getLessons(req, res));
router.get('/lessons/create', (req, res) => adminController.getLessonCreate(req, res));
router.post('/lessons/create', (req, res) => adminController.postLessonCreate(req, res));

router.get('/students', (req, res) => adminController.getStudents(req, res));
router.get('/students/create', (req, res) => adminController.getStudentCreate(req, res));
router.post('/students/create', uploadAvatar.single('avatar'), (req, res) => adminController.postStudentCreate(req, res));
router.get('/students/:id/edit', (req, res) => adminController.getStudentEdit(req, res));
router.post('/students/:id/edit', uploadAvatar.single('avatar'), (req, res) => adminController.postStudentEdit(req, res));
router.post('/students/:id/delete', (req, res) => adminController.postStudentDelete(req, res));

router.get('/staff', (req, res) => adminController.getStaff(req, res));
router.get('/staff/create', (req, res) => adminController.getStaffCreate(req, res));
router.post('/staff/create', uploadAvatar.single('avatar'), (req, res) => adminController.postStaffCreate(req, res));
router.get('/staff/:id/edit', (req, res) => adminController.getStaffEdit(req, res));
router.post('/staff/:id/edit', uploadAvatar.single('avatar'), (req, res) => adminController.postStaffEdit(req, res));
router.post('/staff/:id/delete', (req, res) => adminController.postStaffDelete(req, res));

router.get('/tasks', (req, res) => adminController.getStableTasks(req, res));
router.get('/tasks/create', (req, res) => adminController.getStableTaskCreate(req, res));
router.post('/tasks/create', (req, res) => adminController.postStableTaskCreate(req, res));
router.get('/tasks/:id/edit', (req, res) => adminController.getStableTaskEdit(req, res));
router.post('/tasks/:id/edit', (req, res) => adminController.postStableTaskEdit(req, res));
router.post('/tasks/:id/delete', (req, res) => adminController.postStableTaskDelete(req, res));

router.get('/quizzes', (req, res) => adminController.getQuizzes(req, res));
router.get('/quizzes/create', (req, res) => adminController.getQuizCreate(req, res));
router.post('/quizzes/create', (req, res) => adminController.postQuizCreate(req, res));
router.get('/quizzes/:id/edit', (req, res) => adminController.getQuizEdit(req, res));
router.post('/quizzes/:id/edit', (req, res) => adminController.postQuizEdit(req, res));
router.post('/quizzes/:id/delete', (req, res) => adminController.postQuizDelete(req, res));

router.get('/schedule', (req, res) => adminController.getSchedule(req, res));

// Admin Personal Profile & Security Settings
router.get('/profile', (req, res) => adminController.getProfile(req, res));
router.post('/profile', (req, res) => adminController.postProfile(req, res));
router.post('/profile/avatar', uploadAvatar.single('avatar'), (req, res) => adminController.postProfileAvatar(req, res));
router.post('/profile/password', (req, res) => adminController.postChangePassword(req, res));

module.exports = router;
