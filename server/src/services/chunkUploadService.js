// server/src/services/chunkUploadService.js
const fs = require('fs-extra');
const path = require('path');
const { CHUNKS_DIR, MEDIA_DIR } = require('../config/env');
const { calculateFileHash } = require('../utils/hash');

class ChunkUploadService {
  constructor() {
    fs.ensureDirSync(CHUNKS_DIR);
  }

  getUploadSessionDir(uploadId) {
    // Sanitize uploadId to prevent directory traversal
    const safeId = uploadId.replace(/[^a-zA-Z0-9_-]/g, '');
    return path.join(CHUNKS_DIR, safeId);
  }

  /**
   * Initializes a chunked upload session
   */
  async initUpload({ uploadId, filename, totalSize, totalChunks, userId, folderPath = '/' }) {
    const sessionDir = this.getUploadSessionDir(uploadId);
    await fs.ensureDir(sessionDir);

    const meta = {
      uploadId,
      filename,
      totalSize: parseInt(totalSize, 10),
      totalChunks: parseInt(totalChunks, 10),
      userId: userId.toString(),
      folderPath,
      createdAt: new Date().toISOString()
    };

    await fs.writeJson(path.join(sessionDir, 'meta.json'), meta);
    return meta;
  }

  /**
   * Saves a single uploaded chunk part
   */
  async saveChunk(uploadId, chunkIndex, buffer) {
    const sessionDir = this.getUploadSessionDir(uploadId);
    if (!(await fs.pathExists(sessionDir))) {
      throw new Error(`Upload session '${uploadId}' does not exist or has expired.`);
    }

    const chunkPath = path.join(sessionDir, `part_${String(chunkIndex).padStart(6, '0')}`);
    await fs.writeFile(chunkPath, buffer);
    return { chunkIndex, size: buffer.length };
  }

  /**
   * Returns the list of uploaded chunk indices for resumption
   */
  async getStatus(uploadId) {
    const sessionDir = this.getUploadSessionDir(uploadId);
    if (!(await fs.pathExists(sessionDir))) {
      return { exists: false, uploadedChunks: [] };
    }

    const metaPath = path.join(sessionDir, 'meta.json');
    const meta = (await fs.pathExists(metaPath)) ? await fs.readJson(metaPath) : {};

    const files = await fs.readdir(sessionDir);
    const chunkIndices = files
      .filter((f) => f.startsWith('part_'))
      .map((f) => parseInt(f.replace('part_', ''), 10))
      .sort((a, b) => a - b);

    return {
      exists: true,
      meta,
      uploadedChunks: chunkIndices,
      completedChunksCount: chunkIndices.length,
      totalChunks: meta.totalChunks || 0
    };
  }

  /**
   * Assembles all chunks in order into the final storage destination
   */
  async assembleFile(uploadId, targetRelativePath) {
    const sessionDir = this.getUploadSessionDir(uploadId);
    if (!(await fs.pathExists(sessionDir))) {
      throw new Error('Upload session not found');
    }

    const metaPath = path.join(sessionDir, 'meta.json');
    const meta = await fs.readJson(metaPath);

    const fullTargetPath = path.join(MEDIA_DIR, targetRelativePath);
    await fs.ensureDir(path.dirname(fullTargetPath));

    const writeStream = fs.createWriteStream(fullTargetPath);
    const files = await fs.readdir(sessionDir);
    const chunkFiles = files
      .filter((f) => f.startsWith('part_'))
      .sort();

    if (chunkFiles.length !== meta.totalChunks) {
      writeStream.close();
      throw new Error(`Incomplete upload: expected ${meta.totalChunks} chunks, found ${chunkFiles.length}`);
    }

    for (const chunkFile of chunkFiles) {
      const chunkFilePath = path.join(sessionDir, chunkFile);
      const chunkData = await fs.readFile(chunkFilePath);
      writeStream.write(chunkData);
    }

    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Calculate SHA-256 of assembled file
    const hash = await calculateFileHash(fullTargetPath);
    const stat = await fs.stat(fullTargetPath);

    // Clean up temporary chunk folder
    await fs.remove(sessionDir);

    return {
      finalPath: fullTargetPath,
      size: stat.size,
      hash,
      meta
    };
  }

  /**
   * Cancel and cleanup upload session
   */
  async cancelUpload(uploadId) {
    const sessionDir = this.getUploadSessionDir(uploadId);
    if (await fs.pathExists(sessionDir)) {
      await fs.remove(sessionDir);
    }
  }
}

module.exports = new ChunkUploadService();
