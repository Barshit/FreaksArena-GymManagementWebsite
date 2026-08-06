const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },

    memberPhone: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    method: {
      type: String,
      enum: ["card", "cash", "bank-transfer", "online", "upi", "other"],
      default: "card",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
    },
    membershipPlan: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ member: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ status: 1, paidAt: -1 });
paymentSchema.index({ membershipPlan: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
