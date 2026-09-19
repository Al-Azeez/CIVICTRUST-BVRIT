const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, generateToken } = require('../middleware/authMiddleware');
const { getIsMemoryMode, getMemoryStore } = require('../config/db');

// @route   POST /api/auth/register (Citizen only - Rule: Admin accounts created through seed data only)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, ward, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ message: 'User with this email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        _id: 'user_' + Date.now(),
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'citizen', // Enforce citizen role
        ward: ward || 'Ward 1 - Central Market',
        phone: phone || '',
        createdAt: new Date(),
      };

      store.users.push(newUser);
      const token = generateToken(newUser._id, newUser.role);

      return res.status(201).json({
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          ward: newUser.ward,
          phone: newUser.phone,
        },
      });
    }

    // MongoDB Mode
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'citizen', // Strictly citizen
      ward: ward || 'Ward 1 - Central Market',
      phone: phone || '',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward: user.ward,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = generateToken(user._id, user.role);
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          ward: user.ward,
          phone: user.phone,
        },
      });
    }

    // MongoDB Mode
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ward: user.ward,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// @route   GET /api/auth/demo-users
router.get('/demo-users', (req, res) => {
  res.json({
    admin: {
      email: 'admin@civictrust.org',
      role: 'admin',
      label: 'Azeez (Municipal Reviewer)',
    },
    citizen: {
      email: 'citizen@civictrust.org',
      role: 'citizen',
      label: 'Abdul (Citizen)',
    },
  });
});

module.exports = router;
