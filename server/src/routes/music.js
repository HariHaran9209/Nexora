// server/src/routes/music.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const authMiddleware = require('../middlewares/authMiddleware');
const FileItem = require('../models/FileItem');
const Playlist = require('../models/Playlist');

router.use(authMiddleware);

/**
 * GET /api/music/tracks
 * List all music tracks with search and pagination
 */
router.get('/tracks', async (req, res, next) => {
  try {
    const { search, sortBy = 'musicMeta.title', sortOrder = 'asc', page = 1, limit = 100 } = req.query;

    const query = {
      userId: req.user._id,
      category: 'audio',
      isTrash: false
    };

    if (search) {
      query.$or = [
        { 'musicMeta.title': { $regex: search, $options: 'i' } },
        { 'musicMeta.artist': { $regex: search, $options: 'i' } },
        { 'musicMeta.album': { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [tracks, total] = await Promise.all([
      FileItem.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      FileItem.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        tracks,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/artists
 * Aggregate list of artists with track counts
 */
router.get('/artists', async (req, res, next) => {
  try {
    const artists = await FileItem.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), category: 'audio', isTrash: false } },
      {
        $group: {
          _id: '$musicMeta.artist',
          trackCount: { $sum: 1 },
          albums: { $addToSet: '$musicMeta.album' },
          sampleCover: { $first: '$musicMeta.coverArtFilename' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: artists.map((a) => ({
        artist: a._id || 'Unknown Artist',
        trackCount: a.trackCount,
        albumCount: a.albums.filter(Boolean).length,
        sampleCover: a.sampleCover
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/albums
 * Aggregate list of albums with artist and cover art
 */
router.get('/albums', async (req, res, next) => {
  try {
    const albums = await FileItem.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), category: 'audio', isTrash: false } },
      {
        $group: {
          _id: { album: '$musicMeta.album', artist: '$musicMeta.artist' },
          trackCount: { $sum: 1 },
          year: { $first: '$musicMeta.year' },
          coverArtFilename: { $first: '$musicMeta.coverArtFilename' }
        }
      },
      { $sort: { '_id.album': 1 } }
    ]);

    res.json({
      success: true,
      data: albums.map((a) => ({
        album: a._id.album || 'Unknown Album',
        artist: a._id.artist || 'Unknown Artist',
        trackCount: a.trackCount,
        year: a.year,
        coverArtFilename: a.coverArtFilename
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/album/:albumName
 * Get tracks in an album
 */
router.get('/album/:albumName', async (req, res, next) => {
  try {
    const albumName = decodeURIComponent(req.params.albumName);
    const tracks = await FileItem.find({
      userId: req.user._id,
      category: 'audio',
      isTrash: false,
      'musicMeta.album': albumName
    }).sort({ 'musicMeta.diskNo': 1, 'musicMeta.trackNo': 1, 'musicMeta.title': 1 });

    res.json({
      success: true,
      data: {
        album: albumName,
        artist: tracks[0]?.musicMeta?.artist || 'Unknown Artist',
        coverArtFilename: tracks[0]?.musicMeta?.coverArtFilename || null,
        year: tracks[0]?.musicMeta?.year || null,
        tracks
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/playlists
 * User's playlists
 */
router.get('/playlists', async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: playlists });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/playlists
 * Create playlist
 */
router.post('/playlists', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Playlist name is required.' });
    }

    const playlist = await Playlist.create({
      name: name.trim(),
      description: description || '',
      userId: req.user._id,
      tracks: []
    });

    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/playlists/:id
 * Get single playlist with resolved tracks
 */
router.get('/playlists/:id', async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user._id });
    if (!playlist) {
      return res.status(404).json({ success: false, error: 'Playlist not found.' });
    }

    const trackIds = playlist.tracks.map((t) => t.fileId);
    const files = await FileItem.find({ _id: { $in: trackIds }, isTrash: false });
    const fileMap = new Map(files.map((f) => [f._id.toString(), f]));

    const populatedTracks = playlist.tracks
      .map((t) => fileMap.get(t.fileId.toString()))
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        ...playlist.toObject(),
        tracks: populatedTracks
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/playlists/:id/tracks
 * Add track to playlist
 */
router.post('/playlists/:id/tracks', async (req, res, next) => {
  try {
    const { fileId } = req.body;
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user._id });
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });

    const exists = playlist.tracks.some((t) => t.fileId.toString() === fileId);
    if (exists) {
      return res.status(400).json({ success: false, error: 'Track is already in playlist.' });
    }

    playlist.tracks.push({
      fileId: new mongoose.Types.ObjectId(fileId),
      order: playlist.tracks.length
    });

    await playlist.save();
    res.json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/music/playlists/:id/tracks/:fileId
 * Remove track from playlist
 */
router.delete('/playlists/:id/tracks/:fileId', async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, userId: req.user._id });
    if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found.' });

    playlist.tracks = playlist.tracks.filter((t) => t.fileId.toString() !== req.params.fileId);
    await playlist.save();
    res.json({ success: true, data: playlist });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/music/playlists/:id
 * Delete playlist
 */
router.delete('/playlists/:id', async (req, res, next) => {
  try {
    await Playlist.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Playlist deleted.' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/favorites
 * List favorite music tracks
 */
router.get('/favorites', async (req, res, next) => {
  try {
    const tracks = await FileItem.find({
      userId: req.user._id,
      category: 'audio',
      isFavorite: true,
      isTrash: false
    }).sort({ updatedAt: -1 });

    res.json({ success: true, data: tracks });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/music/history
 * Record play event
 */
router.post('/history', async (req, res, next) => {
  try {
    const { fileId } = req.body;
    if (fileId) {
      await FileItem.updateOne({ _id: fileId, userId: req.user._id }, { lastPlayedAt: new Date() });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/music/recently-played
 */
router.get('/recently-played', async (req, res, next) => {
  try {
    const tracks = await FileItem.find({
      userId: req.user._id,
      category: 'audio',
      isTrash: false,
      lastPlayedAt: { $ne: null }
    })
      .sort({ lastPlayedAt: -1 })
      .limit(30);

    res.json({ success: true, data: tracks });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
