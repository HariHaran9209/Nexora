// server/src/models/Folder.js
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    virtualPath: {
      type: String,
      required: true,
      default: '/'
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isTrash: {
      type: Boolean,
      default: false,
      index: true
    },
    color: {
      type: String,
      default: '#3b82f6' // Default folder badge color
    }
  },
  { timestamps: true }
);

folderSchema.index({ userId: 1, parentFolderId: 1, isTrash: 1 });
folderSchema.index({ userId: 1, virtualPath: 1 });

module.exports = mongoose.model('Folder', folderSchema);
