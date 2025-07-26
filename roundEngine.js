// engine.js

const axios = require('axios');
const mongoose = require('mongoose');
const Winner = require('./models/Winner'); // ✅ ensure correct path
require('dotenv').config(); // Required for local

let round = 1;

// 🔰 Step 1: Get latest round from DB
async function getInitialRound() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const latest = await Winner.findOne().sort({ round: -1 });
    round = latest ? latest.round + 1 : 1;
    console.log(`🚀 Engine starting from round ${round}`);
  } catch (err) {
    console.error('❌ DB Connection or Round Fetch Error:', err.message);
    process.exit(1); // stop engine if failed
  }
}

// 🔁 Step 2: Main Engine Loop
function startGameEngine() {
  setInterval(() => {
    console.log(`⏱ ROUND ${round} started`);

    const headers = {
      headers: {
        Authorization: `Bearer ${process.env.ENGINE_JWT}`
      }
    };

    // 🔒 Lock Winner (at 10s)
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/lock-winner', { round }, headers)
        .then(() => console.log(`🔒 Winner locked for round ${round}`))
        .catch(err => console.error('❌ Lock Winner Error:', err.response?.data || err.message));
    }, 10000);

    // 📢 Announce Winner (at 35s)
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/announce-winner', { round }, headers)
        .then(() => console.log(`📢 Winner announced for round ${round}`))
        .catch(err => console.error('❌ Announce Winner Error:', err.response?.data || err.message));
    }, 35000);

    // 💰 Distribute Payouts (at 40s)
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/distribute-payouts', { round }, headers)
        .then(() => console.log(`💰 Payouts done for round ${round}`))
        .catch(err => console.error('❌ Payout Error:', err.response?.data || err.message));

      round += 1; // 🔁 Next Round
    }, 40000);

  }, 40000); // Loop every 40 seconds
}

// 🟢 Step 3: Init and Start
module.exports = async function startSyncedGameEngine() {
  await getInitialRound();
  startGameEngine();
};
