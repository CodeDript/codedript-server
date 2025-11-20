const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const environmentConfig = require('../config/environment');

/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Or from cookies (if using cookie-based auth)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    // Verify token
    const config = environmentConfig.getConfig();
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-__v');
    
    if (!user) {
      return next(new AppError('User no longer exists. Please log in again.', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 403));
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    next(error);
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const config = environmentConfig.getConfig();
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(decoded.id).select('-__v');
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
      }
    }

    next();
  } catch (error) {
    // Ignore errors and continue without user
    next();
  }
};

/**
 * Verify wallet address matches authenticated user
 */
const verifyWallet = (req, res, next) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return next(new AppError('Wallet address is required', 400));
    }

    // Compare wallet addresses (case-insensitive)
    if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return next(new AppError('Wallet address does not match authenticated user', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict access to specific roles
 * @param  {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Check if user's role is in allowed roles
    // For 'both' role, check if any of the required roles are client or developer
    const userRoles = req.user.role === 'both' ? ['client', 'developer', 'both'] : [req.user.role];
    const hasPermission = roles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Verify user owns the resource
 * Checks if req.user._id matches req.params.userId or req.params.id
 */
const verifyOwnership = (paramName = 'id', userField = '_id') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const resourceUserId = req.params[paramName];
    const authenticatedUserId = req.user[userField].toString();

    if (resourceUserId !== authenticatedUserId) {
      return next(new AppError('You do not have permission to access this resource', 403));
    }

    next();
  };
};

/**
 * Generate JWT token
 * @param {string} userId - User ID to encode
 * @param {string} expiresIn - Token expiration time
 */
const generateToken = (userId, expiresIn = null) => {
  const config = environmentConfig.getConfig();
  
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: expiresIn || config.jwt.expiresIn }
  );
};

/**
 * Generate refresh token
 * @param {string} userId - User ID to encode
 */
const generateRefreshToken = (userId) => {
  const config = environmentConfig.getConfig();
  
  return jwt.sign(
    { id: userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token is required', 400));
    }

    const config = environmentConfig.getConfig();
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    if (decoded.type !== 'refresh') {
      return next(new AppError('Invalid refresh token', 400));
    }

    req.tokenUserId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid refresh token', 400));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token has expired', 401));
    }
    next(error);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  verifyWallet,
  restrictTo,
  verifyOwnership,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
};
