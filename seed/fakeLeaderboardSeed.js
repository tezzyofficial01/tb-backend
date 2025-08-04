const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FakeLeaderboard = require('../models/FakeLeaderboard');

dotenv.config();
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const generateFakeEmail = () => {
  const names = ['king', 'raju', 'rocky', 'sandy', 'guru', 'max', 'amit', 'shiva', 'raj', 'ninja'];
  const domains = ['gmail.com', 'yahoo.com', 'mail.com', 'outlook.com'];
  const name = names[Math.floor(Math.random() * names.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return name.slice(0, 2) + '****@' + domain;
};

const seedFakeLeaderboard = async () => {
  try {
    await FakeLeaderboard.deleteMany();

    const fakeEntries = [];

    for (let i = 0; i < 100; i++) {
      fakeEntries.push({
        email: generateFakeEmail(),
        totalBet: Math.floor(Math.random() * 30000) + 1000,
        totalWin: Math.floor(Math.random() * 50000) + 2000
      });
    }

    await FakeLeaderboard.insertMany(fakeEntries);
    console.log('✅ Fake leaderboard seeded!');
    process.exit();
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedFakeLeaderboard();
