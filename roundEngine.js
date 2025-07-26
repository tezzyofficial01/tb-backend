const axios = require('axios');
let round = 1;

function startGameEngine() {
  setInterval(async () => {
    console.log(`⏱ ROUND ${round} started`);

    // 10s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/lock-winner', { round });
    }, 10000);

    // 35s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/announce-winner', { round });
    }, 35000);

    // 40s
    setTimeout(() => {
      axios.post('https://tb-backend-tnab.onrender.com/api/bets/distribute-payouts', { round });
      round += 1;
    }, 40000);
  }, 40000);
}

module.exports = startGameEngine;
