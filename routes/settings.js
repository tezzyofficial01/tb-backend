// routes/settings.js

const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const auth = require('../middlewares/authMiddleware'); // lagana hai to lagao
const { getUPIID, updateUPIID } = require('../controllers/settingController');

// 1️⃣ GET ALL SETTINGS (for both depositWhatsapp and withdrawWhatsapp)
router.get('/', async (req, res) => {
  try {
    const setting = await Setting.findOne();
    res.json({
      depositWhatsapp: setting?.depositWhatsapp || '',
      withdrawWhatsapp: setting?.withdrawWhatsapp || '',
      upiId: setting?.upiId || ''   // ✅ Return UPI ID also here (for dashboard/admin)
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 2️⃣ UPDATE SETTINGS (depositWhatsapp / withdrawWhatsapp) [admin only]
router.put('/', auth, async (req, res) => {
  try {
    const { depositWhatsapp, withdrawWhatsapp } = req.body;
    let setting = await Setting.findOne();
    if (!setting) setting = new Setting();
    if (depositWhatsapp !== undefined) setting.depositWhatsapp = depositWhatsapp;
    if (withdrawWhatsapp !== undefined) setting.withdrawWhatsapp = withdrawWhatsapp;
    await setting.save();
    res.json({
      depositWhatsapp: setting.depositWhatsapp,
      withdrawWhatsapp: setting.withdrawWhatsapp,
      upiId: setting.upiId || ""
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// 3️⃣ GET UPI ID ONLY (for deposit QR etc)
router.get('/upi', getUPIID);

// 4️⃣ UPDATE UPI ID (admin only, for UPI ID update page)
router.post('/upi', auth, updateUPIID);

module.exports = router;
