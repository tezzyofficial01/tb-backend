// controllers/notificationController.js

const Notification = require('../models/Notification');

// ✅ Notification CREATE function (use in adminController)
async function sendNotification(userId, type, amount) {
  try {
    await Notification.create({
      userId,
      type,
      amount,
      message: `Your ${type === 'deposit' ? 'deposit' : 'withdrawal'} of ₹${amount} is successful.`,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    // yaha res nahi bhejna, kyunki ye ek utility hai
  }
}

// ✅ Notification FETCH function (for frontend)
async function getNotificationsByUser(req, res) {
  const { userId } = req.params;
  try {
    const trimmedUserId = userId.trim();
    const notifications = await Notification.find({ userId: trimmedUserId }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
}

// ✅ Export karo dono functions ko
module.exports = {
  sendNotification,
  getNotificationsByUser
};
