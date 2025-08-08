const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const {
  requestDeposit,
  getAllDeposits,
  getPendingDeposits,
  updateDepositStatus
} = require('../controllers/depositController');

// User: Request deposit
router.post('/', auth, requestDeposit);

// Admin: Get all deposits
router.get('/', auth, getAllDeposits);

// Admin: Get only pending deposits
router.get('/pending', auth, getPendingDeposits);

// Admin: Approve or reject deposit
router.patch('/:id', auth, updateDepositStatus);

module.exports = router;
