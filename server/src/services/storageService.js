// server/src/services/storageService.js
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const { STORAGE_ROOT, CHUNKS_DIR, THUMBNAILS_DIR, SUBTITLES_CACHE_DIR, MEDIA_DIR } = require('../config/env');
const { calculateFileHash } = require('../utils/hash');

class StorageService {
  constructor() {
    this.ensureDirectories();
  }

  ensureDirectories() {
    fs.ensureDirSync(STORAGE_ROOT);
    fs.ensureDirSync(CHUNKS_DIR);
    fs.ensureDirSync(THUMBNAILS_DIR);
    fs.ensureDirSync(SUBTITLES_CACHE_DIR);
    fs.ensureDirSync(MEDIA_DIR);
    fs.ensureDirSync(path.join(MEDIA_DIR, '.temp_sync_uploads'));
  }

  /**
   * Safely resolves a path inside the MEDIA_DIR to prevent directory traversal
   */
  resolvePath(relativePath) {
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(MEDIA_DIR, safePath);
    if (!fullPath.startsWith(MEDIA_DIR)) {
      throw new Error('Access denied: Invalid path traversal detected');
    }
    return fullPath;
  }

  /**
   * Classify file category based on MIME type and extension
   */
  determineCategory(mimeType, ext) {
    const cleanExt = (ext || '').toLowerCase().replace('.', '');
    const cleanMime = (mimeType || '').toLowerCase();

    if (
      cleanMime.startsWith('audio/') ||
      ['mp3', 'flac', 'm4a', 'aac', 'ogg', 'wav', 'opus', 'alac', 'aiff', 'wma'].includes(cleanExt)
    ) {
      return 'audio';
    }

    if (
      cleanMime.startsWith('video/') ||
      ['mp4', 'mkv', 'webm', 'avi', 'mov', 'wmv', 'flv', 'm4v', 'ts'].includes(cleanExt)
    ) {
      return 'video';
    }

    if (
      cleanMime.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(cleanExt)
    ) {
      return 'image';
    }

    if (
      cleanMime.includes('pdf') ||
      cleanMime.includes('word') ||
      cleanMime.includes('document') ||
      cleanMime.includes('text') ||
      cleanMime.includes('presentation') ||
      cleanMime.includes('sheet') ||
      ['pdf', 'txt', 'md', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'json', 'xml'].includes(cleanExt)
    ) {
      return 'document';
    }

    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(cleanExt)) {
      return 'archive';
    }

    return 'other';
  }

  /**
   * Move file or folder from old relative path to new relative path
   */
  async moveItem(oldRelativePath, newRelativePath) {
    const oldFullPath = this.resolvePath(oldRelativePath);
    const newFullPath = this.resolvePath(newRelativePath);

    await fs.ensureDir(path.dirname(newFullPath));
    await fs.move(oldFullPath, newFullPath, { overwrite: true });
    return newFullPath;
  }

  /**
   * Deletes a file from disk
   */
  async deleteItem(relativePath) {
    const fullPath = this.resolvePath(relativePath);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
      return true;
    }
    return false;
  }

  /**
   * Checks if file exists on disk
   */
  async exists(relativePath) {
    const fullPath = this.resolvePath(relativePath);
    return await fs.pathExists(fullPath);
  }

  /**
   * Read file stream
   */
  createReadStream(relativePath, options = {}) {
    const fullPath = this.resolvePath(relativePath);
    return fs.createReadStream(fullPath, options);
  }

  /**
   * Compute SHA-256 for a relative path
   */
  async getHash(relativePath) {
    const fullPath = this.resolvePath(relativePath);
    return await calculateFileHash(fullPath);
  }
}

module.exports = new StorageService();
