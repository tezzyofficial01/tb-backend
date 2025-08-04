const Bet = require('../models/Bet');
const FakeLeaderboard = require('../models/FakeLeaderboard');
const refreshFakeLeaderboard = require('../utils/refreshFakeLeaderboard');

function maskEmail(email) {
  const [name, domain] = email.split('@');
  const masked = name.slice(0, 2) + '****@' + domain;
  return masked;
}

exports.getWeeklyLeaderboard = async (req, res) => {
  console.time("Leaderboard API"); // 🔍 start timing

  try {
    // ⚡ Fast refresh of fake data
    await refreshFakeLeaderboard();

    // ✅ Aggregate real users + join with email
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

    // ✅ Masked real data
    const realOnly = realData.map(entry => ({
      email: maskEmail(entry.email),
      totalBet: entry.totalBet,
      totalWin: entry.totalWin
    }));

    // ✅ Add fake data if needed
    const remaining = 100 - realOnly.length;
    const fakeData = await FakeLeaderboard.find().limit(remaining);

    const combined = [...realOnly, ...fakeData].sort((a, b) => b.totalWin - a.totalWin);

    res.json({ leaderboard: combined });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }

  console.timeEnd("Leaderboard API"); // 🔍 end timing
};
