const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getIsMemoryMode, getMemoryStore } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'civictrust_hackathon_super_secret_jwt_key_2026';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (getIsMemoryMode()) {
        const store = getMemoryStore();
        const user = store.users.find((u) => u._id.toString() === decoded.id.toString());
        if (!user) {
          return res.status(401).json({ message: 'User not found in session' });
        }
        req.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          ward: user.ward,
          phone: user.phone,
        };
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
      }

      return next();
    } catch (error) {
      console.error('Auth protect error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Municipal Reviewer/Admin privileges required.' });
  }
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  protect,
  adminOnly,
  generateToken,
  JWT_SECRET,
};
