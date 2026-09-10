const express = require('express');
const horses = require('../data/horses');

const router = express.Router();

router.get("/horses", (req, res) => {
    res.render("student/horses", { horses });
});

router.get("/horses/:id", (req, res) => {
    const horse = horses.find(horse => horse.id == req.params.id);

    res.render("student/horse-profile", { horse });
});

module.exports = router;