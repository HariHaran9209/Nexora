// server/src/config/env.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const STORAGE_ROOT = process.env.STORAGE_ROOT 
  ? path.resolve(process.env.STORAGE_ROOT) 
  : path.resolve(__dirname, '../../storage_data');

const CHUNKS_DIR = path.join(STORAGE_ROOT, '.chunks');
const THUMBNAILS_DIR = path.join(STORAGE_ROOT, '.thumbnails');
const SUBTITLES_CACHE_DIR = path.join(STORAGE_ROOT, '.subtitles_cache');
const MEDIA_DIR = path.join(STORAGE_ROOT, 'files');

module.exports = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nexora',
  JWT_SECRET: process.env.JWT_SECRET || 'nexora_super_secret_jwt_key_arch_linux_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  STORAGE_ROOT,
  CHUNKS_DIR,
  THUMBNAILS_DIR,
  SUBTITLES_CACHE_DIR,
  MEDIA_DIR,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*'
};
