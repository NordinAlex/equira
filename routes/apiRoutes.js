const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { requireLogin } = require('../middleware/authMiddleware');

router.use(requireLogin);

router.post('/assign-horse', (req, res) => apiController.assignHorse(req, res));
router.get('/validate-allocation', (req, res) => apiController.validateAllocation(req, res));


module.exports = router;
