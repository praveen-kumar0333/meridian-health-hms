import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { scope = 'personal' } = req.query;

    let query = { recipient: req.user._id };
    if (req.user.role === 'admin' && scope === 'all') {
      query = {};
    }

    const notifications = await Notification.find(query)
      .populate('recipient', 'name email role')
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    return next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const { recipientId, targetRole, title, message, type = 'general' } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notification title and message are required.',
      });
    }

    let recipients = [];
    if (recipientId) {
      const user = await User.findById(recipientId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Recipient user not found.' });
      }
      recipients = [user._id];
    } else if (targetRole && ['doctor', 'patient', 'all'].includes(targetRole)) {
      const filter =
        targetRole === 'all' ? { isActive: true } : { role: targetRole, isActive: true };
      const users = await User.find(filter).select('_id');
      recipients = users.map((u) => u._id);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please select a recipient or target group (doctor, patient, all).',
      });
    }

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active recipients matched the selected target.',
      });
    }

    const docs = recipients.map((uid) => ({
      recipient: uid,
      sender: req.user._id,
      title: title.trim(),
      message: message.trim(),
      type,
    }));

    const created = await Notification.insertMany(docs);

    return res.status(201).json({
      success: true,
      message: `Notification sent to ${created.length} recipient(s).`,
      count: created.length,
    });
  } catch (error) {
    return next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (
      String(notification.recipient) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    return next(error);
  }
};
