const express = require('express');
const router = express.Router();

router.get('/staff', function(req, res, next) {
  res.render('staff/profile', { 
    title: 'Min Profil', 
    currentPage: 'profile',
    layout: false
  });
});

module.exports = router;