const mongoose = require('mongoose');

const fakeLeaderboardSchema = new mongoose.Schema({
  email: String,        // already masked like 'ra****@gmail.com'
  totalBet: Number,
  totalWin: Number
});

module.exports = mongoose.model('FakeLeaderboard', fakeLeaderboardSchema);
