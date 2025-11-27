const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('../utils/errorHandler');
const { getConfig } = require('../config/environment');

/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

/**
 * Generate JWT token
 */
const generateToken = (payload, expiresIn = null) => {
  const config = getConfig();
  
  return jwt.sign(
    payload,
    config.jwt?.secret || process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: expiresIn || config.jwt?.expiresIn || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  const config = getConfig();
  
  return jwt.sign(
    payload,
    config.jwt?.secret || process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: config.jwt?.refreshExpiresIn || '30d' }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  const config = getConfig();
  
  try {
    return jwt.verify(token, config.jwt?.secret || process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

/**
 * Protect route - require authentication
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      throw new AuthenticationError('No token provided. Please login to access this resource');
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AuthenticationError('You must be logged in');
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AuthorizationError(
        `You do not have permission to perform this action. Required roles: ${roles.join(', ')}`
      );
    }
    
    next();
  };
};

/**
 * Optional authentication - attach user if token exists but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  protect,
  restrictTo,
  optionalAuth
};
