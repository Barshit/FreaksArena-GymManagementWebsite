const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateGymInfo,
  updateMembershipSettings,
  updatePaymentSettings,
  updateSystemSettings,
  changeAdminPassword,
} = require('../controllers/settingsController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.get('/', getSettings);
router.put('/gym-info', updateGymInfo);
router.put('/membership', updateMembershipSettings);
router.put('/payment', updatePaymentSettings);
router.put('/system', updateSystemSettings);
router.post('/change-password', changeAdminPassword);

module.exports = router;
