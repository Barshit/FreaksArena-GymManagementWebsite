const isJsonRequest = (req) => {
  return req.accepts(['html', 'json']) === 'json' || req.originalUrl.startsWith('/api/');
};

const ensureAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }

  if (isJsonRequest(req)) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  return res.redirect('/admin-login');
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/dashboard');
  }

  return next();
};

module.exports = {
  ensureAuthenticated,
  redirectIfAuthenticated,
};
