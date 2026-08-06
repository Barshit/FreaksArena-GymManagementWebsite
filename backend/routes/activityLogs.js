const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  getActivityLogStats,
  getActivityLogById,
} = require('../controllers/activityLogController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.get('/', getActivityLogs);
router.get('/stats', getActivityLogStats);
router.get('/:id', getActivityLogById);

module.exports = router;
