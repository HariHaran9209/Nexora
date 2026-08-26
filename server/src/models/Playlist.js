// server/src/models/Playlist.js
const mongoose = require('mongoose');

const playlistItemSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileItem',
      required: true
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    coverUrl: {
      type: String,
      default: null
    },
    tracks: [playlistItemSchema]
  },
  { timestamps: true }
);

playlistSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Playlist', playlistSchema);
