const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Gym Information
    gymName: {
      type: String,
      required: true,
      trim: true,
      default: 'Freaks Arena Gym',
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
      default: 'Admin',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      default: '1234567890',
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      default: 'admin@freaksarena.com',
    },
    address: {
      type: String,
      required: true,
      trim: true,
      default: '123 Fitness Lane, Cityville',
    },
    openingTime: {
      type: String,
      required: true,
      default: '06:00',
    },
    closingTime: {
      type: String,
      required: true,
      default: '21:00',
    },

    // Membership Settings
    defaultMembershipDuration: {
      type: Number,
      required: true,
      default: 30,
      min: 1,
      max: 365,
    },
    membershipExpiryReminderDays: {
      type: Number,
      required: true,
      default: 7,
      min: 1,
      max: 365,
    },
    maxMembershipPauseDays: {
      type: Number,
      required: true,
      default: 30,
      min: 1,
      max: 365,
    },
    allowMembershipPause: {
      type: Boolean,
      default: true,
    },

    // Payment Settings
    defaultCurrency: {
      type: String,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    acceptedPaymentMethods: {
      type: [String],
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer'],
      default: ['Cash', 'UPI', 'Card'],
    },

    // System Settings
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY',
    },
    autoUpdateExpiredMemberships: {
      type: Boolean,
      default: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

settingsSchema.index({ updatedBy: 1 });

module.exports = mongoose.model('Settings', settingsSchema);
