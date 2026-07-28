const Admin = require('../models/Admin');

// Get current admin's profile
async function getProfile(req, res) {
  try {
    const adminId = req.session.adminId;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    return res.json({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      phone: admin.phone || '',
      role: admin.role,
      status: admin.status,
      profilePictureUrl: admin.profilePictureUrl || null,
      createdAt: admin.createdAt,
      lastLogin: admin.lastLogin,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching profile:`, error);
    return res.status(500).json({ error: 'Unable to fetch profile. Please try again later.' });
  }
}

// Update admin profile
async function updateProfile(req, res) {
  try {
    const adminId = req.session.adminId;
    const { name, email, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already in use by another admin
    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
      _id: { $ne: adminId },
    });

    if (existingAdmin) {
      return res.status(409).json({ error: 'This email is already in use.' });
    }

    const updateData = {
      name: name.trim(),
      email: normalizedEmail,
    };

    if (phone) {
      updateData.phone = phone.trim();
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(adminId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    // Update session with new name
    req.session.adminName = updatedAdmin.name;
    req.session.adminEmail = updatedAdmin.email;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
    });

    // Log profile update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'profile_update',
        module: 'admin',
        description: 'Admin updated their profile',
        changes: {
          name: updateData.name,
          email: updateData.email,
          phone: updateData.phone,
        },
        status: 'success',
      });
    }

    return res.json({
      message: 'Profile updated successfully.',
      admin: {
        id: updatedAdmin._id.toString(),
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        phone: updatedAdmin.phone || '',
        role: updatedAdmin.role,
        status: updatedAdmin.status,
        profilePictureUrl: updatedAdmin.profilePictureUrl || null,
        createdAt: updatedAdmin.createdAt,
        lastLogin: updatedAdmin.lastLogin,
      },
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating profile:`, error);
    return res.status(500).json({ error: 'Unable to update profile. Please try again later.' });
  }
}

// Update profile picture URL (for storing image path after upload)
async function updateProfilePicture(req, res) {
  try {
    const adminId = req.session.adminId;
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl || !profilePictureUrl.trim()) {
      return res.status(400).json({ error: 'Profile picture URL is required.' });
    }

    const urlString = profilePictureUrl.trim();
    
    // Basic URL validation
    try {
      new URL(urlString);
    } catch (error) {
      return res.status(400).json({ error: 'Please provide a valid image URL.' });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { profilePictureUrl: urlString },
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    return res.json({
      message: 'Profile picture updated successfully.',
      profilePictureUrl: updatedAdmin.profilePictureUrl,
    });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating profile picture:`, error);
    return res.status(500).json({ error: 'Unable to update profile picture. Please try again later.' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateProfilePicture,
};
