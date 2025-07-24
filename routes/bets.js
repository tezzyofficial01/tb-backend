const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');

// 🟢 Import from betsController
const {
  getCurrentRound,
  placeBet,
  myBetHistory,
  getRoundBetsSummary,
} = require('../controllers/betsController');

// 🟢 Import from winnerController
const {
  setManualWinner,
  lockWinner,
  announceWinner,
  distributePayouts,
  getLastWins,
} = require('../controllers/winnerController');

// 1️⃣ Current round details
router.get('/current-round', getCurrentRound);

// 2️⃣ LIVE STATE ROUTE (for game frontend)
router.get('/live-state', auth, async (req, res) => {
  try {
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    const startOfDay = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 0, 0, 0);
    const secondsPassed = Math.floor((nowIST - startOfDay) / 1000);
    const round = Math.min(Math.floor(secondsPassed / 40) + 1, 2160);
    const currentRoundStart = startOfDay.getTime() + ((round - 1) * 40 * 1000);
    const currentRoundEnd = currentRoundStart + (40 * 1000);
    const timer = Math.max(0, Math.floor((currentRoundEnd - nowIST.getTime()) / 1000));

    const Bet = require('../models/Bet');
    const bets = await Bet.find({ round });

    const totals = bets.reduce((acc, b) => {
      acc[b.choice] = (acc[b.choice] || 0) + b.amount;
      return acc;
    }, {});

    const userBets = {};
    if (req.user) {
      const userId = req.user.id || req.user._id;
      bets.forEach(b => {
        if (String(b.user) === String(userId)) {
          userBets[b.choice] = (userBets[b.choice] || 0) + b.amount;
        }
      });
    }

    const Winner = require('../models/Winner');
    const winDoc = await Winner.findOne({ round });
    const winnerChoice = winDoc ? winDoc.choice : null;

    let balance = null;
    try {
      if (req.user) {
        const User = require('../models/User');
        const user = await User.findById(req.user.id || req.user._id);
        balance = user ? user.balance : null;
      }
    } catch {}

    res.json({
      round,
      timer,
      totals,
      userBets,
      winnerChoice,
      balance,
    });
  } catch (e) {
    console.error('Error in /live-state:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3️⃣ Place bet
router.post('/place-bet', auth, placeBet);

// 4️⃣ Set manual winner (admin panel)
router.post('/set-winner', auth, setManualWinner);

// 5️⃣ Lock winner (timer 10 pe, auto ya admin)
router.post('/lock-winner', auth, lockWinner);

// 6️⃣ Announce winner (timer 5 pe, payout nahi)
router.post('/announce-winner', auth, announceWinner);

// 7️⃣ Distribute payouts (auto/manual at round end)
router.post('/distribute-payouts', auth, distributePayouts);

// 8️⃣ Last 10 wins
router.get('/last-wins', getLastWins);

// 9️⃣ My bet history (today's)
router.get('/my-bet-history', auth, myBetHistory);

// 🔟 Round-wise bet summary (admin panel manual winner me show karne ke liye)
router.get('/round-bets-summary', auth, getRoundBetsSummary);

module.exports = router;
