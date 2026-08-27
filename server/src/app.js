// server/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const uploadRoutes = require('./routes/upload');
const streamRoutes = require('./routes/stream');
const musicRoutes = require('./routes/music');
const videoRoutes = require('./routes/video');
const syncRoutes = require('./routes/sync');
const systemRoutes = require('./routes/system');
const errorHandler = require('./middlewares/errorHandler');
const { CLIENT_ORIGIN } = require('./config/env');

const app = express();

// Trust reverse proxy (Caddy / Tailscale)
app.set('trust proxy', 1);

// Enable CORS for web, mobile, and desktop clients
app.use(
  cors({
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

// Rate limiter for standard API endpoints to protect the Arch Linux CPU
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// JSON and URL-encoded body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiter to /api (exempting media sync stream endpoints)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/sync')) {
    return next();
  }
  return limiter(req, res, next);
});

// Root health check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Nexora Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/system', systemRoutes);

// Serve pre-built React frontend if dist exists
const fs = require('fs-extra');
const distPath = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

module.exports = app;
