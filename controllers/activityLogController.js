const ActivityLog = require('../models/ActivityLog');
const Admin = require('../models/Admin');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getActivityLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      module,
      search,
      startDate,
      endDate,
      sort = '-createdAt',
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (module) {
      filter.module = module;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const escapedSearch = escapeRegExp(search.trim());
      const searchRegex = new RegExp(escapedSearch, 'i');
      const adminMatchIds = await Admin.find({
        name: { $regex: searchRegex },
      })
        .select('_id')
        .lean();

      const searchConditions = [
        { description: { $regex: searchRegex } },
        { recordId: { $regex: searchRegex } },
      ];

      if (adminMatchIds.length > 0) {
        searchConditions.push({ admin: { $in: adminMatchIds.map((admin) => admin._id) } });
      }

      filter.$or = searchConditions;
    }

    const total = await ActivityLog.countDocuments(filter);
    const logs = await ActivityLog.find(filter)
      .populate('admin', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalPages = Math.ceil(total / parseInt(limit));

    return res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasMore: parseInt(page) < totalPages,
      },
    });
  } catch (error) {
    console.error(`[Admin ${req.session?.adminId}] Error fetching activity logs:`, error);
    return res.status(500).json({ error: 'Unable to fetch activity logs. Please try again later.' });
  }
}

async function getActivityLogStats(req, res) {
  try {
    const actions = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const modules = await ActivityLog.aggregate([
      {
        $group: {
          _id: '$module',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalLogs = await ActivityLog.countDocuments();
    const last24Hours = await ActivityLog.countDocuments({
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      totalLogs,
      last24Hours,
      actionStats: actions,
      moduleStats: modules,
    });
  } catch (error) {
    console.error(`[Admin ${req.session?.adminId}] Error fetching activity log stats:`, error);
    return res.status(500).json({
      error: 'Unable to fetch activity log statistics. Please try again later.',
    });
  }
}

async function getActivityLogById(req, res) {
  try {
    const { id } = req.params;

    const log = await ActivityLog.findById(id).populate('admin', 'name email');

    if (!log) {
      return res.status(404).json({ error: 'Activity log not found.' });
    }

    return res.json(log);
  } catch (error) {
    console.error(`[Admin ${req.session?.adminId}] Error fetching activity log:`, error);
    return res.status(500).json({ error: 'Unable to fetch activity log. Please try again later.' });
  }
}

module.exports = {
  getActivityLogs,
  getActivityLogStats,
  getActivityLogById,
};
