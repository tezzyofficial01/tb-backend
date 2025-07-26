const axios = require('axios');

let round = 1;

function startGameEngine() {
  setInterval(async () => {
    console.log(`⏱ ROUND ${round} started`);

    // Send headers with Authorization token
    const headers = {
      headers: {
        Authorization: `Bearer ${process.env.ENGINE_API_KEY}`
      }
    };

    // 10s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/lock-winner', { round }, headers);
    }, 10000);

    // 35s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/announce-winner', { round }, headers);
    }, 35000);

    // 40s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/distribute-payouts', { round }, headers);
      round += 1;
    }, 40000);
  }, 40000);
}

module.exports = startGameEngine;
