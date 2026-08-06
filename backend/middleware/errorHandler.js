module.exports = (err, req, res, next) => {
  console.error(err.stack || err);

  // CSRF validation failed
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      error: "CSRF validation failed",
      message: "Invalid or missing CSRF token"
    });
  }

  // Session-related errors
  if (err.name === 'SessionError' || err.message?.includes('session')) {
    return res.status(401).json({
      error: "Session error",
      message: "Your session has expired or is invalid"
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongooseError' || err.name === 'MongoError') {
    return res.status(503).json({
      error: "Database error",
      message: "Unable to connect to database"
    });
  }

  // All other errors
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'production' ? "An error occurred" : err.message
  });
};