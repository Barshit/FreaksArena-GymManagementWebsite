const express = require('express');
const announcementController = require('../controllers/announcementController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Public endpoint for active announcements (no authentication required)
router.get('/active', announcementController.getActiveAnnouncements);

// Protected endpoints (require authentication)
router.use(ensureAuthenticated);

router.get('/', announcementController.listAnnouncements);
router.post('/', announcementController.createAnnouncement);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router;
