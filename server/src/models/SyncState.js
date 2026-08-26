// server/src/models/SyncState.js
const mongoose = require('mongoose');

const syncedItemSchema = new mongoose.Schema(
  {
    relativePath: { type: String, required: true },
    hash: { type: String, required: true },
    size: { type: Number, default: 0 },
    mtime: { type: Date, default: Date.now },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileItem' },
    isDeleted: { type: Boolean, default: false }
  },
  { _id: false }
);

const syncStateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    deviceType: {
      type: String,
      enum: ['android_backup', 'windows_sync', 'other'],
      required: true
    },
    deviceName: {
      type: String,
      default: 'Unknown Device'
    },
    targetFolder: {
      type: String,
      default: '/Sync'
    },
    lastSyncTime: {
      type: Date,
      default: Date.now
    },
    syncedFiles: [syncedItemSchema]
  },
  { timestamps: true }
);

syncStateSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model('SyncState', syncStateSchema);
