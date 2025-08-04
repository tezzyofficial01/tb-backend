const FakeLeaderboard = require('../models/FakeLeaderboard');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function refreshFakeLeaderboard() {
  try {
    const allFake = await FakeLeaderboard.find({});

    const bulkOps = allFake.map(entry => {
      const betChange = getRandomInt(-1000, 1500);
      const winChange = getRandomInt(-800, 2000);
      return {
        updateOne: {
          filter: { _id: entry._id },
          update: {
            $set: {
              totalBet: Math.max(entry.totalBet + betChange, 1000),
              totalWin: Math.max(entry.totalWin + winChange, 2000)
            }
          }
        }
      };
    });

    if (bulkOps.length > 0) {
      await FakeLeaderboard.bulkWrite(bulkOps);
      console.log("✅ Fake leaderboard refreshed (bulk update)");
    }
  } catch (err) {
    console.error("❌ Error refreshing leaderboard:", err.message);
  }
}

module.exports = refreshFakeLeaderboard;
