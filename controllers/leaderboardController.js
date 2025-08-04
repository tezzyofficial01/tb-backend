const Bet = require('../models/Bet');
const User = require('../models/User');
const FakeLeaderboard = require('../models/FakeLeaderboard');
const refreshFakeLeaderboard = require('../utils/refreshFakeLeaderboard'); // 👈 added

function maskEmail(email) {
  const [name, domain] = email.split('@');
  const masked = name.slice(0, 2) + '****@' + domain;
  return masked;
}

exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    // 👇 Every time user loads leaderboard, refresh fake data
    await refreshFakeLeaderboard();

    // Get real user leaderboard from bets
    const realData = await Bet.aggregate([
      {
        $group: {
          _id: '$userId',
          totalBet: { $sum: '$amount' },
          totalWin: { $sum: '$wonAmount' }
        }
      },
      { $sort: { totalWin: -1 } },
      { $limit: 100 }
    ]);

    // Add masked email to each
    const formattedReal = await Promise.all(
      realData.map(async (entry) => {
        const user = await User.findById(entry._id);
        if (!user || !user.email) return null;
        return {
          email: maskEmail(user.email),
          totalBet: entry.totalBet,
          totalWin: entry.totalWin
        };
      })
    );

    const realOnly = formattedReal.filter(Boolean);

    // Load fake data if less than 100
    const remaining = 100 - realOnly.length;
    const fakeData = await FakeLeaderboard.find().limit(remaining);

    // Merge and sort by totalWin
    const combined = [...realOnly, ...fakeData].sort((a, b) => b.totalWin - a.totalWin);

    res.json({ leaderboard: combined });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
