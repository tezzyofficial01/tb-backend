const axios = require('axios');
const mongoose = require('mongoose');
const Winner = require('./models/Winner');
require('dotenv').config();

let round = 1;

// ✅ STEP 1: Connect to DB and get last round
async function getInitialRound() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const latestWinner = await Winner.findOne().sort({ round: -1 });
    round = latestWinner ? latestWinner.round + 1 : 1;

    console.log(`🚀 Starting from round ${round}`);
  } catch (err) {
    console.error('❌ DB Connect Error:', err.message);
    process.exit(1);
  }
}

// ✅ STEP 2: One round loop with delay chaining
async function runOneRound() {
  console.log(`⏱️ ROUND ${round} started`);

  const headers = {
    headers: {
      Authorization: `Bearer ${process.env.ENGINE_JWT}`,
    },
  };

  const BASE_URL = "https://tb-backend-tnab.onrender.com";

  // 🔒 LOCK WINNER after 10 sec
  await new Promise(resolve => setTimeout(resolve, 10000));
  try {
    await axios.post(`${BASE_URL}/api/bets/lock-winner`, { round }, headers);
    console.log(`🔒 Winner locked for round ${round}`);
  } catch (err) {
    console.error('❌ Lock Winner Error:', err.response?.data || err.message);
  }

  // 📢 ANNOUNCE WINNER after 25 sec (total 35s)
  await new Promise(resolve => setTimeout(resolve, 25000));
  try {
    await axios.post(`${BASE_URL}/api/bets/announce-winner`, { round }, headers);
    console.log(`📢 Winner announced for round ${round}`);
  } catch (err) {
    console.error('❌ Announce Winner Error:', err.response?.data || err.message);
  }

  // 💰 PAYOUT after 5 sec (total 40s)
  await new Promise(resolve => setTimeout(resolve, 5000));
  try {
    await axios.post(`${BASE_URL}/api/bets/distribute-payouts`, { round }, headers);
    console.log(`💰 Payout done for round ${round}`);
  } catch (err) {
    console.error('❌ Payout Error:', err.response?.data || err.message);
  }

  round += 1;

  // 🔁 Call next round
  runOneRound();
}

// ✅ STEP 3: Start Engine
module.exports = async function startSyncedGameEngine() {
  await getInitialRound();
  runOneRound(); // Start first round
};
