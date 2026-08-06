const express = require('express');
const router = express.Router();
const {
  getMonthlyRevenueReport,
  getRevenueReport,
  getMembershipReport,
  getPaymentReport,
  getReportCharts,
  exportReportAsPDF,
  exportReportAsExcel,
} = require('../controllers/reportsController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.use(ensureAuthenticated);

router.get('/monthly-revenue', getMonthlyRevenueReport);
router.get('/revenue', getRevenueReport);
router.get('/membership', getMembershipReport);
router.get('/payment', getPaymentReport);
router.get('/charts', getReportCharts);
router.get('/export/pdf', exportReportAsPDF);
router.get('/export/excel', exportReportAsExcel);

module.exports = router;
