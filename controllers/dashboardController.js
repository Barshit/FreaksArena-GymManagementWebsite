const Member = require('../models/Member');
const Payment = require('../models/Payment');
const Announcement = require('../models/Announcement');

function getMemberStatus(member) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Check if member is currently paused
  if (member.pauseHistory && member.pauseHistory.length > 0) {
    const activePause = member.pauseHistory.find((pause) => {
      const pauseStart = new Date(pause.startDate);
      const pauseEnd = new Date(pause.endDate);
      pauseStart.setUTCHours(0, 0, 0, 0);
      pauseEnd.setUTCHours(23, 59, 59, 999);
      return pauseStart <= today && today <= pauseEnd;
    });
    if (activePause) {
      return 'paused';
    }
  }

  // Check if membership is expired
  const expiryDate = new Date(member.expiryDate);
  expiryDate.setUTCHours(23, 59, 59, 999);
  if (today > expiryDate) {
    return 'expired';
  }

  return 'active';
}

async function getDashboardStats(req, res) {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7);

    const monthStart = new Date(today);
    monthStart.setUTCDate(1);

    const monthEnd = new Date(today);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(1);

    // Monthly Revenue - Sum of completed payments this month
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
        },
      },
    ]);

    const monthlyRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Memberships Expiring Within 7 Days (excluding paused members)
    const allMembers = await Member.find().lean();

    let expiringCount = 0;
    let expiredCount = 0;

    for (const member of allMembers) {
      const status = getMemberStatus(member);

      // Only count active members for expiring/expired status
      if (status === 'paused') {
        continue;
      }

      const expiryDate = new Date(member.expiryDate);
      expiryDate.setUTCHours(0, 0, 0, 0);

      if (status === 'expired') {
        expiredCount += 1;
      } else if (expiryDate >= today && expiryDate < sevenDaysFromNow) {
        expiringCount += 1;
      }
    }

    // Pending Payments - Assume "pending" status payments
    const pendingPaymentsResult = await Payment.countDocuments({
      status: 'pending',
    });

    // Today's Birthdays
    const birthdaysResult = await Member.find({
      birthday: {
        $exists: true,
        $ne: null,
      },
    })
      .select('_id birthday fullName')
      .lean();

    const birthdayCount = birthdaysResult.filter((member) => {
      if (!member.birthday) return false;
      const bday = new Date(member.birthday);
      return bday.getUTCDate() === today.getUTCDate() && bday.getUTCMonth() === today.getUTCMonth();
    }).length;

    // Active Announcements
    const activeAnnouncements = await Announcement.find({
      status: 'Active',
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gte: today } },
      ],
    })
      .select('_id title category priority publishedAt')
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      expiringIn7Days: expiringCount,
      expiredMemberships: expiredCount,
      pendingPayments: pendingPaymentsResult,
      birthdaysToday: birthdayCount,
      announcements: activeAnnouncements,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching dashboard stats:`, error);
    return res.status(500).json({ error: 'Unable to fetch dashboard statistics. Please try again later.' });
  }
}

module.exports = {
  getDashboardStats,
  getMemberStatus,
};
