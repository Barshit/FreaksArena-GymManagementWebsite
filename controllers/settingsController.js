const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');

// Get all settings
async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne().lean();

    if (!settings) {
      settings = await Settings.create({});
    }

    return res.json(settings);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching settings:`, error);
    return res.status(500).json({ error: 'Unable to fetch settings. Please try again later.' });
  }
}

// Update gym information
async function updateGymInfo(req, res) {
  try {
    const { gymName, ownerName, phone, email, address, openingTime, closingTime } = req.body;
    const adminId = req.session.adminId;

    if (!gymName || !gymName.trim()) {
      return res.status(400).json({ error: 'Gym name is required.' });
    }

    if (!ownerName || !ownerName.trim()) {
      return res.status(400).json({ error: 'Owner name is required.' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Address is required.' });
    }

    if (!openingTime || !openingTime.trim()) {
      return res.status(400).json({ error: 'Opening time is required.' });
    }

    if (!closingTime || !closingTime.trim()) {
      return res.status(400).json({ error: 'Closing time is required.' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    settings.gymName = gymName.trim();
    settings.ownerName = ownerName.trim();
    settings.phone = phone.trim();
    settings.email = email.trim().toLowerCase();
    settings.address = address.trim();
    settings.openingTime = openingTime.trim();
    settings.closingTime = closingTime.trim();
    settings.updatedBy = adminId;

    await settings.save();

    // Log gym info update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'settings_updated',
        module: 'settings',
        recordId: settings._id.toString(),
        description: 'Gym information updated',
        changes: { gymName, ownerName, phone, email, address, openingTime, closingTime },
        status: 'success',
      });
    }

    return res.json({
      message: 'Gym information updated successfully.',
      settings: settings.toObject(),
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating gym info:`, error);
    return res.status(500).json({ error: 'Unable to update gym information. Please try again later.' });
  }
}

// Update membership settings
async function updateMembershipSettings(req, res) {
  try {
    const { defaultMembershipDuration, membershipExpiryReminderDays, maxMembershipPauseDays, allowMembershipPause } = req.body;
    const adminId = req.session.adminId;

    if (defaultMembershipDuration && (defaultMembershipDuration < 1 || defaultMembershipDuration > 365)) {
      return res.status(400).json({ error: 'Default membership duration must be between 1 and 365 days.' });
    }

    if (membershipExpiryReminderDays && (membershipExpiryReminderDays < 1 || membershipExpiryReminderDays > 365)) {
      return res.status(400).json({ error: 'Expiry reminder days must be between 1 and 365 days.' });
    }

    if (maxMembershipPauseDays && (maxMembershipPauseDays < 1 || maxMembershipPauseDays > 365)) {
      return res.status(400).json({ error: 'Max pause days must be between 1 and 365 days.' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (defaultMembershipDuration) {
      settings.defaultMembershipDuration = defaultMembershipDuration;
    }

    if (membershipExpiryReminderDays) {
      settings.membershipExpiryReminderDays = membershipExpiryReminderDays;
    }

    if (maxMembershipPauseDays) {
      settings.maxMembershipPauseDays = maxMembershipPauseDays;
    }

    if (typeof allowMembershipPause === 'boolean') {
      settings.allowMembershipPause = allowMembershipPause;
    }

    settings.updatedBy = adminId;

    await settings.save();

    // Log membership settings update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'settings_updated',
        module: 'settings',
        recordId: settings._id.toString(),
        description: 'Membership settings updated',
        changes: { defaultMembershipDuration, membershipExpiryReminderDays, maxMembershipPauseDays, allowMembershipPause },
        status: 'success',
      });
    }

    return res.json({
      message: 'Membership settings updated successfully.',
      settings: settings.toObject(),
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating membership settings:`, error);
    return res.status(500).json({ error: 'Unable to update membership settings. Please try again later.' });
  }
}

// Update payment settings
async function updatePaymentSettings(req, res) {
  try {
    const { defaultCurrency, acceptedPaymentMethods } = req.body;
    const adminId = req.session.adminId;

    if (defaultCurrency && !['INR', 'USD', 'EUR'].includes(defaultCurrency)) {
      return res.status(400).json({ error: 'Invalid currency selected.' });
    }

    if (acceptedPaymentMethods && Array.isArray(acceptedPaymentMethods)) {
      const validMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer'];
      for (const method of acceptedPaymentMethods) {
        if (!validMethods.includes(method)) {
          return res.status(400).json({ error: 'Invalid payment method.' });
        }
      }
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (defaultCurrency) {
      settings.defaultCurrency = defaultCurrency;
    }

    if (acceptedPaymentMethods && acceptedPaymentMethods.length > 0) {
      settings.acceptedPaymentMethods = acceptedPaymentMethods;
    }

    settings.updatedBy = adminId;

    await settings.save();

    // Log payment settings update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'settings_updated',
        module: 'settings',
        recordId: settings._id.toString(),
        description: 'Payment settings updated',
        changes: { defaultCurrency, acceptedPaymentMethods },
        status: 'success',
      });
    }

    return res.json({
      message: 'Payment settings updated successfully.',
      settings: settings.toObject(),
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating payment settings:`, error);
    return res.status(500).json({ error: 'Unable to update payment settings. Please try again later.' });
  }
}

// Update system settings
async function updateSystemSettings(req, res) {
  try {
    const { timezone, dateFormat, autoUpdateExpiredMemberships } = req.body;
    const adminId = req.session.adminId;

    if (dateFormat && !['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].includes(dateFormat)) {
      return res.status(400).json({ error: 'Invalid date format selected.' });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (timezone && timezone.trim()) {
      settings.timezone = timezone.trim();
    }

    if (dateFormat) {
      settings.dateFormat = dateFormat;
    }

    if (typeof autoUpdateExpiredMemberships === 'boolean') {
      settings.autoUpdateExpiredMemberships = autoUpdateExpiredMemberships;
    }

    settings.updatedBy = adminId;

    await settings.save();

    // Log system settings update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'settings_updated',
        module: 'settings',
        recordId: settings._id.toString(),
        description: 'System settings updated',
        changes: { timezone, dateFormat, autoUpdateExpiredMemberships },
        status: 'success',
      });
    }

    return res.json({
      message: 'System settings updated successfully.',
      settings: settings.toObject(),
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating system settings:`, error);
    return res.status(500).json({ error: 'Unable to update system settings. Please try again later.' });
  }
}

// Change admin password
async function changeAdminPassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const adminId = req.session.adminId;

    if (!currentPassword || !currentPassword.trim()) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'New password is required.' });
    }

    if (!confirmPassword || !confirmPassword.trim()) {
      return res.status(400).json({ error: 'Confirm password is required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirm password do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const admin = await Admin.findById(adminId).select('+password');

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    // Log password change activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'password_change',
        module: 'admin',
        description: 'Admin changed password',
        status: 'success',
      });
    }

    return res.json({
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error changing password:`, error);
    return res.status(500).json({ error: 'Unable to change password. Please try again later.' });
  }
}

module.exports = {
  getSettings,
  updateGymInfo,
  updateMembershipSettings,
  updatePaymentSettings,
  updateSystemSettings,
  changeAdminPassword,
};
