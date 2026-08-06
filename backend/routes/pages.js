const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pagesController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Debug middleware to trace all requests to this router
router.use((req, res, next) => {
  console.log(`PagesRouter middleware: ${req.method} ${req.path}`);
  next();
});

// Admin routes only
// Dashboard routes
router.get('/dashboard', ensureAuthenticated, pagesController.renderDashboard);
router.get('/dashboard.html', ensureAuthenticated, pagesController.renderDashboard);

// Members routes
router.get('/members', ensureAuthenticated, pagesController.renderMembers);
router.get('/members.html', ensureAuthenticated, pagesController.renderMembers);

// Member Details routes
router.get('/member-details', ensureAuthenticated, pagesController.renderMemberDetails);
router.get('/member-details.html', ensureAuthenticated, pagesController.renderMemberDetails);

// Payments routes
router.get('/payments', ensureAuthenticated, pagesController.renderPayments);
router.get('/payments.html', ensureAuthenticated, pagesController.renderPayments);

// Reports routes
router.get('/reports', ensureAuthenticated, pagesController.renderReports);
router.get('/reports.html', ensureAuthenticated, pagesController.renderReports);

// Announcements routes
router.get('/announcements', ensureAuthenticated, pagesController.renderAnnouncements);
router.get('/announcements.html', ensureAuthenticated, pagesController.renderAnnouncements);

// Settings routes
router.get('/settings', ensureAuthenticated, pagesController.renderSettings);
router.get('/settings.html', ensureAuthenticated, pagesController.renderSettings);

// Profile routes
router.get('/profile', ensureAuthenticated, pagesController.renderProfile);
router.get('/profile.html', ensureAuthenticated, pagesController.renderProfile);

// Account routes
router.get('/account', ensureAuthenticated, pagesController.renderAccount);
router.get('/account.html', ensureAuthenticated, pagesController.renderAccount);

// Activity Logs routes
router.get('/activity-logs', ensureAuthenticated, (req, res, next) => {
  console.log('ROUTE HANDLER: /activity-logs route matched');
  pagesController.renderActivityLogs(req, res, next);
});
router.get('/activity-logs.html', ensureAuthenticated, (req, res, next) => {
  console.log('ROUTE HANDLER: /activity-logs.html route matched');
  pagesController.renderActivityLogs(req, res, next);
});

module.exports = router;
