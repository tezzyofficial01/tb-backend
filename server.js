// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ Safe origin handling
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

global.io = io;

// ✅ Route imports
const adminRoutes      = require('./routes/admin');
const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const betsRoutes       = require('./routes/bets');
const winnerRoutes     = require('./routes/winner');
const depositRoutes    = require('./routes/depositRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const settingsRoutes   = require('./routes/settings');
const spinRoutes       = require('./routes/spin');
const notificationRoutes = require('./routes/notificationRoutes');



// ✅ Middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
// app.use(rateLimit({ windowMs: 60 * 1000, max: 100 })); // Enable for abuse prevention

// ✅ Route Mounting
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/bets',        betsRoutes);
app.use('/api/winner',      winnerRoutes);
app.use('/api/deposits',    depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/settings',    settingsRoutes);
app.use('/api/spin',        spinRoutes);
app.use('/api/notifications', notificationRoutes);


// ✅ MongoDB Connect
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

// ✅ Socket.IO connection
io.on('connection', (socket) => {
  console.log('🟢 Client connected (socket.id):', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('⚠️ Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// ✅ Health Check
app.get('/', (req, res) => res.send('Server is up and running!'));

// ✅ Auto-Engine Start (sync se)
// const startGameEngine = require('./roundEngine');
// startGameEngine();

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));
