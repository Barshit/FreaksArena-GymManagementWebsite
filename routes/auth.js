const express = require('express');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Debug middleware to trace all requests to this router
router.use((req, res, next) => {
  console.log(`AuthRouter middleware: ${req.method} ${req.path}`);
  next();
});

router.get(['/admin-login', '/admin-login.html'], redirectIfAuthenticated, authController.renderLogin);
router.post('/admin-login', redirectIfAuthenticated, authController.login);
router.get('/logout', authController.logout);

module.exports = router;
