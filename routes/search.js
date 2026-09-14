const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  const query = req.query.q;
  
  // Filtrera hästar baserat på sökning
  const horses = [
    { name: 'Bella', location: 'Box 12 • Foderstat B' },
    { name: 'Luna', location: 'Sjukruta • Rehab schema' },
    { name: 'Max', location: 'Hage 4 • Skning 14:00' },
  ];

  const results = horses.filter(horse => 
    horse.name.toLowerCase().includes(query.toLowerCase())
  );

  res.render('staff/search', { title: 'Sök', currentPage: '', query, results });
});

module.exports = router;