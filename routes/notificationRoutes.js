const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.get('/notifications/:userId', async (req, res) => {
  const { userId } = req.params;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(5);
  res.json({ notifications });
});

module.exports = router;
