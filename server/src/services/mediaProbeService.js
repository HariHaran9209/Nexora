// server/src/services/mediaProbeService.js
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { THUMBNAILS_DIR, SUBTITLES_CACHE_DIR } = require('../config/env');
const { calculateFileHash } = require('../utils/hash');

class MediaProbeService {
  constructor() {
    fs.ensureDirSync(THUMBNAILS_DIR);
    fs.ensureDirSync(SUBTITLES_CACHE_DIR);
  }

  /**
   * Probes video file with ffprobe to extract audio streams, subtitles, and video dimensions
   */
  async probeVideo(fullFilePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(fullFilePath, async (err, metadata) => {
        if (err) {
          console.warn(`[MediaProbe] ffprobe error on ${fullFilePath}:`, err.message);
          return resolve({
            duration: 0,
            width: 0,
            height: 0,
            codec: '',
            bitrate: 0,
            fps: 0,
            hasThumbnail: false,
            thumbnailFilename: null,
            audioStreams: [],
            subtitleStreams: []
          });
        }

        try {
          const streams = metadata.streams || [];
          const format = metadata.format || {};

          // Video stream
          const videoStream = streams.find((s) => s.codec_type === 'video') || {};
          const duration = Math.round(parseFloat(format.duration || videoStream.duration || 0));
          const width = videoStream.width || 0;
          const height = videoStream.height || 0;
          const codec = videoStream.codec_name || '';
          const bitrate = Math.round(parseFloat(format.bit_rate || videoStream.bit_rate || 0));
          
          let fps = 0;
          if (videoStream.r_frame_rate) {
            const parts = videoStream.r_frame_rate.split('/');
            if (parts.length === 2 && parseInt(parts[1], 10) !== 0) {
              fps = Math.round((parseInt(parts[0], 10) / parseInt(parts[1], 10)) * 100) / 100;
            }
          }

          // Audio streams
          const audioStreams = streams
            .filter((s) => s.codec_type === 'audio')
            .map((s, idx) => ({
              index: s.index,
              codec: s.codec_name || 'unknown',
              language: (s.tags && (s.tags.language || s.tags.LANGUAGE || s.tags.lang)) || `Audio Track ${idx + 1}`,
              title: (s.tags && (s.tags.title || s.tags.TITLE)) || `Track ${idx + 1} (${s.codec_name || 'audio'})`,
              channels: s.channels || 2
            }));

          // Subtitle streams
          const subtitleStreams = streams
            .filter((s) => s.codec_type === 'subtitle')
            .map((s, idx) => ({
              index: s.index,
              codec: s.codec_name || 'unknown',
              language: (s.tags && (s.tags.language || s.tags.LANGUAGE || s.tags.lang)) || `Sub ${idx + 1}`,
              title: (s.tags && (s.tags.title || s.tags.TITLE)) || `Subtitle ${idx + 1} (${s.codec_name || 'sub'})`,
              isDefault: Boolean(s.disposition && s.disposition.default),
              isForced: Boolean(s.disposition && s.disposition.forced),
              format: 'vtt'
            }));

          // Generate thumbnail screenshot (at 5s or 10% offset)
          let hasThumbnail = false;
          let thumbnailFilename = null;

          try {
            const fileHash = await calculateFileHash(fullFilePath);
            thumbnailFilename = `thumb_${fileHash}.jpg`;
            const thumbPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

            if (!(await fs.pathExists(thumbPath))) {
              const seekTime = Math.min(5, Math.max(1, duration * 0.1));
              await this.generateThumbnail(fullFilePath, thumbPath, seekTime);
            }
            hasThumbnail = await fs.pathExists(thumbPath);
          } catch (thumbErr) {
            console.warn('[MediaProbe] Could not generate video thumbnail:', thumbErr.message);
          }

          resolve({
            duration,
            width,
            height,
            codec,
            bitrate,
            fps,
            hasThumbnail,
            thumbnailFilename,
            audioStreams,
            subtitleStreams
          });
        } catch (e) {
          console.error('[MediaProbe] Processing metadata error:', e.message);
          resolve({
            duration: 0,
            width: 0,
            height: 0,
            codec: '',
            bitrate: 0,
            fps: 0,
            hasThumbnail: false,
            thumbnailFilename: null,
            audioStreams: [],
            subtitleStreams: []
          });
        }
      });
    });
  }

  /**
   * Generates a single video frame thumbnail
   */
  generateThumbnail(videoPath, outputPath, seekSeconds = 5) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(seekSeconds)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Extracts embedded subtitle track to WebVTT format
   */
  async extractSubtitleTrack(videoFullPath, streamIndex, fileHash) {
    const cachedVttPath = path.join(SUBTITLES_CACHE_DIR, `${fileHash}_stream_${streamIndex}.vtt`);

    if (await fs.pathExists(cachedVttPath)) {
      return cachedVttPath;
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoFullPath)
        .outputOptions([`-map 0:${streamIndex}`, '-c:s webvtt'])
        .output(cachedVttPath)
        .on('end', () => resolve(cachedVttPath))
        .on('error', (err) => {
          console.error(`[MediaProbe] Failed to extract subtitle stream ${streamIndex}:`, err.message);
          reject(err);
        })
        .run();
    });
  }
}

module.exports = new MediaProbeService();
