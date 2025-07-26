// roundEngine.js
const axios = require('axios');

let round = 1;

function startGameEngine() {
  setInterval(async () => {
    try {
      console.log(`⏱ ROUND ${round} started`);

      // 10s - lock winner
      setTimeout(() => {
        axios.post('http://localhost:5000/bets/lock-winner', { round });
      }, 10000);

      // 35s - announce winner
      setTimeout(() => {
        axios.post('http://localhost:5000/bets/announce-winner', { round });
      }, 35000);

      // 40s - payout + move to next round
      setTimeout(() => {
        axios.post('http://localhost:5000/bets/distribute-payouts', { round });
        round += 1;
      }, 40000);

    } catch (err) {
      console.error('⛔ Engine error:', err.message);
    }
  }, 40000); // new round every 40 sec
}

module.exports = startGameEngine;
