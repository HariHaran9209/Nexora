// desktop-sync/src/config.js
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

const CONFIG_FILE = path.join(__dirname, '../config.json');

const defaultConfig = {
  serverUrl: process.env.NEXORA_SERVER_URL || 'http://127.0.0.1:5000',
  token: process.env.NEXORA_TOKEN || '',
  syncFolderPath: process.env.NEXORA_SYNC_DIR || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'NexoraSync'),
  deviceId: 'windows_11_client_' + Math.random().toString(36).substr(2, 6),
  pollIntervalMs: 15000 // Polling fallback interval
};

const loadConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const userConfig = fs.readJsonSync(CONFIG_FILE);
      return { ...defaultConfig, ...userConfig };
    } catch (e) {
      console.warn('Error reading config.json, using defaults.');
    }
  }
  return defaultConfig;
};

const saveConfig = (cfg) => {
  fs.writeJsonSync(CONFIG_FILE, cfg, { spaces: 2 });
};

module.exports = { loadConfig, saveConfig, CONFIG_FILE };
