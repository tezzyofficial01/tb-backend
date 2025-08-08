const Setting = require('../models/Setting');

// Get current UPI ID (for deposit page)
exports.getUPIID = async (req, res) => {
  try {
    const setting = await Setting.findOne();
    res.json({ upiId: setting?.upiId || "" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Update UPI ID (admin only)
exports.updateUPIID = async (req, res) => {
  const { upiId } = req.body;
  try {
    let setting = await Setting.findOne();
    if (!setting) setting = new Setting();
    if (upiId !== undefined) setting.upiId = upiId;
    await setting.save();
    res.json({ upiId: setting.upiId, message: "UPI ID updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
