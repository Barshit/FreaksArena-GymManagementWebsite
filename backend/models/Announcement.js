const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    targetAudience: {
      type: String,
      enum: ['All Members', 'Active Members', 'Expired Members', 'Specific Member'],
      default: 'All Members',
    },
    category: {
      type: String,
      enum: ['General', 'Event', 'Offer', 'Holiday', 'Notice', 'Maintenance'],
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['Normal', 'Important', 'Urgent'],
      default: 'Normal',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ expiresAt: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ priority: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
