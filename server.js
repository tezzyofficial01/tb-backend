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

/* ---------- Config ---------- */
const PORT = process.env.PORT || 5000;

// allow multiple origins via env: ALLOWED_ORIGINS=a.com,b.com,http://localhost:3000
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// support both keys: MONGODB_URI or MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

/* ---------- Security & Core Middlewares ---------- */
app.use(helmet());
app.use(express.json());
app.use(cors({ origin: allowedOrigins, credentials: true }));
// Enable if you need basic abuse control (adjust max as needed)
// app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

/* ---------- Socket.IO ---------- */
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});
global.io = io;

io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('⚠️ Socket disconnected:', socket.id, 'Reason:', reason);
  });
});

/* ---------- Routes ---------- */
const adminRoutes        = require('./routes/admin');
const authRoutes         = require('./routes/auth');
const userRoutes         = require('./routes/users');
const betsRoutes         = require('./routes/bets');
const winnerRoutes       = require('./routes/winner');
const depositRoutes      = require('./routes/depositRoutes');
const withdrawalRoutes   = require('./routes/withdrawalRoutes');
const settingsRoutes     = require('./routes/settings');
const spinRoutes         = require('./routes/spin');
const notificationRoutes = require('./routes/notificationRoutes');
const leaderboardRoutes  = require('./routes/leaderboardRoutes');

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/bets',          betsRoutes);
app.use('/api/winner',        winnerRoutes);
app.use('/api/deposits',      depositRoutes);
app.use('/api/withdrawals',   withdrawalRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/settings',      settingsRoutes);
app.use('/api/spin',          spinRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);

/* ---------- Health ---------- */
app.get('/', (_req, res) => res.send('Server is up and running!'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ---------- MongoDB Connect ---------- */
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI / MONGODB_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

/* ---------- 404 & Error Handler (last) ---------- */
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

/* ---------- Start Server ---------- */
server.listen(PORT, () => console.log(`🚀 Server listening on port ${PORT}`));

/* ---------- Graceful shutdown ---------- */
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await mongoose.connection.close().catch(() => {});
  server.close(() => process.exit(0));
});
