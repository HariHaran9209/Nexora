// server/src/routes/system.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const Folder = require('../models/Folder');
const Playlist = require('../models/Playlist');
const { getDiskUsage } = require('../utils/diskUsage');

router.use(authMiddleware);

/**
 * GET /api/system/storage
 * 500GB HDD Storage meter & category breakdown
 */
router.get('/storage', async (req, res, next) => {
  try {
    const diskInfo = await getDiskUsage();

    // Aggregate category usage in MongoDB
    const categoryStats = await FileItem.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), isTrash: false } },
      {
        $group: {
          _id: '$category',
          totalBytes: { $sum: '$size' },
          count: { $sum: 1 }
        }
      }
    ]);

    const breakdown = {
      audio: { bytes: 0, count: 0 },
      video: { bytes: 0, count: 0 },
      image: { bytes: 0, count: 0 },
      document: { bytes: 0, count: 0 },
      archive: { bytes: 0, count: 0 },
      other: { bytes: 0, count: 0 }
    };

    let totalNexoraBytes = 0;
    let totalNexoraFiles = 0;

    for (const stat of categoryStats) {
      if (breakdown[stat._id]) {
        breakdown[stat._id] = {
          bytes: stat.totalBytes,
          count: stat.count
        };
      } else {
        breakdown.other.bytes += stat.totalBytes;
        breakdown.other.count += stat.count;
      }
      totalNexoraBytes += stat.totalBytes;
      totalNexoraFiles += stat.count;
    }

    res.json({
      success: true,
      data: {
        disk: diskInfo,
        nexoraUsage: {
          totalBytes: totalNexoraBytes,
          totalFiles: totalNexoraFiles,
          formatted: (totalNexoraBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          breakdown
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/system/stats
 * Overview counts and system health
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [fileCount, folderCount, playlistCount, audioCount, videoCount] = await Promise.all([
      FileItem.countDocuments({ userId: req.user._id, isTrash: false }),
      Folder.countDocuments({ userId: req.user._id, isTrash: false }),
      Playlist.countDocuments({ userId: req.user._id }),
      FileItem.countDocuments({ userId: req.user._id, category: 'audio', isTrash: false }),
      FileItem.countDocuments({ userId: req.user._id, category: 'video', isTrash: false })
    ]);

    res.json({
      success: true,
      data: {
        fileCount,
        folderCount,
        playlistCount,
        audioCount,
        videoCount,
        uptime: Math.round(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
