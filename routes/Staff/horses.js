const express = require('express');
const router = express.Router();

router.get('/staff', function(req, res, next) {
  res.render('staff/horses', { title: 'Hästar', currentPage: 'horses' });
});

module.exports = router;