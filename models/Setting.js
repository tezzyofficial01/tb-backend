const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  depositWhatsapp: { type: String, default: "" },
  withdrawWhatsapp: { type: String, default: "" },
  upiId: { type: String, default: "" },   // ✅ Add this line
});

module.exports = mongoose.model('Setting', SettingSchema);
