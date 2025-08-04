const FakeLeaderboard = require('../models/FakeLeaderboard');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function refreshFakeLeaderboard() {
  try {
    const allFake = await FakeLeaderboard.find({});
    for (const entry of allFake) {
      const betChange = getRandomInt(-1000, 1500);
      const winChange = getRandomInt(-800, 2000);
      entry.totalBet = Math.max(entry.totalBet + betChange, 1000);
      entry.totalWin = Math.max(entry.totalWin + winChange, 2000);
      await entry.save();
    }
    console.log("✅ Fake leaderboard refreshed!");
  } catch (err) {
    console.error("❌ Error refreshing leaderboard:", err.message);
  }
}

module.exports = refreshFakeLeaderboard;
