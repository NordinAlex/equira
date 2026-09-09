const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('tasks', { title: 'Uppgifter', currentPage: 'tasks' });
});

module.exports = router;