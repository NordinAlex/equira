const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { requireLogin } = require("../middleware/authMiddleware");

router.get("/login", (req, res) => {
    res.render("auth/login");
});

router.post("/login", authController.login);

router.get("/dashboard", requireLogin, (req, res) => {
    res.send("Du är inloggad!");
});

module.exports = router;