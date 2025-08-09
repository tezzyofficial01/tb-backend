// controllers/winnerController.js
const Bet = require('../models/Bet');
const Winner = require('../models/Winner');
const User = require('../models/User');
const LastWins = require('../models/LastWins');

/**
 * ATOMIC Last 10 wins updater
 * - same round ko drop karke latest ko top par add karta hai
 * - list ko max 10 par slice karta hai
 * - single update pipeline (race-condition safe)
 * NOTE: Requires MongoDB 4.2+ (Atlas OK). If your driver is too old, tell me—I’ll give fallback.
 */
async function addLastWin(choice, round) {
  await LastWins.updateOne(
    {}, // single doc collection
    [
      {
        $set: {
          wins: {
            $slice: [
              {
                $concatArrays: [
                  [{ round: round, choice: choice }],
                  {
                    $filter: {
                      input: { $ifNull: ['$wins', []] },
                      as: 'w',
                      cond: { $ne: ['$$w.round', round] } // drop old same-round
                    }
                  }
                ]
              },
              10
            ]
          }
        }
      }
    ],
    { upsert: true }
  );
}

// ========== Public: Get Last 10 Wins ==========
async function getLastWinsController(req, res) {
  try {
    const doc = await LastWins.findOne().lean();
    if (doc?.wins?.length) return res.json({ wins: doc.wins });

    // Fallback (agar lastwins empty ho)
    const rows = await Winner.find({ choice: { $exists: true } })
      .sort({ round: -1 })
      .limit(10)
      .select('round choice -_id')
      .lean();
    return res.json({ wins: rows });
  } catch (err) {
    console.error('[LASTWINS_GET_ERROR]', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ========== Admin sets manual winner ==========
async function setManualWinner(req, res) {
  try {
    const { choice, round } = req.body;
    if (!round || typeof round !== 'number' || round < 1 || round > 2160) {
      return res.status(400).json({ message: 'Invalid round' });
    }

    await Winner.findOneAndUpdate(
      { round },
      { choice, createdAt: new Date(), paid: false },
      { upsert: true, new: true }
    );

    // Keep last-10 in sync immediately
    await addLastWin(choice, round);

    return res.json({ message: 'Winner recorded (awaiting payout)', choice });
  } catch (err) {
    console.error('[SET_MANUAL_WINNER_ERROR]', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ========== Lock Winner (Auto, at -10s) ==========
async function lockWinner(req, res) {
  try {
    const { round } = req.body;
    console.log('[LOCK_WINNER]', { round, time: Date.now() });

    if (!round || typeof round !== 'number' || round < 1 || round > 2160) {
      return res.status(400).json({ message: 'Invalid round' });
    }

    let winDoc = await Winner.findOne({ round });
    if (winDoc?.choice) {
      // Ensure lastwins also has it
      await addLastWin(winDoc.choice, round);
      return res.json({ alreadyLocked: true, choice: winDoc.choice });
    }

    const bets = await Bet.find({ round, status: 'confirmed' });
    const IMAGE_LIST = [
      'umbrella','football','sun','diya','cow','bucket',
      'kite','spinningTop','rose','butterfly','pigeon','rabbit'
    ];

    let choice;
    if (!bets.length) {
      choice = IMAGE_LIST[Math.floor(Math.random() * IMAGE_LIST.length)];
    } else {
      const totals = {};
      for (const b of bets) totals[b.choice] = (totals[b.choice] || 0) + b.amount;
      const minAmount = Math.min(...Object.values(totals));
      const lowestChoices = Object.entries(totals)
        .filter(([_, amt]) => amt === minAmount)
        .map(([name]) => name);
      choice = lowestChoices[Math.floor(Math.random() * lowestChoices.length)];
    }

    await Winner.findOneAndUpdate(
      { round },
      { choice, createdAt: new Date(), paid: false },
      { upsert: true, new: true }
    );

    // sync last-10
    await addLastWin(choice, round);

    return res.json({ locked: true, choice });
  } catch (err) {
    console.error('[LOCK_WINNER_ERROR]', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ========== Announce Winner + Trigger Payout ==========
async function announceWinner(req, res) {
  try {
    const { round } = req.body;
    if (!round || typeof round !== 'number' || round < 1 || round > 2160) {
      return res.status(400).json({ message: 'Invalid round' });
    }

    let winDoc = await Winner.findOne({ round });
    let choice = winDoc?.choice || null;

    const IMAGE_LIST = [
      'umbrella','football','sun','diya','cow','bucket',
      'kite','spinningTop','rose','butterfly','pigeon','rabbit'
    ];

    if (!choice) {
      const bets = await Bet.find({ round, status: 'confirmed' });
      if (!bets.length) {
        choice = IMAGE_LIST[Math.floor(Math.random() * IMAGE_LIST.length)];
      } else {
        const totals = {};
        for (const b of bets) totals[b.choice] = (totals[b.choice] || 0) + b.amount;
        const minAmount = Math.min(...Object.values(totals));
        const lowestChoices = Object.entries(totals)
          .filter(([_, amt]) => amt === minAmount)
          .map(([name]) => name);
        choice = lowestChoices[Math.floor(Math.random() * lowestChoices.length)];
      }

      await Winner.findOneAndUpdate(
        { round },
        { choice, createdAt: new Date(), paid: false },
        { upsert: true, new: true }
      );
    }

    // last-10 update (idempotent)
    await addLastWin(choice, round);

    // notify clients
    global.io.emit('winner-announced', { round, choice });

    // payout after 1s
    setTimeout(() => {
      distributePayouts(
        { body: { round } },
        { json: () => {}, status: () => ({ json: () => {} }) }
      );
    }, 1000);

    return res.json({ message: 'Winner announced', round, choice });
  } catch (err) {
    console.error('[ANNOUNCE_ERROR]', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ========== Payout Logic ==========
async function distributePayouts(req, res) {
  try {
    const { round } = req.body;
    if (!round || typeof round !== 'number' || round < 1 || round > 2160) {
      return res.status(400).json({ message: 'Invalid round' });
    }

    let winDoc = await Winner.findOneAndUpdate(
      { round, paid: false },
      { paid: true },
      { new: true }
    );
    if (!winDoc) {
      return res.status(400).json({ message: 'Payout already done for this round' });
    }

    let choice = winDoc.choice;
    const IMAGE_LIST = [
      'umbrella','football','sun','diya','cow','bucket',
      'kite','spinningTop','rose','butterfly','pigeon','rabbit'
    ];

    if (!choice) {
      const bets = await Bet.find({ round, status: 'confirmed' });
      if (!bets.length) {
        choice = IMAGE_LIST[Math.floor(Math.random() * IMAGE_LIST.length)];
      } else {
        const totals = {};
        for (const b of bets) totals[b.choice] = (totals[b.choice] || 0) + b.amount;
        const minAmount = Math.min(...Object.values(totals));
        const lowestChoices = Object.entries(totals)
          .filter(([_, amt]) => amt === minAmount)
          .map(([name]) => name);
        choice = lowestChoices[Math.floor(Math.random() * lowestChoices.length)];
      }
      await Winner.findOneAndUpdate({ round }, { choice }, { new: true });
    }

    // ensure last-10 has the final choice
    await addLastWin(choice, round);

    const allBets = await Bet.find({ round, status: 'confirmed' });
    const winningBets = allBets.filter(b => b.choice === choice);

    // aggregate winning amounts per user
    const userTotalBets = {};
    for (const bet of winningBets) {
      const uid = String(bet.user);
      userTotalBets[uid] = (userTotalBets[uid] || 0) + bet.amount;
    }

    // credit payouts (10x)
    for (const userId of Object.keys(userTotalBets)) {
      const payout = userTotalBets[userId] * 10;
      await User.findByIdAndUpdate(userId, { $inc: { balance: payout } });
    }

    // mark bet results
    for (const bet of winningBets) {
      bet.payout = bet.amount * 10;
      bet.win = true;
      await bet.save();
    }
    for (const bet of allBets) {
      if (bet.choice !== choice) {
        bet.payout = 0;
        bet.win = false;
        await bet.save();
      }
    }

    global.io.emit('winner-announced', { round, choice });
    global.io.emit('payouts-distributed', { round, choice });
    return res.json({ message: 'Payouts distributed', round, choice });
  } catch (err) {
    console.error('[PAYOUT_ERROR]', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// ========== Exports ==========
module.exports = {
  setManualWinner,
  lockWinner,
  announceWinner,
  distributePayouts,
  getLastWins: getLastWinsController
};
