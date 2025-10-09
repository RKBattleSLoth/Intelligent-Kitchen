const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getEnvVar } = require('../config/env');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const jwtSecret = getEnvVar('JWT_SECRET');
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Get user from database
    const result = await query(
      'SELECT id, email, first_name, last_name, dietary_preference, health_goal FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const jwtSecret = getEnvVar('JWT_SECRET');
    if (!jwtSecret) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    const result = await query(
      'SELECT id, email, first_name, last_name, dietary_preference, health_goal FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = { authenticateToken, optionalAuth };