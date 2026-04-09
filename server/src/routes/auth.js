const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');

const router = express.Router();

/**
 * POST /api/auth/register
 * Create a new user account.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email,
      passwordHash: password, // pre-save hook hashes this
      name,
    });

    const accessToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });

    const refreshToken = jwt.sign({ userId: user._id }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY,
    });

    res.status(201).json({
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate and receive JWT tokens.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });

    const refreshToken = jwt.sign({ userId: user._id }, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY,
    });

    res.json({
      user: user.toJSON(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token.
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = jwt.sign({ userId: user._id }, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
    });

    res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user.
 */
const { auth } = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
