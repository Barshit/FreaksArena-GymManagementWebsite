module.exports = (err, req, res, next) => {
  console.error(err.stack || err);

  // CSRF validation failed
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Forbidden: Invalid CSRF token.");
  }

  // All other errors
  res.status(500).send("Internal Server Error");
};