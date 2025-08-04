const Notification = require('../models/Notification');

exports.sendNotification = async (userId, type, amount) => {
  const capitalType = type.charAt(0).toUpperCase() + type.slice(1);
  const message = `${capitalType} of ₹${amount} approved.`;

  await Notification.create({
    userId,
    type,
    amount,
    message
  });
};
