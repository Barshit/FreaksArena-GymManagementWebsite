const express = require('express');
const memberController = require('../controllers/memberController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(ensureAuthenticated);

router.get('/', memberController.listMembers);
router.get('/:id', memberController.getMember);
router.post('/', memberController.createMember);
router.put('/:id', memberController.updateMember);
router.delete('/:id', memberController.deleteMember);
router.post('/:id/renew', memberController.renewMember);
router.post('/:id/pause', memberController.pauseMembership);
router.post('/:id/unpause', memberController.unpauseMembership);

module.exports = router;
