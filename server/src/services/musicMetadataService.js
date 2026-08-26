// server/src/services/musicMetadataService.js
const mm = require('music-metadata');
const fs = require('fs-extra');
const path = require('path');
const { THUMBNAILS_DIR } = require('../config/env');
const { calculateBufferHash } = require('../utils/hash');

class MusicMetadataService {
  constructor() {
    fs.ensureDirSync(THUMBNAILS_DIR);
  }

  /**
   * Parse audio file and extract ID3/FLAC metadata + cover art
   */
  async extractMetadata(fullFilePath, originalName) {
    const fallbackTitle = path.parse(originalName || path.basename(fullFilePath)).name;

    try {
      const metadata = await mm.parseFile(fullFilePath, { duration: true, skipCovers: false });
      const common = metadata.common || {};
      const format = metadata.format || {};

      let hasCover = false;
      let coverArtFilename = null;

      // Extract album cover artwork
      if (common.picture && common.picture.length > 0) {
        const picture = common.picture[0];
        const coverHash = calculateBufferHash(picture.data);
        const ext = (picture.format && picture.format.includes('png')) ? 'png' : 'jpg';
        coverArtFilename = `cover_${coverHash}.${ext}`;
        const coverSavePath = path.join(THUMBNAILS_DIR, coverArtFilename);

        if (!(await fs.pathExists(coverSavePath))) {
          await fs.writeFile(coverSavePath, picture.data);
        }
        hasCover = true;
      }

      return {
        title: (common.title && common.title.trim()) || fallbackTitle,
        artist: (common.artist && common.artist.trim()) || (common.albumartist && common.albumartist.trim()) || 'Unknown Artist',
        album: (common.album && common.album.trim()) || 'Unknown Album',
        albumArtist: (common.albumartist && common.albumartist.trim()) || '',
        duration: Math.round(format.duration || 0),
        trackNo: (common.track && common.track.no) || 1,
        diskNo: (common.disk && common.disk.no) || 1,
        year: common.year || null,
        genre: Array.isArray(common.genre) ? common.genre : (common.genre ? [common.genre] : []),
        hasCover,
        coverArtFilename,
        bitrate: Math.round(format.bitrate || 0)
      };
    } catch (error) {
      console.warn(`[MusicMetadata] Could not extract tags for ${fullFilePath}:`, error.message);
      return {
        title: fallbackTitle,
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        albumArtist: '',
        duration: 0,
        trackNo: 1,
        diskNo: 1,
        year: null,
        genre: [],
        hasCover: false,
        coverArtFilename: null,
        bitrate: 0
      };
    }
  }
}

module.exports = new MusicMetadataService();
