// controllers/betsController.js
const Bet = require('../models/Bet');
const Winner = require('../models/Winner');
const User = require('../models/User');

// ---- Helpers ----
const ROUND_LEN = 40;              // seconds
const MAX_ROUNDS_PER_DAY = 2160;   // 24*60*60 / 40

function getISTNow() {
  const now = new Date();
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + IST_OFFSET);
}

/**
 * Compute current round (1..2160) and timer remaining (1..40) in IST.
 */
function getRoundAndTimerFromIST() {
  const nowIST = getISTNow();
  const startOfDay = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 0, 0, 0);
  const secondsPassed = Math.floor((nowIST - startOfDay) / 1000);

  // 1..2160
  const roundUncapped = Math.floor(secondsPassed / ROUND_LEN) + 1;
  const round = Math.min(roundUncapped, MAX_ROUNDS_PER_DAY);

  // time remaining in current 40s window
  const timer = ROUND_LEN - (secondsPassed % ROUND_LEN) || ROUND_LEN;

  return { round, timer };
}

// ===================== PUBLIC STATE (Guest) =====================
// Return only public info: round, timer, totals, winnerChoice
async function getPublicState(req, res) {
  try {
    const { round, timer } = getRoundAndTimerFromIST();

    const bets = await Bet.find({ round, status: 'confirmed' }).lean();
    const totals = bets.reduce((acc, b) => {
      acc[b.choice] = (acc[b.choice] || 0) + b.amount;
      return acc;
    }, {});

    const winDoc = await Winner.findOne({ round }).lean();
    const winnerChoice = winDoc ? winDoc.choice : null;

    return res.json({ round, timer, totals, winnerChoice });
  } catch (err) {
    console.error('getPublicState error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ===================== LIVE STATE (Authed) =====================
// Logged-in users ko personal info bhi: userBets, balance
async function getCurrentRound(req, res) {
  try {
    // round from query (optional)
    let round = Number(req.query.round);
    const userId = req.user?.id || req.user?._id;

    const { round: currRound, timer } = getRoundAndTimerFromIST();
    if (!round) round = currRound;

    const bets = await Bet.find({ round, status: 'confirmed' }).lean();

    const totals = bets.reduce((acc, b) => {
      acc[b.choice] = (acc[b.choice] || 0) + b.amount;
      return acc;
    }, {});

    // userBets only if authed
    const userBets = {};
    if (userId) {
      for (const b of bets) {
        if (String(b.user) === String(userId)) {
          userBets[b.choice] = (userBets[b.choice] || 0) + b.amount;
        }
      }
    }

    const winDoc = await Winner.findOne({ round }).lean();
    const winnerChoice = winDoc ? winDoc.choice : null;

    // include balance if authed
    let balance = undefined;
    if (userId) {
      const user = await User.findById(userId).select('balance').lean();
      balance = user?.balance ?? 0;
    }

    return res.json({ round, timer, totals, userBets, winnerChoice, balance });
  } catch (err) {
    console.error('getCurrentRound error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ===================== PLACE BET =====================
async function placeBet(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    const { choice, amount, round } = req.body;
    console.log('[BET]', { userId, round, choice, amount });

    if (!round || typeof round !== 'number' || round < 1 || round > MAX_ROUNDS_PER_DAY) {
      return res.status(400).json({ message: 'Invalid round' });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid bet amount' });
    }

    // Deduct balance atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, balance: { $gte: amount } },
      { $inc: { balance: -amount }, $set: { lastActive: new Date() } },
      { new: true }
    ).lean();
    if (!updatedUser) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const sessionId = Math.floor((round - 1) / MAX_ROUNDS_PER_DAY) + 1;
    const bet = await Bet.create({ user: userId, round, choice, amount, sessionId, status: 'confirmed' });

    global.io?.emit?.('bet-placed', { choice, amount, round });
    return res.status(201).json({ message: 'Bet placed', bet });
  } catch (err) {
    console.error('placeBet error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

// ===================== MY BET HISTORY (TODAY) =====================
async function myBetHistory(req, res) {
  try {
    const userId = req.user.id || req.user._id;
    const nowIST = getISTNow();
    const startOfDay = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 0, 0, 0);
    const endOfDay = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate(), 23, 59, 59);

    const bets = await Bet.find({
      user: userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: 'confirmed'
    }).lean();

    const roundNumbers = [...new Set(bets.map(bet => bet.round))];
    const winners = await Winner.find({ round: { $in: roundNumbers } })
      .select('round choice -_id')
      .lean();

    const roundToWinner = {};
    winners.forEach(w => { roundToWinner[w.round] = w.choice; });

    const roundMap = {};
    bets.forEach(bet => {
      if (!roundMap[bet.round]) {
        roundMap[bet.round] = { round: bet.round, bets: [], winAmount: 0, winner: roundToWinner[bet.round] || null };
      }
      roundMap[bet.round].bets.push({ choice: bet.choice, amount: bet.amount });
      if (bet.win && bet.payout > 0) {
        roundMap[bet.round].winAmount += bet.payout;
      }
    });

    const history = Object.values(roundMap)
      .sort((a, b) => b.round - a.round)
      .map(row => ({
        round: row.round,
        bets: row.bets,
        winner: row.winner,
        winAmount: row.winAmount
      }));

    res.json({ history });
  } catch (err) {
    console.error('myBetHistory error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// ===================== ADMIN: ROUND BETS SUMMARY =====================
async function getRoundBetsSummary(req, res) {
  try {
    const round = Number(req.query.round);
    if (!round) return res.status(400).json({ message: 'Invalid round' });

    const bets = await Bet.find({ round, status: 'confirmed' }).lean();

    const totals = {};
    bets.forEach(b => {
      totals[b.choice] = (totals[b.choice] || 0) + b.amount;
    });

    // ✅ KEY FIX: frontend uses 'spinningtop' (all lowercase)
    const IMAGE_LIST = [
      'umbrella', 'football', 'sun', 'diya', 'cow', 'bucket',
      'kite', 'spinningtop', 'rose', 'butterfly', 'pigeon', 'rabbit'
    ];

    const result = {};
    IMAGE_LIST.forEach(img => {
      result[img] = totals[img] || 0;
    });

    res.json({ round, bets: result });
  } catch (err) {
    console.error('getRoundBetsSummary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  // Public + Live state
  getPublicState,      // NEW (guest)
  getCurrentRound,     // Live-state (authed)
  // Gameplay
  placeBet,
  myBetHistory,
  getRoundBetsSummary
};
