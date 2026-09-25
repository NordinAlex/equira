const express = require('express');

const {requireLogin, requireRole } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

const router = express.Router();

router.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

router.get("/overview", requireLogin, requireRole('STUDENT'), studentController.overview);
router.get("/lessons/:id", requireLogin, requireRole('STUDENT'), studentController.lessonDetails);

router.get("/schedule", requireLogin, requireRole('STUDENT'), studentController.schedule);

router.get("/horses", requireLogin, requireRole('STUDENT'), studentController.horses);
router.get("/horses/:id", requireLogin, requireRole('STUDENT'), studentController.horseProfile);

router.get("/quiz", requireLogin, requireRole('STUDENT'), studentController.quizzes);
router.get("/quiz/:id", requireLogin, requireRole('STUDENT'), studentController.activeQuiz);
router.post("/quiz/:id/results", requireLogin, requireRole('STUDENT'), studentController.quizResults);
router.get("/quiz/:id/result", requireLogin, requireRole('STUDENT'), studentController.quizResult);

router.get("/profile", requireLogin, requireRole('STUDENT'), studentController.profile);

module.exports = router;