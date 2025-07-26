const axios = require('axios');
require('dotenv').config(); // only required if running locally

let round = 1;

function startGameEngine() {
  setInterval(async () => {
    console.log(`⏱ ROUND ${round} started`);

    // Set Authorization Header using ENGINE_JWT
    const headers = {
      headers: {
        Authorization: `Bearer ${process.env.ENGINE_JWT}`
      }
    };

    // Lock Winner at 10s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/lock-winner', { round }, headers)
        .then(res => console.log(`🔒 Winner locked for round ${round}`))
        .catch(err => console.error('❌ Lock Winner Error:', err.response?.data || err.message));
    }, 10000);

    // Announce Winner at 35s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/announce-winner', { round }, headers)
        .then(res => console.log(`📢 Winner announced for round ${round}`))
        .catch(err => console.error('❌ Announce Winner Error:', err.response?.data || err.message));
    }, 35000);

    // Distribute Payouts at 40s and increment round
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/distribute-payouts', { round }, headers)
        .then(res => console.log(`💰 Payouts done for round ${round}`))
        .catch(err => console.error('❌ Payout Error:', err.response?.data || err.message));

      round += 1;
    }, 40000);

  }, 40000); // Repeat every 40s
}

module.exports = startGameEngine;
