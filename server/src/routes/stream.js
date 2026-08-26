// server/src/routes/stream.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const mime = require('mime-types');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const storageService = require('../services/storageService');
const mediaProbeService = require('../services/mediaProbeService');
const { THUMBNAILS_DIR } = require('../config/env');

// Authentication middleware applied to all stream routes
router.use(authMiddleware);

/**
 * High-performance HTTP 206 Range-Request byte streaming for audio & video
 */
router.get('/file/:id', async (req, res, next) => {
  try {
    const fileItem = await FileItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!fileItem) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    const fullPath = storageService.resolvePath(fileItem.storageRelativePath);
    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({ success: false, error: 'File data missing on storage volume.' });
    }

    const stat = await fs.stat(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = fileItem.mimeType || mime.lookup(fileItem.name) || 'application/octet-stream';

    if (range) {
      // Parse Range header (e.g., "bytes=1048576-")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).header('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(fullPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      fileStream.pipe(res);
    } else {
      // Entire file stream
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });

      fs.createReadStream(fullPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Direct file download endpoint
 */
router.get('/download/:id', async (req, res, next) => {
  try {
    const fileItem = await FileItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!fileItem) {
      return res.status(404).json({ success: false, error: 'File not found.' });
    }

    const fullPath = storageService.resolvePath(fileItem.storageRelativePath);
    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({ success: false, error: 'File data missing.' });
    }

    res.download(fullPath, fileItem.name);
  } catch (error) {
    next(error);
  }
});

/**
 * Cached album cover artwork and video thumbnail server
 */
router.get('/thumbnail/:filename', async (req, res, next) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const thumbPath = path.join(THUMBNAILS_DIR, safeFilename);

    if (!(await fs.pathExists(thumbPath))) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found.' });
    }

    const mimeType = mime.lookup(thumbPath) || 'image/jpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    fs.createReadStream(thumbPath).pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * Subtitle stream endpoint (WebVTT)
 */
router.get('/subtitle/:fileId/:streamIndex', async (req, res, next) => {
  try {
    const { fileId, streamIndex } = req.params;
    const fileItem = await FileItem.findOne({ _id: fileId, userId: req.user._id });

    if (!fileItem) {
      return res.status(404).json({ success: false, error: 'Media file not found.' });
    }

    const fullPath = storageService.resolvePath(fileItem.storageRelativePath);
    const vttPath = await mediaProbeService.extractSubtitleTrack(
      fullPath,
      parseInt(streamIndex, 10),
      fileItem.hash
    );

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(vttPath).pipe(res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
