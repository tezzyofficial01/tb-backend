const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// GET /api/leaderboard/weekly
router.get('/weekly', leaderboardController.getWeeklyLeaderboard);

module.exports = router;
