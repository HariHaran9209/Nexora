// desktop-sync/src/syncEngine.js
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const chokidar = require('chokidar');
const { loadConfig } = require('./config');
const apiClient = require('./apiClient');

const computeFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.debounceTimer = null;
    this.watcher = null;
  }

  async scanLocalFolder(folderPath) {
    await fs.ensureDir(folderPath);
    const manifest = [];

    const walk = async (currentDir) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(folderPath, fullPath).replace(/\\/g, '/');

        // Ignore temporary/hidden files
        if (entry.name.startsWith('.') || entry.name.endsWith('.tmp') || entry.name.endsWith('~')) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          const hash = await computeFileHash(fullPath);
          manifest.push({
            relativePath: relPath,
            hash,
            size: stat.size,
            mtime: stat.mtime.toISOString()
          });
        }
      }
    };

    await walk(folderPath);
    return manifest;
  }

  async performSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    const config = loadConfig();
    const syncDir = path.resolve(config.syncFolderPath);

    try {
      console.log(`\n[Sync] 🔄 Starting bidirectional sync on: ${syncDir}`);
      await fs.ensureDir(syncDir);

      // 1. Scan local designated folder
      const localManifest = await this.scanLocalFolder(syncDir);
      console.log(`[Sync] 📁 Scanned ${localManifest.length} local files.`);

      // 2. Query diff from Nexora server
      const diff = await apiClient.getDiff(localManifest);
      const { toDownload, toUpload } = diff;

      console.log(`[Sync] 📊 Diff calculated: ${toUpload.length} to upload, ${toDownload.length} to download.`);

      // 3. Download remote updates
      for (const item of toDownload) {
        const destPath = path.join(syncDir, item.relativePath);
        console.log(`[Sync] ⬇️  Downloading from server: ${item.relativePath}`);
        await apiClient.downloadFile(item.fileId, destPath);
      }

      // 4. Upload local updates
      for (const item of toUpload) {
        const srcPath = path.join(syncDir, item.relativePath);
        console.log(`[Sync] ⬆️  Uploading to server: ${item.relativePath}`);
        await apiClient.uploadFile(srcPath, item.relativePath, item.hash);
      }

      console.log(`[Sync] ✅ Synchronization complete!\n`);
    } catch (error) {
      console.error(`[Sync Error] ${error.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  startWatcher() {
    const config = loadConfig();
    const syncDir = path.resolve(config.syncFolderPath);
    fs.ensureDirSync(syncDir);

    console.log(`[Watcher] 👀 Watching for file changes in: ${syncDir}`);

    this.watcher = chokidar.watch(syncDir, {
      ignored: /(^|[\/\\])\..|.*\.tmp$|.*~$/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 100
      }
    });

    const triggerSync = (event, filePath) => {
      const relPath = path.relative(syncDir, filePath);
      console.log(`[Watcher] ⚡ Detected ${event}: ${relPath}`);

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.performSync();
      }, 2000);
    };

    this.watcher
      .on('add', (p) => triggerSync('file added', p))
      .on('change', (p) => triggerSync('file changed', p))
      .on('unlink', (p) => triggerSync('file removed', p));

    // Periodic fallback poll
    setInterval(() => {
      this.performSync();
    }, config.pollIntervalMs || 30000);

    // Initial sync run
    this.performSync();
  }

  stopWatcher() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = new SyncEngine();
