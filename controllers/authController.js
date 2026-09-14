const authService = require('../services/authService');

/**
 * Thin controller for Authentication & Sessions
 * Handles only HTTP req/res, redirects, and session state.
 */
class AuthController {
  getLogin(req, res) {
    if (req.session && req.session.user) {
      return this._redirectByRole(req.session.user.role, res);
    }
    const returnUrl = req.query.returnUrl || '';
    res.render('auth/login', {
      title: 'Equira - Logga in',
      returnUrl,
      error: null,
      layout: false,
    });
  }

  async postLogin(req, res) {
    const { username, password, returnUrl } = req.body;

    try {
      const userDTO = await authService.authenticate(username, password);
      if (!userDTO) {
        return res.render('auth/login', {
          title: 'Equira - Logga in',
          returnUrl,
          error: 'Felaktigt användarnamn eller lösenord.',
          layout: false,
        });
      }

      req.session.user = userDTO;

      if (returnUrl && returnUrl.startsWith('/')) {
        return res.redirect(returnUrl);
      }

      return this._redirectByRole(userDTO.role, res);
    } catch (err) {
      console.error('Login error:', err);
      return res.render('auth/login', {
        title: 'Equira - Logga in',
        returnUrl,
        error: 'Ett oväntat fel uppstod vid inloggning.',
        layout: false,
      });
    }
  }

  /**
   * Fast 1-click test login for quick demonstration of all 3 portals
   */
  async fastLogin(req, res) {
    try {
      const userDTO = await authService.getQuickLoginUser(req.params.role);
      if (!userDTO) {
        return res.redirect('/login');
      }

      req.session.user = userDTO;
      return this._redirectByRole(userDTO.role, res);
    } catch (err) {
      console.error('Fast login error:', err);
      return res.redirect('/login');
    }
  }

  logout(req, res) {
    req.session.destroy(err => {
      if (err) {
        console.error('Logout session destroy error:', err);
      }
      res.redirect('/login');
    });
  }

  async getInstall(req, res) {
    try {
      const isInstalled = await authService.isInstalled();
      if (isInstalled) {
        if (req.setFlash) req.setFlash('info', 'Systemet är redan installerat. Vänligen logga in.');
        return res.redirect('/login');
      }

      res.render('auth/install', {
        title: 'Equira - Installation & Skapa administratör',
        error: null,
        formData: {},
        layout: false,
      });
    } catch (err) {
      console.error('getInstall error:', err);
      res.status(500).send('Ett fel uppstod vid kontroll av installation.');
    }
  }

  async postInstall(req, res) {
    const { fullName, username, email, phone, title, avatarUrl, specializations, password, confirmPassword } = req.body;
    const formData = { fullName, username, email, phone, title, avatarUrl, specializations };

    try {
      const isInstalled = await authService.isInstalled();
      if (isInstalled) {
        if (req.setFlash) req.setFlash('error', 'Systemet är redan installerat.');
        return res.redirect('/login');
      }

      // Validations
      if (!fullName || !username || !email || !password) {
        return res.render('auth/install', {
          title: 'Equira - Installation & Skapa administratör',
          error: 'Vänligen fyll i alla obligatoriska fält.',
          formData,
          layout: false,
        });
      }

      if (password !== confirmPassword) {
        return res.render('auth/install', {
          title: 'Equira - Installation & Skapa administratör',
          error: 'Lösenorden matchar inte.',
          formData,
          layout: false,
        });
      }

      if (password.length < 6) {
        return res.render('auth/install', {
          title: 'Equira - Installation & Skapa administratör',
          error: 'Lösenordet måste innehålla minst 6 tecken.',
          formData,
          layout: false,
        });
      }

      const userDTO = await authService.registerFirstAdmin({
        fullName,
        username,
        email,
        phone,
        password,
        title,
        specializations,
        avatarUrl,
      });

      // Automatically log the new master admin in
      req.session.user = userDTO;
      if (req.setFlash) {
        req.setFlash('success', `Välkommen till Equira, ${userDTO.fullName}! Ditt administratörskonto har skapats.`);
      }

      return res.redirect('/admin/overview');
    } catch (err) {
      console.error('postInstall error:', err);
      return res.render('auth/install', {
        title: 'Equira - Installation & Skapa administratör',
        error: err.message || 'Ett fel uppstod under installationen.',
        formData,
        layout: false,
      });
    }
  }

  _redirectByRole(role, res) {
    switch (role) {
      case 'ADMIN':
        return res.redirect('/admin/overview');
      case 'STAFF':
        return res.redirect('/staff/overview');
      case 'STUDENT':
        return res.redirect('/student/overview');
      default:
        return res.redirect('/login');
    }
  }
}

module.exports = new AuthController();
