const Member = require('../models/Member');
const Payment = require('../models/Payment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Helper function to get a normalized date range based on filter
function getDateRange(filter, customStart, customEnd) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let startDate;
  let endDate;

  switch (filter) {
    case 'today':
      startDate = new Date(today);
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = customEnd ? new Date(customEnd) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        endDate.setDate(endDate.getDate() + 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return { startDate, endDate };
}

// Helper function to check if a membership has an active pause
function hasActivePause(member) {
  if (!member.pauseHistory || member.pauseHistory.length === 0) {
    return false;
  }
  const now = new Date();
  return member.pauseHistory.some(pause => {
    return new Date(pause.startDate) <= now && now <= new Date(pause.endDate);
  });
}

// Monthly Revenue Report
async function getMonthlyRevenueReport(req, res) {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month, 10) - 1;
    const yearNum = parseInt(year, 10);

    if (monthNum < 0 || monthNum > 11 || yearNum < 2000 || yearNum > 2099) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    const monthStart = new Date(Date.UTC(yearNum, monthNum, 1));
    const monthEnd = new Date(Date.UTC(yearNum, monthNum + 1, 1));

    const revenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: {
            $gte: monthStart,
            $lt: monthEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        },
      },
    ]);

    const data = revenueResult.length > 0 ? revenueResult[0] : { totalRevenue: 0, totalPayments: 0 };

    return res.json({
      month: month,
      year: year,
      totalRevenue: parseFloat(data.totalRevenue.toFixed(2)),
      totalPayments: data.totalPayments,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching monthly revenue report:`, error);
    return res.status(500).json({ error: 'Unable to fetch monthly revenue report. Please try again later.' });
  }
}

// Revenue Report with Date Range
async function getRevenueReport(req, res) {
  try {
    const { filter, startDate, endDate } = req.query;
    const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(filter, startDate, endDate);

    const revenueResult = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: {
            $gte: rangeStart,
            $lt: rangeEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          avgPayment: { $avg: '$amount' },
        },
      },
    ]);

    const data = revenueResult.length > 0 ? revenueResult[0] : { 
      totalRevenue: 0, 
      totalPayments: 0, 
      avgPayment: 0 
    };

    // Get all-time total revenue
    const allTimeResult = await Payment.aggregate([
      {
        $match: { status: 'completed' },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    const allTimeTotal = allTimeResult.length > 0 ? allTimeResult[0].totalRevenue : 0;

    return res.json({
      filter: filter || 'month',
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      revenue: {
        total: parseFloat(data.totalRevenue.toFixed(2)),
        payments: data.totalPayments,
        average: parseFloat(data.avgPayment.toFixed(2)),
      },
      allTimeRevenue: parseFloat(allTimeTotal.toFixed(2)),
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching revenue report:`, error);
    return res.status(500).json({ error: 'Unable to fetch revenue report. Please try again later.' });
  }
}

