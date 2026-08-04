const Member = require('../models/Member');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

const VALID_GENDERS = ['Male', 'Female', 'Other'];
const VALID_PAYMENT_METHODS = ['Cash', 'UPI', 'Card'];
const VALID_PAYMENT_STATUSES = ['Paid', 'Pending'];

// Helper to parse date-only strings (YYYY-MM-DD) reliably as UTC start-of-day
const parseDateOnly = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseMemberPayload = (body = {}) => {
  const payload = {
    memberId: body.memberId ? String(body.memberId).trim() : '',
    fullName: body.fullName ? String(body.fullName).trim() : '',
    phone: body.phone ? String(body.phone).trim() : '',
    gender: body.gender ? String(body.gender).trim() : '',
    plan: body.plan ? String(body.plan).trim() : '',
    joiningDate: body.joiningDate ? String(body.joiningDate).trim() : '',
    expiryDate: body.expiryDate ? String(body.expiryDate).trim() : '',
    birthday: body.birthday ? String(body.birthday).trim() : '',
    amountPaid: body.amountPaid !== undefined ? Number(body.amountPaid) : NaN,
    paymentMethod: body.paymentMethod ? String(body.paymentMethod).trim() : '',
    paymentStatus: body.paymentStatus ? String(body.paymentStatus).trim() : '',
  };

  payload.birthday = parseDateOnly(payload.birthday);
  payload.joiningDate = parseDateOnly(payload.joiningDate);
  payload.expiryDate = parseDateOnly(payload.expiryDate);

  if (payload.birthday) {
    payload.birthday.setUTCHours(0, 0, 0, 0);
  }
  if (payload.joiningDate) {
    payload.joiningDate.setUTCHours(0, 0, 0, 0);
  }
  if (payload.expiryDate) {
    payload.expiryDate.setUTCHours(0, 0, 0, 0);
  }

  return payload;
};

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const validateMemberPayload = async (payload, currentMemberId = null) => {
  const errors = [];

  if (!payload.memberId) {
    errors.push('Member ID is required.');
  }
  if (!payload.fullName) {
    errors.push('Full Name is required.');
  }
  if (!payload.phone) {
    errors.push('Phone Number is required.');
  } else {
    const digits = String(payload.phone).replace(/\D/g, '');
    if (!/^[0-9]{10,15}$/.test(digits)) {
      errors.push('Phone Number must contain 10 to 15 digits.');
    } else {
      payload.phone = digits;
    }
  }
  if (!payload.gender || !VALID_GENDERS.includes(payload.gender)) {
    errors.push('Valid Gender is required.');
  }
  if (!payload.plan) {
    errors.push('Membership Plan is required.');
  }
  if (!payload.joiningDate) {
    errors.push('Joining Date is required.');
  }
  if (!payload.expiryDate) {
    errors.push('Expiry Date is required.');
  }
  if (payload.joiningDate && payload.expiryDate && payload.joiningDate > payload.expiryDate) {
    errors.push('Expiry Date must be the same day or after Joining Date.');
  }
  if (Number.isNaN(payload.amountPaid) || payload.amountPaid < 0) {
    errors.push('Amount Paid must be a valid number.');
  }
  if (!payload.paymentMethod || !VALID_PAYMENT_METHODS.includes(payload.paymentMethod)) {
    errors.push('Valid Payment Method is required.');
  }
  if (!payload.paymentStatus || !VALID_PAYMENT_STATUSES.includes(payload.paymentStatus)) {
    errors.push('Valid Payment Status is required.');
  }

  if (payload.memberId) {
    const query = { memberId: payload.memberId };
    if (currentMemberId && mongoose.Types.ObjectId.isValid(currentMemberId)) {
      query._id = { $ne: currentMemberId };
    }
    const existing = await Member.findOne(query).lean();
    if (existing) {
      errors.push('Member ID must be unique.');
    }
  }


  return errors;
};

const listMembers = async (req, res) => {
  try {
    const searchTerm = String(req.query.search || '').trim();
    const filter = {};

    if (searchTerm) {
      const escapedTerm = escapeRegex(searchTerm);
      const exactMemberMatch = await Member.find({ memberId: { $regex: `^${escapedTerm}$`, $options: 'i' } })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();

      if (exactMemberMatch.length) {
        return res.json(exactMemberMatch);
      }

      const regex = new RegExp(escapedTerm, 'i');
      filter.$or = [
        { memberId: regex },
        { fullName: regex },
        { phone: regex },
      ];
    }

    const members = await Member.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json(members);
  } catch (error) {
    console.error('Error listing members:', { adminId: req.session?.adminId, error });
    return res.status(500).json({ error: 'Unable to load members. Please try again later.' });
  }
};

