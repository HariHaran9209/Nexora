// server/src/server.js
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initSocketIO } = require('./websocket/socketHandler');
const { PORT, HOST, STORAGE_ROOT } = require('./config/env');
const storageService = require('./services/storageService');

const server = http.createServer(app);

// Initialize Socket.io
initSocketIO(server);

// Start server after ensuring storage directories and connecting to DB
const startServer = async () => {
  try {
    storageService.ensureDirectories();
    console.log(`[Storage] Root storage initialized at: ${STORAGE_ROOT}`);

    await connectDB();

    server.listen(PORT, HOST, () => {
      console.log('====================================================');
      console.log(`  🚀 Nexora Server running on http://${HOST}:${PORT}`);
      console.log(`  📂 Storage Directory: ${STORAGE_ROOT}`);
      console.log(`  🎵 Spotify Music API: http://${HOST}:${PORT}/api/music`);
      console.log(`  🎬 VLC Video API:    http://${HOST}:${PORT}/api/video`);
      console.log(`  📁 Drive File API:   http://${HOST}:${PORT}/api/files`);
      console.log(`  🔄 Sync API:         http://${HOST}:${PORT}/api/sync`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed.');
    process.exit(0);
  });
});