// Membership Report
async function getMembershipReport(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const allMembers = await Member.find({}).lean();

    let activeCount = 0;
    let expiredCount = 0;
    let pausedCount = 0;

    allMembers.forEach(member => {
      if (hasActivePause(member)) {
        pausedCount++;
      } else if (new Date(member.expiryDate) >= today) {
        activeCount++;
      } else {
        expiredCount++;
      }
    });

    const newMembersThisMonth = allMembers.filter(member => {
      const joinDate = new Date(member.joiningDate);
      return joinDate >= monthStart && joinDate < monthEnd;
    }).length;

    const renewalResults = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: monthStart, $lt: monthEnd },
        },
      },
      {
        $lookup: {
          from: 'members',
          localField: 'member',
          foreignField: '_id',
          as: 'memberInfo',
        },
      },
      { $unwind: { path: '$memberInfo', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'memberInfo.joiningDate': { $lt: monthStart },
        },
      },
      {
        $count: 'count',
      },
    ]);

    const renewedThisMonth = renewalResults.length > 0 ? renewalResults[0].count : 0;

    return res.json({
      total: allMembers.length,
      active: activeCount,
      expired: expiredCount,
      paused: pausedCount,
      newThisMonth: newMembersThisMonth,
      renewedThisMonth: renewedThisMonth,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching membership report:`, error);
    return res.status(500).json({ error: 'Unable to fetch membership report. Please try again later.' });
  }
}

// Payment Report with Date Range
async function getPaymentReport(req, res) {
  try {
    const { filter, startDate, endDate } = req.query;
    const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(filter, startDate, endDate);

    const paymentStats = await Payment.aggregate([
      {
        $match: {
          paidAt: {
            $gte: rangeStart,
            $lt: rangeEnd,
          },
        },
      },
      {
        $facet: {
          completed: [
            { $match: { status: 'completed' } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          pending: [
            { $match: { status: 'pending' } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          failed: [
            { $match: { status: 'failed' } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          refunded: [
            { $match: { status: 'refunded' } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
        },
      },
    ]);

    const stats = paymentStats[0];

    const completedCount = stats.completed.length > 0 ? stats.completed[0].count : 0;
    const pendingCount = stats.pending.length > 0 ? stats.pending[0].count : 0;
    const failedCount = stats.failed.length > 0 ? stats.failed[0].count : 0;
    const refundedCount = stats.refunded.length > 0 ? stats.refunded[0].count : 0;

    return res.json({
      filter: filter || 'month',
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalPayments: completedCount + pendingCount + failedCount + refundedCount,
      completed: {
        count: completedCount,
        total: stats.completed.length > 0 ? parseFloat(stats.completed[0].total.toFixed(2)) : 0,
      },
      pending: {
        count: pendingCount,
        total: stats.pending.length > 0 ? parseFloat(stats.pending[0].total.toFixed(2)) : 0,
      },
      failed: {
        count: failedCount,
        total: stats.failed.length > 0 ? parseFloat(stats.failed[0].total.toFixed(2)) : 0,
      },
      refunded: {
        count: refundedCount,
        total: stats.refunded.length > 0 ? parseFloat(stats.refunded[0].total.toFixed(2)) : 0,
      },
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching payment report:`, error);
    return res.status(500).json({ error: 'Unable to fetch payment report. Please try again later.' });
  }
}

