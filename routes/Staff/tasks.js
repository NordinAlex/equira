const express = require('express');
const router = express.Router();

router.get('/staff', function(req, res, next) {
  res.render('staff/tasks', { title: 'Uppgifter', currentPage: 'tasks', layout: false });
});

module.exports = router;