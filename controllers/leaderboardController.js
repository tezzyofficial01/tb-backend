const Bet = require('../models/Bet');
const FakeLeaderboard = require('../models/FakeLeaderboard');
const refreshFakeLeaderboard = require('../utils/refreshFakeLeaderboard');

function maskEmail(email) {
  const [name, domain] = email.split('@');
  const masked = name.slice(0, 2) + '****@' + domain;
  return masked;
}

exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    // 👇 Refresh fake data on each load
    await refreshFakeLeaderboard();

    // ✅ Aggregate real user data + join with User email in one query
    const realData = await Bet.aggregate([
      {
        $group: {
          _id: '$userId',
          totalBet: { $sum: '$amount' },
          totalWin: { $sum: '$wonAmount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          email: '$user.email',
          totalBet: 1,
          totalWin: 1
        }
      },
      { $sort: { totalWin: -1 } },
      { $limit: 100 }
    ]);

    // ✅ Format with masked emails
    const realOnly = realData.map(entry => ({
      email: maskEmail(entry.email),
      totalBet: entry.totalBet,
      totalWin: entry.totalWin
    }));

    // ✅ Load fake data if less than 100
    const remaining = 100 - realOnly.length;
    const fakeData = await FakeLeaderboard.find().limit(remaining);

    // ✅ Combine and sort final result
    const combined = [...realOnly, ...fakeData].sort((a, b) => b.totalWin - a.totalWin);

    res.json({ leaderboard: combined });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