// Report Chart Data
async function getReportCharts(req, res) {
  try {
    const now = new Date();
    const monthCount = 12;
    const startMonth = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const monthLabels = [];
    const monthBuckets = [];
    for (let i = 0; i < monthCount; i++) {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const label = monthDate.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthLabels.push(label);
      monthBuckets.push({ year: monthDate.getFullYear(), month: monthDate.getMonth() + 1 });
    }

    const revenueResults = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: startMonth, $lt: endMonth },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' },
          },
          totalRevenue: { $sum: '$amount' },
        },
      },
    ]);

    const revenueMap = new Map();
    revenueResults.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      revenueMap.set(key, item.totalRevenue);
    });

    const monthlyRevenue = monthBuckets.map(bucket => {
      const key = `${bucket.year}-${bucket.month}`;
      return parseFloat((revenueMap.get(key) || 0).toFixed(2));
    });

    const growthResults = await Member.aggregate([
      {
        $match: {
          joiningDate: { $gte: startMonth, $lt: endMonth },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$joiningDate' },
            month: { $month: '$joiningDate' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const growthMap = new Map();
    growthResults.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      growthMap.set(key, item.count);
    });

    const memberGrowth = monthBuckets.map(bucket => {
      const key = `${bucket.year}-${bucket.month}`;
      return growthMap.get(key) || 0;
    });

    const planResults = await Member.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
    ]);

    const planDistribution = {
      Basic: 0,
      Premium: 0,
      Elite: 0,
      Other: 0,
    };

    planResults.forEach(item => {
      const plan = (item._id || '').toString().toLowerCase();
      if (plan.includes('basic')) {
        planDistribution.Basic += item.count;
      } else if (plan.includes('premium')) {
        planDistribution.Premium += item.count;
      } else if (plan.includes('elite')) {
        planDistribution.Elite += item.count;
      } else {
        planDistribution.Other += item.count;
      }
    });

    const methodResults = await Payment.aggregate([
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentMethodDistribution = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      'Bank Transfer': 0,
      Other: 0,
    };

    methodResults.forEach(item => {
      const method = (item._id || '').toString().toLowerCase();
      if (method === 'cash') {
        paymentMethodDistribution.Cash += item.count;
      } else if (method === 'upi') {
        paymentMethodDistribution.UPI += item.count;
      } else if (method === 'card') {
        paymentMethodDistribution.Card += item.count;
      } else if (method === 'bank-transfer') {
        paymentMethodDistribution['Bank Transfer'] += item.count;
      } else {
        paymentMethodDistribution.Other += item.count;
      }
    });

    return res.json({
      labels: monthLabels,
      monthlyRevenue,
      memberGrowth,
      planDistribution,
      paymentMethodDistribution,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching chart report data:`, error);
    return res.status(500).json({ error: 'Unable to fetch chart data. Please try again later.' });
  }
}

// Export Reports as PDF
async function exportReportAsPDF(req, res) {
  try {
    const { type, filter, startDate, endDate } = req.query;
    const reportType = String(type || 'all').toLowerCase();
    
    const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(filter, startDate, endDate);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().getTime()}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Freaks Arena Gym', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`${reportType === 'all' ? 'Full' : reportType.toUpperCase()} Report`, { align: 'center' });
    doc.fontSize(10).text(`Period: ${rangeStart.toDateString()} to ${new Date(new Date(rangeEnd).getTime() - 86400000).toDateString()}`, { align: 'center' });
    doc.moveDown();

    if (reportType === 'revenue' || reportType === 'all') {
      const revenueData = await Payment.aggregate([
        {
          $match: {
            status: 'completed',
            paidAt: { $gte: rangeStart, $lt: rangeEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalPayments: { $sum: 1 },
            avgPayment: { $avg: '$amount' },
          },
        },
      ]);

      const data = revenueData.length > 0 ? revenueData[0] : { totalRevenue: 0, totalPayments: 0, avgPayment: 0 };

      doc.fontSize(14).font('Helvetica-Bold').text('Revenue Summary', { underline: true });
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total Revenue: ₹${parseFloat(data.totalRevenue.toFixed(2)).toLocaleString('en-IN')}`);
      doc.text(`Total Payments: ${data.totalPayments}`);
      doc.text(`Average Payment: ₹${parseFloat(data.avgPayment.toFixed(2)).toLocaleString('en-IN')}`);
    }

    if (reportType === 'membership' || reportType === 'all') {
      const allMembers = await Member.find({}).lean();
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      let activeCount = 0, expiredCount = 0, pausedCount = 0;

      allMembers.forEach(member => {
        if (hasActivePause(member)) {
          pausedCount++;
        } else if (new Date(member.expiryDate) >= today) {
          activeCount++;
        } else {
          expiredCount++;
        }
      });

      doc.moveDown();
      doc.fontSize(14).font('Helvetica-Bold').text('Membership Summary', { underline: true });
      doc.fontSize(11).font('Helvetica');
      doc.text(`Total Members: ${allMembers.length}`);
      doc.text(`Active Members: ${activeCount}`);
      doc.text(`Expired Members: ${expiredCount}`);
      doc.text(`Paused Members: ${pausedCount}`);
    }

    if (reportType === 'payment' || reportType === 'all') {
      const paymentData = await Payment.aggregate([
        {
          $match: {
            paidAt: { $gte: rangeStart, $lt: rangeEnd },
          },
        },
        {
          $facet: {
            completed: [
              { $match: { status: 'completed' } },
              { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
            ],
            pending: [
              { $match: { status: 'pending' } },
              { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
            ],
            failed: [
              { $match: { status: 'failed' } },
              { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
            ],
          },
        },
      ]);

      const stats = paymentData[0];

      doc.fontSize(14).font('Helvetica-Bold').text('Payment Summary', { underline: true });
      doc.fontSize(11).font('Helvetica');
      const completed = stats.completed.length > 0 ? stats.completed[0] : { count: 0, total: 0 };
      const pending = stats.pending.length > 0 ? stats.pending[0] : { count: 0, total: 0 };
      const failed = stats.failed.length > 0 ? stats.failed[0] : { count: 0, total: 0 };

      doc.text(`Completed Payments: ${completed.count} (₹${parseFloat(completed.total.toFixed(2)).toLocaleString('en-IN')})`);
      doc.text(`Pending Payments: ${pending.count} (₹${parseFloat(pending.total.toFixed(2)).toLocaleString('en-IN')})`);
      doc.text(`Failed Payments: ${failed.count} (₹${parseFloat(failed.total.toFixed(2)).toLocaleString('en-IN')})`);
    }

    doc.moveDown();
    doc.fontSize(9).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error exporting PDF report:`, error);
    return res.status(500).json({ error: 'Unable to generate PDF report. Please try again later.' });
  }
}

// Export Reports as Excel
async function exportReportAsExcel(req, res) {
  try {
    const { type, filter, startDate, endDate } = req.query;
    const reportType = String(type || 'all').toLowerCase();
    
    const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(filter, startDate, endDate);

    const workbook = new ExcelJS.Workbook();
    const reportWorksheet = reportType === 'all' ? null : workbook.addWorksheet('Report');

    if (reportType === 'revenue' || reportType === 'all') {
      const worksheet = reportType === 'all' ? workbook.addWorksheet('Revenue') : reportWorksheet;
      const revenueData = await Payment.find(
        {
          status: 'completed',
          paidAt: { $gte: rangeStart, $lt: rangeEnd },
        },
        { amount: 1, paidAt: 1, membershipPlan: 1 }
      ).lean();

      worksheet.columns = [
        { header: 'Payment Date', key: 'date', width: 15 },
        { header: 'Amount (₹)', key: 'amount', width: 12 },
        { header: 'Plan', key: 'plan', width: 15 },
      ];

      revenueData.forEach(payment => {
        worksheet.addRow({
          date: new Date(payment.paidAt).toLocaleDateString('en-IN'),
          amount: parseFloat(payment.amount.toFixed(2)),
          plan: payment.membershipPlan || '—',
        });
      });

      worksheet.addRow({});
      worksheet.addRow({
        date: 'TOTAL',
        amount: revenueData.reduce((sum, p) => sum + p.amount, 0).toFixed(2),
      });
    }

    if (reportType === 'membership' || reportType === 'all') {
      const worksheet = reportType === 'all' ? workbook.addWorksheet('Membership') : reportWorksheet;
      const members = await Member.find({}, {
        memberId: 1,
        fullName: 1,
        joiningDate: 1,
        expiryDate: 1,
        amountPaid: 1,
      }).lean();

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      worksheet.columns = [
        { header: 'Member ID', key: 'id', width: 12 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Joining Date', key: 'joining', width: 15 },
        { header: 'Expiry Date', key: 'expiry', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Amount (₹)', key: 'amount', width: 12 },
      ];

      members.forEach(member => {
        let status = 'Expired';
        if (hasActivePause(member)) {
          status = 'Paused';
        } else if (new Date(member.expiryDate) >= today) {
          status = 'Active';
        }

        worksheet.addRow({
          id: member.memberId,
          name: member.fullName,
          joining: new Date(member.joiningDate).toLocaleDateString('en-IN'),
          expiry: new Date(member.expiryDate).toLocaleDateString('en-IN'),
          status,
          amount: parseFloat(member.amountPaid.toFixed(2)),
        });
      });
    }

    if (reportType === 'payment' || reportType === 'all') {
      const worksheet = reportType === 'all' ? workbook.addWorksheet('Payment') : reportWorksheet;
      const payments = await Payment.find(
        {
          paidAt: { $gte: rangeStart, $lt: rangeEnd },
        },
        { amount: 1, paidAt: 1, status: 1, method: 1, membershipPlan: 1 }
      ).lean();

      worksheet.columns = [
        { header: 'Payment Date', key: 'date', width: 15 },
        { header: 'Amount (₹)', key: 'amount', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Method', key: 'method', width: 12 },
        { header: 'Plan', key: 'plan', width: 15 },
      ];

      payments.forEach(payment => {
        worksheet.addRow({
          date: new Date(payment.paidAt).toLocaleDateString('en-IN'),
          amount: parseFloat(payment.amount.toFixed(2)),
          status: payment.status,
          method: payment.method,
          plan: payment.membershipPlan || '—',
        });
      });

      const completedTotal = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      worksheet.addRow({});
      worksheet.addRow({
        date: 'TOTAL (Completed)',
        amount: parseFloat(completedTotal.toFixed(2)),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}-${new Date().getTime()}.xlsx"`);

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error exporting Excel report:`, error);
    return res.status(500).json({ error: 'Unable to generate Excel report. Please try again later.' });
  }
}

module.exports = {
  getMonthlyRevenueReport,
  getRevenueReport,
  getMembershipReport,
  getPaymentReport,
  getReportCharts,
  exportReportAsPDF,
  exportReportAsExcel,
};
