const express = require('express');
const router = express.Router();

router.get('/staff', function(req, res, next) {
  const horses = [
    {
      name: 'Bella',
      location: 'Box 12 • Foderstat B',
      status: 'Prioritet hög',
      statusColor: 'red',
      image: '/images/bella.jpg',
      tasks: ['Fodring', 'Utsläpp', 'Mockning']
    },
    {
      name: 'Luna',
      location: 'Sjukruta • Rehab schema',
      status: 'Pågående',
      statusColor: 'yellow',
      image: '/images/luna.jpg',
      tasks: ['Fodring', 'Kontroll']
    },
    {
      name: 'Max',
      location: 'Hage 4 • Skoning 14:00',
      status: 'Kommande',
      statusColor: 'green',
      image: '/images/max.jpg',
      tasks: ['Utsläpp']
    }
  ];

  res.render('staff/horses', { title: 'Hästar', currentPage: 'horses', horses, layout: false, horses });
});

module.exports = router;