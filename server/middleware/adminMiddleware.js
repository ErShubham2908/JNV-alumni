const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protectAdmin = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Admin authorization token is required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    if (decoded.role === 'admin') {
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

      if (!adminEmail || String(decoded.email || '').toLowerCase() !== adminEmail) {
        return res.status(403).json({ message: 'Admin access is required.' });
      }

      req.admin = { email: adminEmail };
      return next();
    }

    if (decoded.id && req.originalUrl.endsWith('/verification')) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found.' });
      }

      req.user = user;
      return next();
    }

    return res.status(403).json({ message: 'Admin access is required.' });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired admin session.' });
  }
};

module.exports = protectAdmin;
