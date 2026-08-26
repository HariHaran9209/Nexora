// server/src/routes/files.js
const express = require('express');
const router = express.Router();
const path = require('path');
const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const Folder = require('../models/Folder');
const storageService = require('../services/storageService');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/files
 * Query files and folders with filtering, sorting, pagination, and search
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      folderId = null,
      category,
      isFavorite,
      isTrash = 'false',
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 100
    } = req.query;

    const query = {
      userId: req.user._id,
      isTrash: isTrash === 'true'
    };

    if (folderId && folderId !== 'root' && folderId !== 'null') {
      query.parentFolderId = folderId;
    } else if (folderId === 'root' || (!category && !search && isFavorite === undefined && isTrash === 'false')) {
      query.parentFolderId = null;
    }

    if (category) {
      query.category = category;
      // In category view, allow across all folders
      delete query.parentFolderId;
    }

    if (isFavorite === 'true') {
      query.isFavorite = true;
      delete query.parentFolderId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'musicMeta.title': { $regex: search, $options: 'i' } },
        { 'musicMeta.artist': { $regex: search, $options: 'i' } },
        { 'musicMeta.album': { $regex: search, $options: 'i' } }
      ];
      delete query.parentFolderId;
    }

    const sortOptions = {};
    const order = sortOrder === 'desc' ? -1 : 1;

    switch (sortBy) {
      case 'size':
        sortOptions.size = order;
        break;
      case 'date':
      case 'createdAt':
        sortOptions.createdAt = order;
        break;
      case 'type':
        sortOptions.category = order;
        sortOptions.name = 1;
        break;
      case 'name':
      default:
        sortOptions.name = order;
        break;
    }

    // Fetch folders only if we are in a normal directory navigation view
    let folders = [];
    if (!category && isFavorite !== 'true' && !search) {
      const folderQuery = {
        userId: req.user._id,
        isTrash: isTrash === 'true',
        parentFolderId: query.parentFolderId !== undefined ? query.parentFolderId : null
      };
      folders = await Folder.find(folderQuery).sort({ name: 1 });
    }

    // Fetch files with pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [files, totalFiles] = await Promise.all([
      FileItem.find(query).sort(sortOptions).skip(skip).limit(limitNum),
      FileItem.countDocuments(query)
    ]);

    // Get current folder info and breadcrumb chain
    let currentFolder = null;
    let breadcrumbs = [{ id: null, name: 'Drive' }];

    if (query.parentFolderId) {
      currentFolder = await Folder.findOne({ _id: query.parentFolderId, userId: req.user._id });
      if (currentFolder) {
        // Build breadcrumb trail
        let curr = currentFolder;
        const trail = [];
        while (curr) {
          trail.unshift({ id: curr._id, name: curr.name });
          if (curr.parentFolderId) {
            curr = await Folder.findOne({ _id: curr.parentFolderId, userId: req.user._id });
          } else {
            curr = null;
          }
        }
        breadcrumbs = [{ id: null, name: 'Drive' }, ...trail];
      }
    }

    res.json({
      success: true,
      data: {
        folders,
        files,
        currentFolder,
        breadcrumbs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalFiles,
          totalPages: Math.ceil(totalFiles / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/files/folder
 * Create a new folder
 */
router.post('/folder', async (req, res, next) => {
  try {
    const { name, parentFolderId = null } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required.' });
    }

    const safeName = name.trim();
    let virtualPath = `/${safeName}`;

    if (parentFolderId) {
      const parent = await Folder.findOne({ _id: parentFolderId, userId: req.user._id });
      if (!parent) {
        return res.status(404).json({ success: false, error: 'Parent folder not found.' });
      }
      virtualPath = `${parent.virtualPath}/${safeName}`.replace(/\/+/g, '/');
    }

    // Check duplicate
    const existing = await Folder.findOne({
      userId: req.user._id,
      parentFolderId: parentFolderId || null,
      name: safeName,
      isTrash: false
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'A folder with this name already exists in this directory.' });
    }

    const folder = await Folder.create({
      name: safeName,
      virtualPath,
      parentFolderId: parentFolderId || null,
      userId: req.user._id
    });

    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:id/rename
 * Rename file or folder
 */
router.put('/:id/rename', async (req, res, next) => {
  try {
    const { name, isFolder } = req.body;
    const { id } = req.params;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'New name is required.' });
    }

    const safeName = name.trim();

    if (isFolder) {
      const folder = await Folder.findOne({ _id: id, userId: req.user._id });
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      folder.name = safeName;
      await folder.save();
      return res.json({ success: true, data: folder });
    }

    const file = await FileItem.findOne({ _id: id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, error: 'File not found.' });

    // Preserve extension if user didn't specify one
    let newFilename = safeName;
    if (!path.extname(newFilename) && file.extension) {
      newFilename = `${safeName}.${file.extension}`;
    }

    file.name = newFilename;
    await file.save();

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:id/move
 * Move file or folder to a different parent folder
 */
router.put('/:id/move', async (req, res, next) => {
  try {
    const { targetFolderId, isFolder } = req.body;
    const { id } = req.params;

    const parentId = (targetFolderId === 'root' || !targetFolderId) ? null : targetFolderId;

    if (isFolder) {
      if (id === parentId) {
        return res.status(400).json({ success: false, error: 'Cannot move folder into itself.' });
      }
      const folder = await Folder.findOne({ _id: id, userId: req.user._id });
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      folder.parentFolderId = parentId;
      await folder.save();
      return res.json({ success: true, data: folder });
    }

    const file = await FileItem.findOne({ _id: id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, error: 'File not found.' });

    file.parentFolderId = parentId;
    await file.save();

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:id/favorite
 * Toggle favorite
 */
router.put('/:id/favorite', async (req, res, next) => {
  try {
    const file = await FileItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, error: 'File not found.' });

    file.isFavorite = !file.isFavorite;
    await file.save();

    res.json({ success: true, data: { isFavorite: file.isFavorite } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:id
 * Move to trash or permanently delete
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { permanent = 'false', isFolder = 'false' } = req.query;
    const { id } = req.params;

    if (isFolder === 'true') {
      const folder = await Folder.findOne({ _id: id, userId: req.user._id });
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      if (permanent === 'true') {
        await Folder.deleteOne({ _id: id });
        // Permanently trash child files
        const childFiles = await FileItem.find({ parentFolderId: id, userId: req.user._id });
        for (const cf of childFiles) {
          await storageService.deleteItem(cf.storageRelativePath);
          await FileItem.deleteOne({ _id: cf._id });
        }
      } else {
        folder.isTrash = true;
        await folder.save();
        await FileItem.updateMany({ parentFolderId: id, userId: req.user._id }, { isTrash: true });
      }

      return res.json({ success: true, message: 'Folder deleted.' });
    }

    const file = await FileItem.findOne({ _id: id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, error: 'File not found.' });

    if (permanent === 'true') {
      await storageService.deleteItem(file.storageRelativePath);
      await FileItem.deleteOne({ _id: id });
    } else {
      file.isTrash = true;
      await file.save();
    }

    res.json({ success: true, message: 'File deleted.' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:id/restore
 * Restore file or folder from trash
 */
router.put('/:id/restore', async (req, res, next) => {
  try {
    const { isFolder = 'false' } = req.body;
    const { id } = req.params;

    if (isFolder === 'true' || isFolder === true) {
      const folder = await Folder.findOne({ _id: id, userId: req.user._id });
      if (!folder) return res.status(404).json({ success: false, error: 'Folder not found.' });

      folder.isTrash = false;
      await folder.save();
      await FileItem.updateMany({ parentFolderId: id, userId: req.user._id }, { isTrash: false });
      return res.json({ success: true, data: folder });
    }

    const file = await FileItem.findOne({ _id: id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, error: 'File not found.' });

    file.isTrash = false;
    await file.save();

    res.json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
