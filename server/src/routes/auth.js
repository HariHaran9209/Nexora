// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const authMiddleware = require('../middlewares/authMiddleware');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Check if any admin exists (for initial first-time setup screen)
router.get('/status', async (req, res, next) => {
  try {
    const userCount = await User.countDocuments();
    res.json({
      success: true,
      hasUsers: userCount > 0,
      setupRequired: userCount === 0
    });
  } catch (error) {
    next(error);
  }
});

// Register user (First user is automatically admin)
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'Username, email, and password are required.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username or Email is already registered.' });
    }

    const count = await User.countDocuments();
    const role = count === 0 ? 'admin' : 'user';

    const passwordHash = await User.hashPassword(password);
    const newUser = await User.create({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role
    });

    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required.' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
    });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current logged-in user profile
router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      storageLimitBytes: req.user.storageLimitBytes
    }
  });
});

module.exports = router;
