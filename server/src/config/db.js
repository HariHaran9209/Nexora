// server/src/config/db.js
const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB at ${MONGO_URI}:`, error.message);
    console.warn(`[Database Warning] Running in offline metadata mode if MongoDB is not accessible. Please ensure MongoDB is started.`);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database Warning] MongoDB disconnected. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[Database] MongoDB reconnected successfully.');
});

module.exports = { connectDB, getIsConnected: () => isConnected };
