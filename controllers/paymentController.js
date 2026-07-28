const Payment = require('../models/Payment');
const Member = require('../models/Member');
const Admin = require('../models/Admin');

function parseDateOnly(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parsePaymentPayload(data, adminId) {
  const payload = {
    member: data.member || data.memberId,
    amount: parseFloat(data.amount),
    method: (data.method || 'card').toLowerCase(),
    status: (data.status || 'completed').toLowerCase(),
    notes: (data.notes || '').trim(),
    recordedBy: adminId,
  };

  if (data.membershipPlan) {
    payload.membershipPlan = data.membershipPlan.trim();
  }

  if (data.paidAt || data.date) {
    const dateValue = data.paidAt || data.date;
    const parsed = parseDateOnly(dateValue);
    if (parsed) {
      payload.paidAt = parsed;
    }
  }

  return payload;
}

function validatePaymentPayload(data) {
  const errors = [];

  if (!data.member && !data.memberId) {
    errors.push('Member is required.');
  }

  const amount = parseFloat(data.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    errors.push('Payment amount must be greater than zero.');
  }

  if (!data.method) {
    errors.push('Payment method is required.');
  }

  if (!data.status) {
    errors.push('Payment status is required.');
  }

  if (data.paidAt || data.date) {
    const dateValue = data.paidAt || data.date;
    const parsed = parseDateOnly(dateValue);
    if (!parsed) {
      errors.push('Invalid payment date.');
    }
  }

  return errors;
}

async function listPayments(req, res) {
  try {
    const adminId = req.session.adminId;
    const payments = await Payment.find()
      .populate('member', 'fullName phone plan expiryDate memberId')
      .sort({ paidAt: -1 })
      .lean();

    return res.json(payments);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error listing payments:`, error);
    return res.status(500).json({ error: 'Unable to list payments. Please try again later.' });
  }
}

async function createPayment(req, res) {
  try {
    const adminId = req.session.adminId;
    const data = req.body;

    const validationErrors = validatePaymentPayload(data);
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const memberId = data.member || data.memberId;
    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const payload = parsePaymentPayload(data, adminId);

    const payment = new Payment(payload);
    await payment.save();
    await payment.populate('member', 'fullName phone plan expiryDate memberId');

    // Log payment creation activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'payment_created',
        module: 'payment',
        recordId: payment._id.toString(),
        description: `Payment of ${payment.amount} recorded for member ${payment.member?.fullName}`,
        changes: { amount: payment.amount, method: payment.method, status: payment.status },
        status: 'success',
      });
    }

    console.log(`[Admin ${adminId}] Payment created: ${payment._id}`);
    return res.status(201).json(payment);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error creating payment:`, error);
    return res.status(500).json({ error: 'Unable to create payment. Please try again later.' });
  }
}

async function getPayment(req, res) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId).populate(
      'member',
      'fullName phone plan expiryDate memberId'
    );

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    return res.json(payment);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching payment ${req.params.paymentId}:`, error);
    return res.status(500).json({ error: 'Unable to fetch payment. Please try again later.' });
  }
}

async function updatePayment(req, res) {
  try {
    const adminId = req.session.adminId;
    const { paymentId } = req.params;
    const data = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    const validationErrors = validatePaymentPayload(data);
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const memberId = data.member || data.memberId || payment.member;
    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const payload = parsePaymentPayload(data, adminId);
    Object.assign(payment, payload);
    await payment.save();
    await payment.populate('member', 'fullName phone plan expiryDate memberId');

    // Log payment update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'payment_updated',
        module: 'payment',
        recordId: paymentId,
        description: `Payment ${paymentId} updated`,
        changes: payload,
        status: 'success',
      });
    }

    console.log(`[Admin ${adminId}] Payment updated: ${paymentId}`);
    return res.json(payment);
  } catch (error) {
    console.error(
      `[Admin ${adminId}] Error updating payment ${req.params.paymentId}:`,
      error
    );
    return res.status(500).json({ error: 'Unable to update payment. Please try again later.' });
  }
}

async function deletePayment(req, res) {
  try {
    const adminId = req.session.adminId;
    const { paymentId } = req.params;

    const payment = await Payment.findByIdAndDelete(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    // Log payment deletion activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'payment_deleted',
        module: 'payment',
        recordId: paymentId,
        description: `Payment ${paymentId} deleted`,
        status: 'success',
      });
    }

    console.log(`[Admin ${adminId}] Payment deleted: ${paymentId}`);
    return res.json({ message: 'Payment deleted successfully.' });
  } catch (error) {
    console.log(`[Admin ${adminId}] Error deleting payment ${req.params.paymentId}:`, error);
    return res.status(500).json({ error: 'Unable to delete payment. Please try again later.' });
  }
}

module.exports = {
  listPayments,
  createPayment,
  getPayment,
  updatePayment,
  deletePayment,
};
