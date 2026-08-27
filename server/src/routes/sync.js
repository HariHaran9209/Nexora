// server/src/routes/sync.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const Folder = require('../models/Folder');
const SyncState = require('../models/SyncState');
const storageService = require('../services/storageService');
const musicMetadataService = require('../services/musicMetadataService');
const mediaProbeService = require('../services/mediaProbeService');
const { MEDIA_DIR } = require('../config/env');

const uploadTempDir = path.join(MEDIA_DIR, '.temp_sync_uploads');
fs.ensureDirSync(uploadTempDir);

const upload = multer({
  dest: uploadTempDir,
  limits: { fileSize: 1024 * 1024 * 1024 * 5 } // 5GB max for single backup file
});

router.use(authMiddleware);

/**
 * -------------------------------------------------------------
 * ANDROID BACKGROUND CAMERA BACKUP ENDPOINTS
 * -------------------------------------------------------------
 */

/**
 * Check which file hashes already exist on server (Fast duplicate detection)
 */
router.post('/android/check-hashes', async (req, res, next) => {
  try {
    const { hashes = [] } = req.body;
    if (!Array.isArray(hashes)) {
      return res.status(400).json({ success: false, error: 'hashes must be an array' });
    }

    if (hashes.length === 0) {
      return res.json({
        success: true,
        existingHashes: [],
        neededHashes: []
      });
    }

    const existing = await FileItem.find({
      userId: req.user._id,
      hash: { $in: hashes },
      isTrash: false
    }).select('hash name size');

    const existingHashes = existing.map((f) => f.hash);
    const existingSet = new Set(existingHashes);

    res.json({
      success: true,
      existingHashes,
      neededHashes: hashes.filter((h) => !existingSet.has(h))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload single Android backup media file (photo/video)
 */
router.post('/android/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const folderName = (req.body.folderName || 'Camera').trim();
    const clientHash = req.body.clientHash ? req.body.clientHash.trim() : null;
    const rawOriginalName = req.file.originalname || 'upload';
    const originalName = Buffer.from(rawOriginalName, 'latin1').toString('utf8');

    // 1. Ensure or find "Phone Backup" parent folder
    let rootBackupFolder = await Folder.findOne({
      userId: req.user._id,
      name: 'Phone Backup',
      parentFolderId: null,
      isTrash: false
    });

    if (!rootBackupFolder) {
      rootBackupFolder = await Folder.create({
        name: 'Phone Backup',
        virtualPath: '/Phone Backup',
        parentFolderId: null,
        userId: req.user._id,
        color: '#10b981'
      });
    }

    // 2. Ensure or find subfolder (e.g. "Camera" or "DCIM")
    let targetSubFolder = await Folder.findOne({
      userId: req.user._id,
      name: folderName,
      parentFolderId: rootBackupFolder._id,
      isTrash: false
    });

    if (!targetSubFolder) {
      targetSubFolder = await Folder.create({
        name: folderName,
        virtualPath: `/Phone Backup/${folderName}`,
        parentFolderId: rootBackupFolder._id,
        userId: req.user._id
      });
    }

    // Fast deduplication check if hash provided
    if (clientHash) {
      const existingFile = await FileItem.findOne({
        userId: req.user._id,
        hash: clientHash,
        isTrash: false
      });
      if (existingFile) {
        if (req.file && (await fs.pathExists(req.file.path))) {
          await fs.remove(req.file.path);
        }
        return res.status(200).json({ success: true, data: existingFile, deduplicated: true });
      }
    }

    // 3. Move file to permanent storage
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const uniqueName = `${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(originalName) || (ext ? '.' + ext : '')}`;
    const relativePath = `${req.user._id}/PhoneBackup/${folderName}/${uniqueName}`;
    const fullTargetPath = path.join(MEDIA_DIR, relativePath);

    await fs.ensureDir(path.dirname(fullTargetPath));
    await fs.move(req.file.path, fullTargetPath, { overwrite: true });

    const fileHash = clientHash || (await storageService.getHash(relativePath));
    const mimeType = req.file.mimetype || require('mime-types').lookup(originalName) || 'application/octet-stream';
    const category = storageService.determineCategory(mimeType, ext);

    // Extract metadata safely
    let musicMeta = {};
    let videoMeta = {};
    try {
      if (category === 'video') {
        videoMeta = await mediaProbeService.probeVideo(fullTargetPath);
      } else if (category === 'audio') {
        musicMeta = await musicMetadataService.extractMetadata(fullTargetPath, originalName);
      }
    } catch (metaErr) {
      console.warn('[Sync] Metadata extraction warning:', metaErr.message);
    }

    const fileSize = (await fs.stat(fullTargetPath)).size;

    const fileItem = await FileItem.create({
      name: originalName,
      originalName,
      virtualPath: `/Phone Backup/${folderName}/${originalName}`,
      storageRelativePath: relativePath,
      size: fileSize,
      mimeType,
      extension: ext,
      hash: fileHash,
      category,
      userId: req.user._id,
      parentFolderId: targetSubFolder._id,
      musicMeta,
      videoMeta
    });

    res.status(201).json({ success: true, data: fileItem });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.removeSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
});

/**
 * Get Android Backup stats
 */
router.get('/android/status', async (req, res, next) => {
  try {
    const rootBackupFolder = await Folder.findOne({
      userId: req.user._id,
      name: 'Phone Backup',
      parentFolderId: null,
      isTrash: false
    });

    if (!rootBackupFolder) {
      return res.json({
        success: true,
        data: { totalBackedUpFiles: 0, totalSizeBytes: 0, lastBackupTime: null }
      });
    }

    const subFolders = await Folder.find({ parentFolderId: rootBackupFolder._id, userId: req.user._id });
    const subFolderIds = [rootBackupFolder._id, ...subFolders.map((sf) => sf._id)];

    const files = await FileItem.find({
      userId: req.user._id,
      parentFolderId: { $in: subFolderIds },
      isTrash: false
    }).sort({ createdAt: -1 });

    const totalSizeBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

    res.json({
      success: true,
      data: {
        totalBackedUpFiles: files.length,
        totalSizeBytes,
        lastBackupTime: files[0]?.createdAt || null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * -------------------------------------------------------------
 * WINDOWS DESKTOP FOLDER TWO-WAY SYNC ENDPOINTS
 * -------------------------------------------------------------
 */

/**
 * Get or create Windows Sync Folder
 */
async function getOrCreateWindowsSyncFolder(userId) {
  let syncFolder = await Folder.findOne({
    userId,
    name: 'Windows Sync',
    parentFolderId: null,
    isTrash: false
  });

  if (!syncFolder) {
    syncFolder = await Folder.create({
      name: 'Windows Sync',
      virtualPath: '/Windows Sync',
      parentFolderId: null,
      userId,
      color: '#6366f1'
    });
  }
  return syncFolder;
}

/**
 * Diff client manifest against server state for two-way synchronization
 */
router.post('/windows/diff', async (req, res, next) => {
  try {
    const { deviceId, clientManifest = [] } = req.body;
    const syncFolder = await getOrCreateWindowsSyncFolder(req.user._id);

    // Get all files inside the Windows Sync directory tree
    const serverFiles = await FileItem.find({
      userId: req.user._id,
      isTrash: false,
      virtualPath: { $regex: `^/Windows Sync/` }
    });

    const serverFileMap = new Map();
    for (const file of serverFiles) {
      // relative path inside Windows Sync folder
      const relPath = file.virtualPath.replace('/Windows Sync/', '');
      serverFileMap.set(relPath, file);
    }

    const clientFileMap = new Map();
    for (const clientItem of clientManifest) {
      clientFileMap.set(clientItem.relativePath, clientItem);
    }

    const toDownload = []; // server has newer/missing file -> client needs to download
    const toUpload = [];   // client has newer/missing file -> client needs to upload

    // Check server files against client
    for (const [relPath, serverFile] of serverFileMap.entries()) {
      const clientItem = clientFileMap.get(relPath);
      if (!clientItem) {
        toDownload.push({
          fileId: serverFile._id,
          relativePath: relPath,
          hash: serverFile.hash,
          size: serverFile.size,
          updatedAt: serverFile.updatedAt
        });
      } else if (clientItem.hash !== serverFile.hash) {
        // Conflict or difference: pick newer by date
        const clientMtime = new Date(clientItem.mtime).getTime();
        const serverMtime = new Date(serverFile.updatedAt).getTime();
        if (serverMtime > clientMtime) {
          toDownload.push({
            fileId: serverFile._id,
            relativePath: relPath,
            hash: serverFile.hash,
            size: serverFile.size,
            updatedAt: serverFile.updatedAt
          });
        }
      }
    }

    // Check client files against server
    for (const [relPath, clientItem] of clientFileMap.entries()) {
      const serverFile = serverFileMap.get(relPath);
      if (!serverFile) {
        toUpload.push({
          relativePath: relPath,
          hash: clientItem.hash,
          size: clientItem.size,
          mtime: clientItem.mtime
        });
      } else if (clientItem.hash !== serverFile.hash) {
        const clientMtime = new Date(clientItem.mtime).getTime();
        const serverMtime = new Date(serverFile.updatedAt).getTime();
        if (clientMtime > serverMtime) {
          toUpload.push({
            relativePath: relPath,
            hash: clientItem.hash,
            size: clientItem.size,
            mtime: clientItem.mtime
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        toDownload,
        toUpload,
        serverTotalFiles: serverFiles.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload synced file from Windows client
 */
router.post('/windows/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { relativePath, clientHash } = req.body;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'relativePath is required' });
    }

    const syncFolder = await getOrCreateWindowsSyncFolder(req.user._id);
    const originalName = path.basename(relativePath);
    const virtualPath = `/Windows Sync/${relativePath}`.replace(/\/+/g, '/');

    // Build directory path on disk
    const storageRelPath = `${req.user._id}/WindowsSync/${relativePath}`;
    const fullTargetPath = path.join(MEDIA_DIR, storageRelPath);

    await fs.ensureDir(path.dirname(fullTargetPath));
    await fs.move(req.file.path, fullTargetPath, { overwrite: true });

    const fileHash = clientHash || (await storageService.getHash(storageRelPath));
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    const mimeType = require('mime-types').lookup(originalName) || 'application/octet-stream';
    const category = storageService.determineCategory(mimeType, ext);

    const fileItem = await FileItem.findOneAndUpdate(
      { userId: req.user._id, virtualPath },
      {
        name: originalName,
        originalName,
        virtualPath,
        storageRelativePath: storageRelPath,
        size: (await fs.stat(fullTargetPath)).size,
        mimeType,
        extension: ext,
        hash: fileHash,
        category,
        userId: req.user._id,
        parentFolderId: syncFolder._id,
        isTrash: false,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: fileItem });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.removeSync(req.file.path);
    }
    next(error);
  }
});

module.exports = router;
