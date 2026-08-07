const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const renderLogin = (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/dashboard');
  }
 console.log("Session ID:", req.sessionID);
  console.log("CSRF Token:", res.locals.csrfToken);
  console.log("Session:", req.session);
  return res.render('admin-login', {
    extraHead: '',
    title: 'Admin Login | Freaks Arena Gym',
    styles: ['/css/dashboard.css'],
    scripts: [],
    bodyClass: 'admin-login-page',
    message: null,
    email: '',
  });
};

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const login = async (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).render('admin-login', {
      extraHead: '',
      title: 'Admin Login | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: [],
      bodyClass: 'admin-login-page',
      message: 'Email and password are required.',
      email,
    });
  }

  try {
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).render('admin-login', {
        extraHead: '',
        title: 'Admin Login | Freaks Arena Gym',
        styles: ['/css/dashboard.css'],
        scripts: [],
        bodyClass: 'admin-login-page',
        message: 'Invalid email or password.',
        email,
      });
    }

    const now = Date.now();
    if (admin.lockUntil && admin.lockUntil.getTime() > now) {
      return res.status(401).render('admin-login', {
        extraHead: '',
        title: 'Admin Login | Freaks Arena Gym',
        styles: ['/css/dashboard.css'],
        scripts: [],
        bodyClass: 'admin-login-page',
        message: 'Account locked due to multiple failed login attempts. Please try again after 15 minutes.',
        email,
      });
    }

    if (admin.lockUntil && admin.lockUntil.getTime() <= now) {
      admin.lockUntil = null;
      admin.failedLoginAttempts = 0;
      await admin.save();
    }

    const passwordMatches = await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      let message = 'Invalid email or password.';

      if (admin.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        admin.lockUntil = new Date(now + LOCKOUT_DURATION_MS);
        admin.failedLoginAttempts = 0;
        message = 'Account locked due to multiple failed login attempts. Please try again after 15 minutes.';
      }

      await admin.save();

      return res.status(401).render('admin-login', {
        extraHead: '',
        title: 'Admin Login | Freaks Arena Gym',
        styles: ['/css/dashboard.css'],
        scripts: [],
        bodyClass: 'admin-login-page',
        message,
        email,
      });
    }

    await Admin.findByIdAndUpdate(admin._id, {
      failedLoginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
    });

    // Preserve required session data before regenerating the session ID
    const preservedSession = {
      adminId: admin._id.toString(),
      adminEmail: admin.email,
      adminName: admin.name,
    };

    // Regenerate the session to mitigate session fixation attacks
    // Do NOT regenerate on failed login; only performed here after successful auth
    req.session.regenerate(async (regErr) => {
      if (regErr) {
        console.error('Session regeneration error:', regErr);
        return res.status(500).send('Unable to establish a secure session. Please try again.');
      }

      // Restore required session values onto the newly-generated session
      req.session.adminId = preservedSession.adminId;
      req.session.adminEmail = preservedSession.adminEmail;
      req.session.adminName = preservedSession.adminName;

      // Persist the new session and then proceed with login actions
      req.session.save(async (saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          return res.status(500).send('Unable to establish a secure session. Please try again.');
        }

        // Log login activity
        if (req.logActivity) {
          await req.logActivity({
            action: 'login',
            module: 'auth',
            description: `Admin logged in`,
            status: 'success',
          });
        }

        return res.redirect('/dashboard');
      });
    });
  } catch (error) {
  console.error("========== LOGIN ERROR ==========");
  console.error(error);
  console.error(error.stack);
  console.error("================================");
    return res.status(500).render('admin-login', {
      extraHead: '',
      title: 'Admin Login | Freaks Arena Gym',
      styles: ['/css/dashboard.css'],
      scripts: [],
      bodyClass: 'admin-login-page',
      message: 'Unable to process login at this time. Please try again later.',
      email,
    });
  }
};

const logout = async (req, res) => {
  const adminId = req.session?.adminId;

  if (!req.session) {
    return res.redirect('/admin-login');
  }

  if (req.logActivity) {
    try {
      await req.logActivity({
        action: 'logout',
        module: 'auth',
        description: 'Admin logged out',
        status: 'success',
      });
    } catch (error) {
      console.error('Error logging logout:', error);
    }
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Failed to log out. Please try again.');
    }

    res.clearCookie('connect.sid');
    return res.redirect('/admin-login');
  });
};

module.exports = {
  renderLogin,
  login,
  logout,
};
