const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const renderLogin = (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/dashboard');
  }

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

    const passwordMatches = await bcrypt.compare(password, admin.password);
    if (!passwordMatches) {
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

    req.session.adminId = admin._id.toString();
    req.session.adminEmail = admin.email;
    req.session.adminName = admin.name;

    // Update last login time
    await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });

    req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
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
  } catch (error) {
    console.error('Authentication error:', error);
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
