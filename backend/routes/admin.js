const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  updateProfilePicture,
} = require('../controllers/adminController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/profile/picture', updateProfilePicture);

module.exports = router;
