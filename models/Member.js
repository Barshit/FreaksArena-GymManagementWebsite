const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    gender: {
      type: String,
      required: true,
      trim: true,
      enum: ['Male', 'Female', 'Other'],
    },
    plan: {
      type: String,
      required: true,
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    birthday: {
      type: Date,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['Cash', 'UPI', 'Card'],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['Paid', 'Pending'],
    },
    pauseHistory: [
      {
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

memberSchema.index({ memberId: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ expiryDate: 1 });
memberSchema.index({ joiningDate: 1 });
memberSchema.index({ birthday: 1 });
memberSchema.index({ updatedAt: -1, createdAt: -1 });

module.exports = mongoose.model('Member', memberSchema);
