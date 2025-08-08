const Deposit = require('../models/Deposit');
const User = require('../models/User');
const { sendNotification } = require('./notificationController'); // ✅ Notification

// User se deposit request lena
exports.requestDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const deposit = new Deposit({
      user: req.user.id,
      amount
    });
    await deposit.save();

    // Notify admin via socket.io
    global.io.emit('deposit-request', { 
      id: deposit._id, 
      user: { id: user._id, email: user.email }, 
      amount 
    });

    res.status(201).json({ message: 'Deposit request created', deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: saare deposits
exports.getAllDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate('user', 'email balance')
      .sort({ createdAt: -1 });
    res.json({ deposits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Admin: sirf pending deposits (UI me dikhane ke liye)
exports.getPendingDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find({ status: 'pending' })
      .populate('user', 'email balance')
      .sort({ createdAt: -1 });
    res.json({ deposits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: deposit ka status update karna
exports.updateDepositStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' ya 'rejected'
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

    deposit.status = status;
    await deposit.save();

    if (status === 'approved') {
      const user = await User.findById(deposit.user);
      user.balance += deposit.amount;
      await user.save();

      // ✅ Notification to user
      await sendNotification(user._id, `Your deposit of ₹${deposit.amount} has been approved.`);
    }

    if (status === 'rejected') {
      const user = await User.findById(deposit.user);
      await sendNotification(user._id, `Your deposit of ₹${deposit.amount} has been rejected.`);
    }

    global.io.emit('deposit-status-updated', deposit);
    res.json({ message: 'Deposit status updated', deposit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
