function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session?.user;

    if (!user) {
      return res.redirect(
        `/login?returnUrl=${encodeURIComponent(req.originalUrl)}`,
      );
    }

    const userRole = String(user.role || '').toUpperCase();

    if (allowedRoles.includes(userRole)) {
      return next();
    }    

    return res.status(403).render('forbidden', {
      title: 'Ingen behörighet - Equira',
      requestedUrl: req.originalUrl,
      layout: false,
    });

    
  };
}

module.exports = { requireLogin, requireRole };
