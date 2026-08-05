const Announcement = require('../models/Announcement');
const Member = require('../models/Member');

async function listAnnouncements(req, res) {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ['Active', 'Inactive'].includes(status)) {
      filter.status = status;
    } else {
      filter.status = 'Active';
    }

    const announcements = await Announcement.find(filter)
      .populate('publishedBy', 'email')
      .sort({ publishedAt: -1 })
      .lean();

    return res.json(announcements);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error listing announcements:`, error);
    return res.status(500).json({ error: 'Unable to fetch announcements. Please try again later.' });
  }
}

async function createAnnouncement(req, res) {
  try {
    const { title, message, targetAudience, category, priority, status, expiresAt } = req.body;
    const adminId = req.session.adminId;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
    }

    const validAudiences = ['All Members', 'Active Members', 'Expired Members', 'Specific Member'];
    const validCategories = ['General', 'Event', 'Offer', 'Holiday', 'Notice', 'Maintenance'];
    const validPriorities = ['Normal', 'Important', 'Urgent'];
    const validStatuses = ['Active', 'Inactive'];

    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return res.status(400).json({ error: 'Invalid target audience.' });
    }

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority.' });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const announcement = new Announcement({
      title: title.trim(),
      message: message.trim(),
      targetAudience: targetAudience || 'All Members',
      category: category || 'General',
      priority: priority || 'Normal',
      status: status || 'Active',
      publishedBy: adminId,
      publishedAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    const saved = await announcement.save();
    const populated = await saved.populate('publishedBy', 'email');

    // Log announcement creation activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'announcement_created',
        module: 'announcement',
        recordId: saved._id.toString(),
        description: `Announcement "${title}" created`,
        changes: { title, category, priority, targetAudience },
        status: 'success',
      });
    }

    return res.status(201).json(populated);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error creating announcement:`, error);
    return res.status(500).json({ error: 'Unable to create announcement. Please try again later.' });
  }
}

async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { title, message, targetAudience, category, priority, status, expiresAt } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (title.trim().length < 3) {
      return res.status(400).json({ error: 'Title must be at least 3 characters long.' });
    }

    const validAudiences = ['All Members', 'Active Members', 'Expired Members', 'Specific Member'];
    const validCategories = ['General', 'Event', 'Offer', 'Holiday', 'Notice', 'Maintenance'];
    const validPriorities = ['Normal', 'Important', 'Urgent'];
    const validStatuses = ['Active', 'Inactive'];

    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return res.status(400).json({ error: 'Invalid target audience.' });
    }

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority.' });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        message: message.trim(),
        targetAudience: targetAudience || 'All Members',
        category: category || 'General',
        priority: priority || 'Normal',
        status: status || 'Active',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
      { new: true }
    ).populate('publishedBy', 'email');

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Log announcement update activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'announcement_updated',
        module: 'announcement',
        recordId: id,
        description: `Announcement "${title}" updated`,
        changes: { title, category, priority, targetAudience, status },
        status: 'success',
      });
    }

    return res.json(announcement);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error updating announcement:`, error);
    return res.status(500).json({ error: 'Unable to update announcement. Please try again later.' });
  }
}

async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Log announcement deletion activity
    if (req.logActivity) {
      await req.logActivity({
        action: 'announcement_deleted',
        module: 'announcement',
        recordId: id,
        description: `Announcement "${announcement.title}" deleted`,
        status: 'success',
      });
    }

    return res.json({ message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error deleting announcement:`, error);
    return res.status(500).json({ error: 'Unable to delete announcement. Please try again later.' });
  }
}

async function getActiveAnnouncements(req, res) {
  try {
    const today = new Date();
    const announcements = await Announcement.find({
      status: 'Active',
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gte: today } }],
    })
      .populate('publishedBy', 'email')
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();

    return res.json(announcements);
  } catch (error) {
    console.error(`[Admin ${req.session.adminId}] Error fetching active announcements:`, error);
    return res.status(500).json({ error: 'Unable to fetch announcements.' });
  }
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getActiveAnnouncements,
};
