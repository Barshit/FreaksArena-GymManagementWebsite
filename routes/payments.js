const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const {
  listPayments,
  createPayment,
  getPayment,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');

router.use(ensureAuthenticated);

router.get('/', listPayments);
router.post('/', createPayment);
router.get('/:paymentId', getPayment);
router.put('/:paymentId', updatePayment);
router.delete('/:paymentId', deletePayment);

module.exports = router;