const getMember = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  try {
    const member = await Member.findById(id).lean();
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    return res.json(member);
  } catch (error) {
    console.error('Error fetching member:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to load member details. Please try again later.' });
  }
};

const createMember = async (req, res) => {
  const payload = parseMemberPayload(req.body);
  const errors = await validateMemberPayload(payload);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const member = await Member.create({
      ...payload,
      createdBy: req.session.adminId,
    });

    await Payment.create({
      member: member._id,
      amount: payload.amountPaid,
      method: payload.paymentMethod.toLowerCase(),
      status: payload.paymentStatus.toLowerCase() === 'paid' ? 'completed' : 'pending',
      membershipPlan: payload.plan,
      recordedBy: req.session.adminId,
    });

    // Log member creation activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'member_added',
        module: 'member',
        recordId: member._id.toString(),
        description: `Member ${member.fullName} added`,
        status: 'success',
      });
    }

    // return created member
    return res.status(201).json(member);
  } catch (error) {
    // Handle duplicate key (race condition) gracefully
    if (error && error.code === 11000) {
      const dupField = Object.keys(error.keyValue || {}).join(', ');
      console.error('Duplicate key error creating member', { adminId: req.session?.adminId, dupField, error });
      return res.status(400).json({ error: `${dupField || 'A unique field'} already exists.` });
    }
    console.error('Error creating member:', { adminId: req.session?.adminId, error });
    return res.status(500).json({ error: 'Unable to create member. Please try again later.' });
  }
};

const updateMember = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  const payload = parseMemberPayload(req.body);
  const errors = await validateMemberPayload(payload, id);
  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    Object.assign(member, payload);
    await member.save();

    // Log member update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'member_edited',
        module: 'member',
        recordId: id,
        description: `Member ${member.fullName} updated`,
        changes: payload,
        status: 'success',
      });
    }

    return res.json(member);
  } catch (error) {
    if (error && error.code === 11000) {
      const dupField = Object.keys(error.keyValue || {}).join(', ');
      console.error('Duplicate key error updating member', { adminId: req.session?.adminId, memberId: id, dupField, error });
      return res.status(400).json({ error: `${dupField || 'A unique field'} already exists.` });
    }
    console.error('Error updating member:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to update member. Please try again later.' });
  }
};

const deleteMember = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  try {
    const member = await Member.findByIdAndDelete(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Log member deletion activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'member_deleted',
        module: 'member',
        recordId: id,
        description: `Member ${member.fullName} deleted`,
        status: 'success',
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to delete member. Please try again later.' });
  }
};

const renewMember = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  try {
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const currentExpiry = member.expiryDate instanceof Date && !Number.isNaN(member.expiryDate.getTime())
      ? member.expiryDate
      : new Date();

    const nextExpiry = new Date(currentExpiry);
    nextExpiry.setUTCDate(nextExpiry.getUTCDate() + 30);
    nextExpiry.setUTCHours(0, 0, 0, 0);
    member.expiryDate = nextExpiry;
    await member.save();

    const payload = parseMemberPayload(req.body);
    const shouldRecordPayment = req.body && Object.keys(req.body).some((key) => key !== '_csrf');

    if (shouldRecordPayment) {
      const amountPaid = Number.isNaN(payload.amountPaid) ? 0 : payload.amountPaid;
      const paymentMethod = payload.paymentMethod || 'Cash';
      const paymentStatus = payload.paymentStatus || 'Paid';

      await Payment.create({
        member: member._id,
        amount: amountPaid,
        method: paymentMethod.toLowerCase(),
        status: paymentStatus.toLowerCase() === 'paid' ? 'completed' : 'pending',
        membershipPlan: member.plan,
        recordedBy: req.session.adminId,
        notes: 'Membership renewal',
      });
    }

    // Log membership renewal activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'membership_renewed',
        module: 'membership',
        recordId: id,
        description: `Membership renewed for ${member.fullName}, expires ${nextExpiry.toDateString()}`,
        changes: { expiryDate: nextExpiry },
        status: 'success',
      });
    }

    res.json(member);
  } catch (error) {
    console.error('Error renewing member:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to renew member. Please try again later.' });
  }
};

