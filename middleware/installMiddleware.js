const authService = require('../services/authService');

/**
 * Middleware that checks if the database is initialized with at least one user.
 * 
 * - If no users exist in the database (uninstalled):
 *   Redirects all web requests to /install to register the master admin.
 * - If users already exist (installed):
 *   Blocks access to /install and redirects to /login.
 */
async function installMiddleware(req, res, next) {
  // Always allow static files through
  if (
    req.path.startsWith('/images/') ||
    req.path.startsWith('/stylesheets/') ||
    req.path.startsWith('/javascripts/') ||
    req.path.startsWith('/favicon.ico')
  ) {
    return next();
  }

  try {
    const isInstalled = await authService.isInstalled();

    // Case 1: System is NOT installed yet
    if (!isInstalled) {
      if (req.path === '/install') {
        return next();
      }

      if (req.path.startsWith('/api/')) {
        return res.status(503).json({
          error: 'Systemet är inte installerat. Besök /install för att konfigurera första administratören.',
          installUrl: '/install',
        });
      }

      return res.redirect('/install');
    }

    // Case 2: System is already installed
    if (req.path === '/install') {
      if (req.setFlash) {
        req.setFlash('info', 'Systemet är redan installerat. Vänligen logga in.');
      }
      return res.redirect('/login');
    }

    // System is installed and request is for normal routes
    return next();
  } catch (err) {
    console.error('installMiddleware error:', err);
    return next();
  }
}

module.exports = installMiddleware;
