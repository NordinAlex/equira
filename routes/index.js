const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  const role = req.session.user.role;
  if (role === 'ADMIN') return res.redirect('/admin/overview');
  if (role === 'STAFF') return res.redirect('/staff/overview');
  return res.redirect('/student/overview');
});

module.exports = router;