const getMemberStatus = (member) => {
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
};

const pauseMembership = async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  const errors = [];

  // Validate dates
  if (!startDate) {
    errors.push('Pause start date is required.');
  }
  if (!endDate) {
    errors.push('Pause end date is required.');
  }

  const pauseStart = parseDateOnly(startDate);
  const pauseEnd = parseDateOnly(endDate);

  if (pauseStart && pauseEnd && pauseStart > pauseEnd) {
    errors.push('Pause end date must be same day or after pause start date.');
  }

  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  try {
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Check if membership is active
    const status = getMemberStatus(member);
    if (status === 'expired') {
      return res.status(400).json({ error: 'Cannot pause an expired membership.' });
    }
    if (status === 'paused') {
      return res.status(400).json({ error: 'This membership already has an active pause. Please end the current pause first.' });
    }

    // Check if there's already an active pause
    if (member.pauseHistory && member.pauseHistory.length > 0) {
      const activePause = member.pauseHistory.find((pause) => {
        const ps = new Date(pause.startDate);
        const pe = new Date(pause.endDate);
        ps.setUTCHours(0, 0, 0, 0);
        pe.setUTCHours(23, 59, 59, 999);
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return ps <= today && today <= pe;
      });
      if (activePause) {
        return res.status(400).json({ error: 'Member already has an active pause.' });
      }
    }

    // Add pause record
    if (!member.pauseHistory) {
      member.pauseHistory = [];
    }

    member.pauseHistory.push({
      startDate: pauseStart,
      endDate: pauseEnd,
      reason: reason || '',
    });

    await member.save();

    // Log membership pause activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'membership_paused',
        module: 'membership',
        recordId: id,
        description: `Membership paused for ${member.fullName} from ${pauseStart.toDateString()} to ${pauseEnd.toDateString()}`,
        changes: { reason, startDate: pauseStart, endDate: pauseEnd },
        status: 'success',
      });
    }

    res.json(member);
  } catch (error) {
    console.error('Error pausing membership:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to pause membership. Please try again later.' });
  }
};

const unpauseMembership = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid member identifier.' });
  }

  try {
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Find active pause
    let activePauseIndex = -1;
    let activePauseDuration = 0;

    if (member.pauseHistory && member.pauseHistory.length > 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      activePauseIndex = member.pauseHistory.findIndex((pause) => {
        const ps = new Date(pause.startDate);
        const pe = new Date(pause.endDate);
        ps.setUTCHours(0, 0, 0, 0);
        pe.setUTCHours(23, 59, 59, 999);
        return ps <= today && today <= pe;
      });

      if (activePauseIndex !== -1) {
        const pause = member.pauseHistory[activePauseIndex];
        const pauseStart = new Date(pause.startDate);
        const pauseEnd = new Date(pause.endDate);
        pauseStart.setUTCHours(0, 0, 0, 0);
        pauseEnd.setUTCHours(0, 0, 0, 0);

        // Calculate pause duration in days
        activePauseDuration = Math.ceil((pauseEnd - pauseStart) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    if (activePauseIndex === -1) {
      return res.status(400).json({ error: 'No active pause found for this member.' });
    }

    // Mark pause as ended by removing from active period (we keep it in history)
    // Instead, we just remove it from the active list

    // Extend expiry date by pause duration
    const currentExpiry = member.expiryDate instanceof Date && !Number.isNaN(member.expiryDate.getTime())
      ? member.expiryDate
      : new Date();

    const newExpiry = new Date(currentExpiry);
    newExpiry.setUTCDate(newExpiry.getUTCDate() + activePauseDuration);
    newExpiry.setUTCHours(0, 0, 0, 0);
    member.expiryDate = newExpiry;

    await member.save();

    // Log membership resume activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'membership_resumed',
        module: 'membership',
        recordId: id,
        description: `Membership resumed for ${member.fullName}, expiry extended to ${newExpiry.toDateString()}`,
        changes: { expiryDate: newExpiry, daysExtended: activePauseDuration },
        status: 'success',
      });
    }

    res.json(member);
  } catch (error) {
    console.error('Error unpausing membership:', { adminId: req.session?.adminId, memberId: id, error });
    return res.status(500).json({ error: 'Unable to unpause membership. Please try again later.' });
  }
};

module.exports = {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  renewMember,
  pauseMembership,
  unpauseMembership,
  getMemberStatus,
};
