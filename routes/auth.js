const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.get('/login', (req, res) => authController.getLogin(req, res));
router.post('/login', (req, res) => authController.postLogin(req, res));
router.get('/login/quick/:role', (req, res) =>
  authController.fastLogin(req, res),
);
router.get('/install', (req, res) => authController.getInstall(req, res));
router.post('/install', (req, res) => authController.postInstall(req, res));
router.get('/logout', (req, res) => authController.logout(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

module.exports = router;
