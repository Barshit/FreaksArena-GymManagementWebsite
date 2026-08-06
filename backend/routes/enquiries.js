const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  createEnquiry,
} = require('../controllers/enquiryController');

// Rate limiter for public enquiries to prevent abuse
const enquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 enquiries per hour
  message: 'Too many enquiries from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
});

// Public API - no CSRF protection but rate limited
router.post('/', enquiryRateLimiter, createEnquiry);

module.exports = router;