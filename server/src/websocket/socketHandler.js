// server/src/websocket/socketHandler.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, CLIENT_ORIGIN } = require('../config/env');
const User = require('../models/User');

let io = null;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: CLIENT_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required for WebSocket connection.'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id username email');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid WebSocket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[WebSocket] Client connected: ${socket.user.username} (${socket.id})`);

    // Join user-specific private room
    socket.join(`user:${userId}`);

    // Realtime playback state synchronization across devices
    socket.on('player:sync', (data) => {
      socket.to(`user:${userId}`).emit('player:synced', {
        ...data,
        fromDeviceId: socket.id
      });
    });

    // Client ping for latency measurement
    socket.on('ping:check', (callback) => {
      if (typeof callback === 'function') callback({ serverTime: Date.now() });
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

/**
 * Emit event to a specific user across all their open clients/devices
 */
const emitToUser = (userId, eventName, payload) => {
  if (io) {
    io.to(`user:${userId.toString()}`).emit(eventName, payload);
  }
};

module.exports = { initSocketIO, getIO, emitToUser };
