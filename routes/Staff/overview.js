const express = require('express');
const router = express.Router();

router.get('/staff', function(req, res, next) {
  res.render('staff/overview', { title: 'Översikt', currentPage: 'overview-staff', layout: false});
});

module.exports = router;