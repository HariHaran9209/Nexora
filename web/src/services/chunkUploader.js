// web/src/services/chunkUploader.js
import { uploadApi } from './api';

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk

export class ChunkUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.parentFolderId = options.parentFolderId || null;
    this.chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
    this.onProgress = options.onProgress || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.uploadId = options.uploadId || null;
    this.isPaused = false;
    this.isCancelled = false;
  }

  async start() {
    try {
      this.onStatusChange('initializing');

      // 1. Init session on server
      if (!this.uploadId) {
        const initRes = await uploadApi.initChunk(
          this.file.name,
          this.file.size,
          this.totalChunks,
          this.parentFolderId
        );
        this.uploadId = initRes.data.data.uploadId;
      }

      // 2. Query status to see what chunks are already on server (for resume)
      const statusRes = await uploadApi.getChunkStatus(this.uploadId);
      const uploadedChunks = new Set(statusRes.data.data.uploadedChunks || []);

      this.onStatusChange('uploading');
      let bytesUploaded = uploadedChunks.size * this.chunkSize;

      for (let chunkIndex = 0; chunkIndex < this.totalChunks; chunkIndex++) {
        if (this.isCancelled) {
          await uploadApi.cancelChunk(this.uploadId);
          this.onStatusChange('cancelled');
          return null;
        }

        if (this.isPaused) {
          this.onStatusChange('paused');
          return null;
        }

        if (uploadedChunks.has(chunkIndex)) {
          continue;
        }

        const start = chunkIndex * this.chunkSize;
        const end = Math.min(this.file.size, start + this.chunkSize);
        const chunkBlob = this.file.slice(start, end);

        // Upload chunk with automatic retry on network drops
        let uploaded = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!uploaded && attempts < maxAttempts) {
          if (this.isCancelled || this.isPaused) break;
          try {
            await uploadApi.uploadChunk(this.uploadId, chunkIndex, chunkBlob);
            uploaded = true;
          } catch (chunkErr) {
            attempts++;
            if (attempts >= maxAttempts) {
              throw chunkErr;
            }
            // Exponential backoff wait (1s, 2s)
            await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
          }
        }

        if (this.isCancelled || this.isPaused) {
          return null;
        }

        bytesUploaded += (end - start);
        const percent = Math.min(99, Math.round((bytesUploaded / this.file.size) * 100));
        this.onProgress({
          percent,
          bytesUploaded,
          totalBytes: this.file.size,
          chunkIndex,
          totalChunks: this.totalChunks
        });
      }

      // 3. Assemble and complete on server
      this.onStatusChange('processing');
      const completeRes = await uploadApi.completeChunk(this.uploadId, this.parentFolderId);

      this.onProgress({ percent: 100, bytesUploaded: this.file.size, totalBytes: this.file.size });
      this.onStatusChange('completed');

      return completeRes.data.data;
    } catch (err) {
      this.onStatusChange('error');
      throw err;
    }
  }

  pause() {
    this.isPaused = true;
  }

  cancel() {
    this.isCancelled = true;
  }
}
