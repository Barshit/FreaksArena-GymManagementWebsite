const ActivityLog = require('../models/ActivityLog');

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

const logActivity = async (req, res, next) => {
  req.logActivity = async ({
    action,
    module,
    recordId = null,
    description = null,
    changes = null,
    status = 'success',
    errorMessage = null,
  }) => {
    try {
      const adminId = req.session?.adminId;
      if (!adminId) {
        console.warn('Activity log attempted without admin session');
        return;
      }

      const log = new ActivityLog({
        admin: adminId,
        action,
        module,
        recordId,
        description,
        changes,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent') || 'unknown',
        status,
        errorMessage,
      });

      await log.save();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  next();
};

module.exports = {
  logActivity,
  getClientIp,
};
