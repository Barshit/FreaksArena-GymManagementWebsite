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
    // Use aggregation to avoid fetching all members into application memory.
    // Compute today's start and 7-days boundary as Date objects (UTC midnight) and pass to aggregation.
    const memberExpiryPipeline = [
      {
        $addFields: {
          isPaused: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$pauseHistory', []] },
                    as: 'pause',
                    cond: {
                      $and: [
                        { $lte: ['$$pause.startDate', today] },
                        { $gte: ['$$pause.endDate', today] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $facet: {
          expiredCount: [
            { $match: { isPaused: false, expiryDate: { $lt: today } } },
            { $count: 'count' },
          ],
          expiringCount: [
            { $match: { isPaused: false, expiryDate: { $gte: today, $lt: sevenDaysFromNow } } },
            { $count: 'count' },
          ],
          expiringMembersList: [
            { $match: { isPaused: false, expiryDate: { $gte: today, $lt: sevenDaysFromNow } } },
            {
              $addFields: {
                daysRemaining: {
                  $ceil: {
                    $divide: [
                      { $subtract: ['$expiryDate', today] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
              },
            },
            { $sort: { daysRemaining: 1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                fullName: 1,
                plan: 1,
                expiryDate: 1,
                daysRemaining: 1,
              },
            },
          ],
        },
      },
    ];

    const memberExpiryResult = await Member.aggregate(memberExpiryPipeline);

    const expiredCount = (memberExpiryResult[0].expiredCount[0] && memberExpiryResult[0].expiredCount[0].count) || 0;
    const expiringCount = (memberExpiryResult[0].expiringCount[0] && memberExpiryResult[0].expiringCount[0].count) || 0;
    const expiringMembersList = memberExpiryResult[0].expiringMembersList || [];

    // Pending Payments - unchanged
    const pendingPaymentsResult = await Payment.countDocuments({ status: 'pending' });

    // Today's Birthdays - use aggregation to count day/month equality in DB
    const birthDay = today.getUTCDate();
    const birthMonth = today.getUTCMonth() + 1; // Mongo $month is 1-12

    const birthdayPipeline = [
      {
        $match: {
          birthday: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          bDay: { $dayOfMonth: '$birthday' },
          bMonth: { $month: '$birthday' },
        },
      },
      {
        $match: {
          $expr: { $and: [{ $eq: ['$bDay', birthDay] }, { $eq: ['$bMonth', birthMonth] }] },
        },
      },
      { $count: 'count' },
    ];

    const birthdaysAgg = await Member.aggregate(birthdayPipeline);
    const birthdayCount = (birthdaysAgg[0] && birthdaysAgg[0].count) || 0;

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
      expiringMembers: expiringMembersList,
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
