const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole('STAFF', 'ADMIN'));

router.get('/overview', (req, res) => staffController.getOverview(req, res));
router.get('/tasks', (req, res) => staffController.getTasks(req, res));
router.post('/tasks/:id/complete', (req, res) => staffController.postCompleteTask(req, res));
router.post('/tasks/add', (req, res) => staffController.addTask(req, res));
router.post('/tasks/:id/delete', (req, res) => staffController.deleteTask(req, res));
router.post('/tasks/:id/uncomplete', (req, res) => staffController.unmarkTask(req, res));
router.get('/horses', (req, res) => staffController.getHorses(req, res));
router.get('/profile', (req, res) => staffController.getProfile(req, res));

module.exports = router;