// engine.js

const axios = require('axios');
const mongoose = require('mongoose');
const Winner = require('./models/Winner'); // ✅ Correct path to Winner model
require('dotenv').config(); // ✅ Load .env variables

let round = 1; // Will be updated from DB

// 🔰 STEP 1: Get latest round from DB before engine starts
async function getInitialRound() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const latestWinner = await Winner.findOne().sort({ round: -1 });

    if (latestWinner && latestWinner.round) {
      round = latestWinner.round + 1;
      console.log(`🟢 Last round was ${latestWinner.round}, starting from round ${round}`);
    } else {
      round = 1;
      console.log(`ℹ️ No previous round found. Starting from round 1`);
    }
  } catch (err) {
    console.error('❌ DB Connect / Round Fetch Error:', err.message);
    process.exit(1); // ⛔ Stop engine if DB sync fails
  }
}

// 🔁 STEP 2: Engine Loop that runs every 40 seconds
function startGameEngine() {
  setInterval(() => {
    console.log(`⏱ ROUND ${round} started`);

    const headers = {
      headers: {
        Authorization: `Bearer ${process.env.ENGINE_JWT}`
      }
    };

    // 🔒 LOCK at 10s
    setTimeout(() => {
      axios.post(`${process.env.BACKEND_URL}/api/bets/lock-winner`, { round }, headers)
        .then(() => console.log(`🔒 Winner locked for round ${round}`))
        .catch(err => console.error('❌ Lock Winner Error:', err.response?.data || err.message));
    }, 10000);

    // 📢 ANNOUNCE at 35s
    setTimeout(() => {
      axios.post(`${process.env.BACKEND_URL}/api/bets/announce-winner`, { round }, headers)
        .then(() => console.log(`📢 Winner announced for round ${round}`))
        .catch(err => console.error('❌ Announce Winner Error:', err.response?.data || err.message));
    }, 35000);

    // 💰 PAYOUT at 40s + round++
    setTimeout(() => {
      axios.post(`${process.env.BACKEND_URL}/api/bets/distribute-payouts`, { round }, headers)
        .then(() => console.log(`💰 Payout done for round ${round}`))
        .catch(err => console.error('❌ Payout Error:', err.response?.data || err.message));

      round += 1; // ➕ NEXT ROUND
    }, 40000);

  }, 40000); // 🔁 Repeat every 40 seconds
}

// 🔃 STEP 3: INIT
module.exports = async function startSyncedGameEngine() {
  await getInitialRound();
  startGameEngine();
};
