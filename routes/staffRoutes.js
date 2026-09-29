const express = require('express');

const router = express.Router();

const staffController = require('../controllers/staffController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('STAFF', 'ADMIN'));

// ============================================================
// STAFF - Stämpling
// ============================================================

router.get('/time-tracking', (req, res) => {
  staffController.getTimeTracking(req, res);
});


// ============================================================
// STAFF - ÖVERSIKT
// ============================================================

router.get('/overview', (req, res) => staffController.getOverview(req, res));


// ============================================================
// STAFF - UPPGIFTER
// ============================================================

router.get('/tasks', (req, res) => staffController.getTasks(req, res));

router.post('/tasks/:id/complete', (req, res) => {
  staffController.postCompleteTask(req, res);
});

router.post('/tasks/:id/uncomplete', (req, res) => {
  staffController.unmarkTask(req, res);
});


// ============================================================
// STAFF - ÖVERSIKTENS UPPGIFTER
// ============================================================

router.post('/overview/tasks/:id/complete', (req, res) => {
  staffController.postCompleteTask(req, res);
});

router.post('/overview/tasks/:id/uncomplete', (req, res) => {
  staffController.unmarkTask(req, res);
});


// ============================================================
// STAFF - HÄSTAR
// ============================================================

router.get('/horses', (req, res) => {
  staffController.getHorses(req, res);
});

// Detaljerad hästprofil
router.get('/horses/:id', (req, res) => {
  staffController.getHorseProfile(req, res);
});


// ============================================================
// STAFF - PROFIL
// ============================================================

router.get('/profile', (req, res) => {
  staffController.getProfile(req, res);
});


module.exports = router;