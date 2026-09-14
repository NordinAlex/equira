const express = require('express');
const { getDataSource } = require('../config/database');

const router = express.Router();

router.get("/horses", async (req, res, next) => {
    try {
        const dataSource = await getDataSource();
        const horseRepository = dataSource.getRepository("Horse");
        const horses = await horseRepository.find();

        res.render("student/horses", { horses });
    } catch (error) {
        next(error);
    }
});

router.get("/horses/:id", async (req, res, next) => {
    try {
        const dataSource = await getDataSource();
        const horseRepository = dataSource.getRepository("Horse");
        const horse = await horseRepository.findOneBy({
            id: Number(req.params.id)
        });

        if (!horse) {
            return res.status(404).render("error");
        }

        res.render("student/horse-profile", { horse });

    } catch (error) {
        next(error);
    }
});

module.exports = router;