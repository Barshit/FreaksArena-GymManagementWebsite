/**
 * Session Validation Middleware
 * Validates session integrity and handles session-related errors
 */

const sessionValidator = (req, res, next) => {
  // Skip validation for GET requests and public endpoints
  if (req.method === 'GET' || req.path === '/api/enquiries' || req.path === '/api/announcements/active') {
    return next();
  }

  // Check if session exists and is valid for protected operations
  if (!req.session) {
    return res.status(401).json({
      error: 'Session not available',
      message: 'Authentication required'
    });
  }

  // Validate session cookie
  if (!req.sessionID) {
    return res.status(401).json({
      error: 'Invalid session',
      message: 'Session ID not found'
    });
  }

  // Log session information for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('Session validated:', {
      sessionID: req.sessionID,
      cookie: req.session.cookie,
      expires: req.session.cookie?.expires
    });
  }

  next();
};

module.exports = sessionValidator;