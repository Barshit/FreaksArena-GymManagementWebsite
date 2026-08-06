const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'password_change',
        'profile_update',
        'member_added',
        'member_edited',
        'member_deleted',
        'membership_renewed',
        'membership_paused',
        'membership_resumed',
        'payment_created',
        'payment_updated',
        'payment_deleted',
        'announcement_created',
        'announcement_updated',
        'announcement_deleted',
        'settings_updated',
      ],
      required: true,
    },
    module: {
      type: String,
      enum: [
        'auth',
        'admin',
        'member',
        'membership',
        'payment',
        'announcement',
        'settings',
      ],
      required: true,
    },
    recordId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ admin: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ module: 1 });
activityLogSchema.index({ recordId: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ admin: 1, action: 1, createdAt: -1 });
activityLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
