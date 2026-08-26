// server/src/models/FileItem.js
const mongoose = require('mongoose');

const audioStreamSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    codec: { type: String, default: '' },
    language: { type: String, default: 'und' },
    title: { type: String, default: '' },
    channels: { type: Number, default: 2 }
  },
  { _id: false }
);

const subtitleStreamSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    codec: { type: String, default: '' },
    language: { type: String, default: 'und' },
    title: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
    isForced: { type: Boolean, default: false },
    format: { type: String, default: 'vtt' }
  },
  { _id: false }
);

const fileItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    // Virtual folder path for Drive organization (e.g., "/Music/Rock")
    virtualPath: { type: String, required: true, default: '/' },
    // Relative path on disk inside STORAGE_ROOT/files/
    storageRelativePath: { type: String, required: true },
    size: { type: Number, required: true, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
    extension: { type: String, default: '' },
    hash: { type: String, default: '', index: true }, // SHA256 checksum
    
    category: {
      type: String,
      enum: ['audio', 'video', 'image', 'document', 'archive', 'other'],
      default: 'other',
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true
    },

    isFavorite: { type: Boolean, default: false, index: true },
    isTrash: { type: Boolean, default: false, index: true },
    tags: [{ type: String }],

    // Metadata for Music Player (Spotify experience)
    musicMeta: {
      title: { type: String, default: '' },
      artist: { type: String, default: 'Unknown Artist' },
      album: { type: String, default: 'Unknown Album' },
      albumArtist: { type: String, default: '' },
      duration: { type: Number, default: 0 }, // in seconds
      trackNo: { type: Number, default: 1 },
      diskNo: { type: Number, default: 1 },
      year: { type: Number, default: null },
      genre: [{ type: String }],
      hasCover: { type: Boolean, default: false },
      coverArtFilename: { type: String, default: null },
      bitrate: { type: Number, default: 0 }
    },

    // Metadata for Video Player (VLC experience)
    videoMeta: {
      duration: { type: Number, default: 0 }, // in seconds
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      codec: { type: String, default: '' },
      bitrate: { type: Number, default: 0 },
      fps: { type: Number, default: 0 },
      hasThumbnail: { type: Boolean, default: false },
      thumbnailFilename: { type: String, default: null },
      audioStreams: [audioStreamSchema],
      subtitleStreams: [subtitleStreamSchema]
    },

    lastPlayedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Compound indexes for fast searching and virtual directory lookups
fileItemSchema.index({ userId: 1, parentFolderId: 1, isTrash: 1 });
fileItemSchema.index({ userId: 1, category: 1, isTrash: 1 });
fileItemSchema.index({ userId: 1, 'musicMeta.artist': 1 });
fileItemSchema.index({ userId: 1, 'musicMeta.album': 1 });
fileItemSchema.index({ name: 'text', 'musicMeta.title': 'text', 'musicMeta.artist': 'text', 'musicMeta.album': 'text' });

module.exports = mongoose.model('FileItem', fileItemSchema);
