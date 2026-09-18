const express = require('express');

const {requireLogin } = require('../middleware/authMiddleware');
const studentController = require('../controllers/studentController');

const router = express.Router();

router.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
});

router.get("/overview", requireLogin, studentController.overview);

router.get("/horses", requireLogin, studentController.horses);

router.get("/horses/:id", requireLogin, studentController.horseProfile);

module.exports = router;