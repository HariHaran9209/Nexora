// server/src/utils/hash.js
const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculates SHA256 hash of a file on disk
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Calculates SHA256 hash of a Buffer
 * @param {Buffer} buffer 
 * @returns {string}
 */
const calculateBufferHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

module.exports = {
  calculateFileHash,
  calculateBufferHash
};
