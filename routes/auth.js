const express = require('express');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/authMiddleware');
const { loginRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Debug middleware to trace all requests to this router
router.use((req, res, next) => {
  console.log(`AuthRouter middleware: ${req.method} ${req.path}`);
  next();
});

router.get(['/admin-login', '/admin-login.html'], redirectIfAuthenticated, authController.renderLogin);
router.post('/admin-login', redirectIfAuthenticated, loginRateLimiter, authController.login);
router.post('/logout', authController.logout);

module.exports = router;
