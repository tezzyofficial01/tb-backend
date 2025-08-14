const express = require('express');
const router = express.Router();
const Winner = require('../models/Winner');
const LastWins = require('../models/LastWins');
const Bet = require('../models/Bet');

// ✅ Live public state route
router.get('/', async (req, res) => {
  try {
    // Get last 10 wins
    let lastWinsDoc = await LastWins.findOne();
    let lastWins = lastWinsDoc ? lastWinsDoc.wins.slice(0, 10) : [];

    // Get current bets count & total amount per image
    let currentRound = await Winner.findOne().sort({ round: -1 }).limit(1);
    let roundNumber = currentRound ? currentRound.round + 1 : 1;
    let bets = await Bet.aggregate([
      { $match: { round: roundNumber } },
      { $group: { _id: "$choice", totalAmount: { $sum: "$amount" } } }
    ]);

    // Timer info (optional: if stored in memory or DB)
    // For now send null or from global.timer if exists
    let timer = global.timerValue || null;

    res.json({
      lastWins,
      bets,
      timer
    });
  } catch (err) {
    console.error("Public state error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
