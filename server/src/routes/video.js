// server/src/routes/video.js
const express = require('express');
const router = express.Router();
const path = require('path');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const PlayProgress = require('../models/PlayProgress');

router.use(authMiddleware);

/**
 * GET /api/video/library
 * List all video files with duration, resolution, audio/sub tracks and resume progress
 */
router.get('/library', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    const query = {
      userId: req.user._id,
      category: 'video',
      isTrash: false
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [videos, total] = await Promise.all([
      FileItem.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      FileItem.countDocuments(query)
    ]);

    // Fetch progress for each video
    const videoIds = videos.map((v) => v._id);
    const progressList = await PlayProgress.find({
      userId: req.user._id,
      fileId: { $in: videoIds }
    });

    const progressMap = new Map(progressList.map((p) => [p.fileId.toString(), p]));

    const enrichedVideos = videos.map((v) => {
      const progress = progressMap.get(v._id.toString());
      return {
        ...v.toObject(),
        progress: progress
          ? {
              positionSeconds: progress.positionSeconds,
              durationSeconds: progress.durationSeconds,
              percent: progress.durationSeconds > 0 ? Math.round((progress.positionSeconds / progress.durationSeconds) * 100) : 0,
              completed: progress.completed
            }
          : null
      };
    });

    res.json({
      success: true,
      data: {
        videos: enrichedVideos,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/video/:id/details
 * Fetch video details including streams and external subtitles
 */
router.get('/:id/details', async (req, res, next) => {
  try {
    const video = await FileItem.findOne({
      _id: req.params.id,
      userId: req.user._id,
      category: 'video'
    });

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video file not found.' });
    }

    // Check for saved progress
    const progress = await PlayProgress.findOne({
      userId: req.user._id,
      fileId: video._id
    });

    // Check for external subtitle files in the same folder
    const baseName = path.parse(video.name).name;
    const externalSubs = await FileItem.find({
      userId: req.user._id,
      parentFolderId: video.parentFolderId,
      isTrash: false,
      extension: { $in: ['srt', 'vtt', 'sub', 'ass'] },
      name: { $regex: `^${baseName}`, $options: 'i' }
    });

    const formattedExternalSubs = externalSubs.map((sub, idx) => ({
      index: 1000 + idx, // index offset for external subs
      fileId: sub._id,
      isExternal: true,
      title: sub.name,
      language: path.extname(path.parse(sub.name).name).replace('.', '') || 'External Sub',
      format: sub.extension
    }));

    res.json({
      success: true,
      data: {
        video,
        progress: progress ? {
          positionSeconds: progress.positionSeconds,
          durationSeconds: progress.durationSeconds,
          audioTrackIndex: progress.audioTrackIndex,
          subtitleTrackIndex: progress.subtitleTrackIndex
        } : null,
        audioStreams: video.videoMeta?.audioStreams || [],
        subtitleStreams: [
          ...(video.videoMeta?.subtitleStreams || []),
          ...formattedExternalSubs
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/video/:id/progress
 * Update playback progress (resume position)
 */
router.post('/:id/progress', async (req, res, next) => {
  try {
    const { positionSeconds, durationSeconds, audioTrackIndex = 0, subtitleTrackIndex = -1 } = req.body;

    const completed = durationSeconds > 0 && positionSeconds / durationSeconds > 0.92;

    const progress = await PlayProgress.findOneAndUpdate(
      { userId: req.user._id, fileId: req.params.id },
      {
        positionSeconds: Math.round(positionSeconds),
        durationSeconds: Math.round(durationSeconds),
        audioTrackIndex,
        subtitleTrackIndex,
        completed,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
