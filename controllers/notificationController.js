// controllers/notificationController.js
const Notification = require('../models/Notification');

exports.getNotificationsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const trimmedUserId = userId.trim();  // ✅ remove \n or spaces
    const notifications = await Notification.find({ userId: trimmedUserId }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};
