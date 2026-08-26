// server/src/models/PlayProgress.js
const mongoose = require('mongoose');

const playProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileItem',
      required: true,
      index: true
    },
    positionSeconds: {
      type: Number,
      required: true,
      default: 0
    },
    durationSeconds: {
      type: Number,
      required: true,
      default: 0
    },
    audioTrackIndex: {
      type: Number,
      default: 0
    },
    subtitleTrackIndex: {
      type: Number,
      default: -1 // -1 = off
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

playProgressSchema.index({ userId: 1, fileId: 1 }, { unique: true });

module.exports = mongoose.model('PlayProgress', playProgressSchema);
