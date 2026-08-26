// server/src/routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const Folder = require('../models/Folder');
const storageService = require('../services/storageService');
const chunkUploadService = require('../services/chunkUploadService');
const musicMetadataService = require('../services/musicMetadataService');
const mediaProbeService = require('../services/mediaProbeService');
const { MEDIA_DIR } = require('../config/env');

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB per chunk limit

router.use(authMiddleware);

/**
 * Single file upload (for smaller files)
 */
const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const targetDir = path.join(MEDIA_DIR, req.user._id.toString());
      await fs.ensureDir(targetDir);
      cb(null, targetDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const diskUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB max for single non-chunked
});

router.post('/single', diskUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const { parentFolderId = null } = req.body;
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const category = storageService.determineCategory(mimeType, ext);
    const relativePath = path.relative(MEDIA_DIR, req.file.path).replace(/\\/g, '/');

    const fileHash = await storageService.getHash(relativePath);

    // Metadata extraction
    let musicMeta = {};
    let videoMeta = {};

    if (category === 'audio') {
      musicMeta = await musicMetadataService.extractMetadata(req.file.path, originalName);
    } else if (category === 'video') {
      videoMeta = await mediaProbeService.probeVideo(req.file.path);
    }

    // Determine virtual path
    let virtualPath = `/${originalName}`;
    if (parentFolderId && parentFolderId !== 'root') {
      const parent = await Folder.findOne({ _id: parentFolderId, userId: req.user._id });
      if (parent) {
        virtualPath = `${parent.virtualPath}/${originalName}`.replace(/\/+/g, '/');
      }
    }

    const fileItem = await FileItem.create({
      name: originalName,
      originalName,
      virtualPath,
      storageRelativePath: relativePath,
      size: req.file.size,
      mimeType,
      extension: ext,
      hash: fileHash,
      category,
      userId: req.user._id,
      parentFolderId: parentFolderId && parentFolderId !== 'root' ? parentFolderId : null,
      musicMeta,
      videoMeta
    });

    res.status(201).json({ success: true, data: fileItem });
  } catch (error) {
    next(error);
  }
});

/**
 * -------------------------------------------------------------
 * Resumable Chunked Upload Endpoints
 * -------------------------------------------------------------
 */

/**
 * Step 1: Initialize chunk upload session
 */
router.post('/chunk/init', async (req, res, next) => {
  try {
    const { filename, totalSize, totalChunks, parentFolderId = null } = req.body;

    if (!filename || !totalSize || !totalChunks) {
      return res.status(400).json({ success: false, error: 'filename, totalSize, and totalChunks are required.' });
    }

    const uploadId = uuidv4();
    const session = await chunkUploadService.initUpload({
      uploadId,
      filename,
      totalSize,
      totalChunks,
      userId: req.user._id,
      folderPath: parentFolderId || 'root'
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * Step 2: Upload single chunk part
 */
router.post('/chunk/upload', memUpload.single('chunk'), async (req, res, next) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    if (!uploadId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({ success: false, error: 'uploadId, chunkIndex, and chunk binary are required.' });
    }

    const result = await chunkUploadService.saveChunk(uploadId, parseInt(chunkIndex, 10), req.file.buffer);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * Step 3: Get chunk upload status (to resume interrupted upload)
 */
router.get('/chunk/status/:uploadId', async (req, res, next) => {
  try {
    const status = await chunkUploadService.getStatus(req.params.uploadId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * Step 4: Complete chunked upload (assemble files, extract metadata, save to DB)
 */
router.post('/chunk/complete', async (req, res, next) => {
  try {
    const { uploadId, parentFolderId = null } = req.body;

    if (!uploadId) {
      return res.status(400).json({ success: false, error: 'uploadId is required.' });
    }

    const status = await chunkUploadService.getStatus(uploadId);
    if (!status.exists) {
      return res.status(404).json({ success: false, error: 'Upload session not found.' });
    }

    const originalName = status.meta.filename;
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(originalName)}`;
    const relativePath = `${req.user._id}/${uniqueFilename}`;

    // Assemble file parts on disk
    const assembleResult = await chunkUploadService.assembleFile(uploadId, relativePath);

    // Determine category
    const mimeType = require('mime-types').lookup(originalName) || 'application/octet-stream';
    const category = storageService.determineCategory(mimeType, ext);

    // Extract metadata asynchronously
    let musicMeta = {};
    let videoMeta = {};

    if (category === 'audio') {
      musicMeta = await musicMetadataService.extractMetadata(assembleResult.finalPath, originalName);
    } else if (category === 'video') {
      videoMeta = await mediaProbeService.probeVideo(assembleResult.finalPath);
    }

    // Determine virtual path
    let virtualPath = `/${originalName}`;
    const targetFolderId = parentFolderId && parentFolderId !== 'root' ? parentFolderId : null;
    if (targetFolderId) {
      const parent = await Folder.findOne({ _id: targetFolderId, userId: req.user._id });
      if (parent) {
        virtualPath = `${parent.virtualPath}/${originalName}`.replace(/\/+/g, '/');
      }
    }

    const fileItem = await FileItem.create({
      name: originalName,
      originalName,
      virtualPath,
      storageRelativePath: relativePath,
      size: assembleResult.size,
      mimeType,
      extension: ext,
      hash: assembleResult.hash,
      category,
      userId: req.user._id,
      parentFolderId: targetFolderId,
      musicMeta,
      videoMeta
    });

    res.status(201).json({ success: true, data: fileItem });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel chunked upload
 */
router.post('/chunk/cancel', async (req, res, next) => {
  try {
    const { uploadId } = req.body;
    if (uploadId) {
      await chunkUploadService.cancelUpload(uploadId);
    }
    res.json({ success: true, message: 'Upload session cancelled.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
