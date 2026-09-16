function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }

    next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect(`/login?returnUrl=${encodeURIComponent(req.originalUrl)}`);
    }

    const userRole = req.session.user.role;
    if (!roles.includes(userRole)) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(403).json({ error: 'Behörighet saknas.' });
      }

      // Redirect to user's home portal based on role
      if (userRole === 'ADMIN') return res.redirect('/admin/overview');
      if (userRole === 'STAFF') return res.redirect('/staff/overview');
      return res.redirect('/student/overview');
    }

    next();
  };
}

module.exports = { requireLogin, requireRole };