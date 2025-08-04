const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const FakeLeaderboard = require('../models/FakeLeaderboard');

// ✅ GET /api/leaderboard/weekly
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);

// ✅ TEMPORARY: Seed fake data
router.get('/seed-fake-data', async (req, res) => {
  try {
    await FakeLeaderboard.deleteMany();

    const names = ['king', 'raju', 'rocky', 'guru', 'max', 'amit', 'raj', 'ninja', 'shiva', 'deep'];
    const domains = ['gmail.com', 'yahoo.com', 'mail.com'];

    const generateEmail = () => {
      const name = names[Math.floor(Math.random() * names.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return name.slice(0, 2) + '****@' + domain;
    };

    const fakeData = [];
    for (let i = 0; i < 100; i++) {
      fakeData.push({
        email: generateEmail(),
        totalBet: Math.floor(Math.random() * 20000 + 1000),
        totalWin: Math.floor(Math.random() * 40000 + 2000)
      });
    }

    await FakeLeaderboard.insertMany(fakeData);
    res.send('✅ Fake leaderboard data seeded!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    res.status(500).send('❌ Seeding failed: ' + err.message);
  }
});

module.exports = router;
