const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse } = require('../utils/responseHandler');
const { generateToken, generateRefreshToken } = require('../middlewares/auth');
const User = require('../models/User');

/**
 * Register a new user (client/developer/both)
 * @route POST /api/v1/auth/register
 * @access Public
 */
exports.register = catchAsync(async (req, res, next) => {
  const { email, walletAddress, role, profile } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { walletAddress: walletAddress.toUpperCase() }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return next(new AppError('Email already registered', 409));
    }
    if (existingUser.walletAddress === walletAddress.toUpperCase()) {
      return next(new AppError('Wallet address already registered', 409));
    }
  }

  // Create user
  const user = await User.create({
    email,
    walletAddress: walletAddress.toUpperCase(),
    role: role || 'both',
    profile: profile || {}
  });

  // Generate tokens
  const accessToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Update last login
  await user.updateLastLogin();

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.__v;

  sendCreatedResponse(res, 'Registration successful', {
    user: userResponse,
    accessToken,
    refreshToken
  });
});

/**
 * Login with wallet address
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { walletAddress, signature } = req.body;

  if (!walletAddress) {
    return next(new AppError('Wallet address is required', 400));
  }

  // Find user by wallet address
  const user = await User.findByWallet(walletAddress);

  if (!user) {
    return next(new AppError('User not found. Please register first.', 404));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // TODO: Verify wallet signature when implementing frontend
  // For now, we'll skip signature verification in development
  // In production, verify that the signature matches the wallet address

  // Generate tokens
  const accessToken = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Update last login
  await user.updateLastLogin();

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.__v;

  sendSuccessResponse(res, 200, 'Login successful', {
    user: userResponse,
    accessToken,
    refreshToken
  });
});

/**
 * Refresh access token
 * @route POST /api/v1/auth/refresh
 * @access Public
 */
exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError('Refresh token is required', 400));
  }

  const jwt = require('jsonwebtoken');
  const environmentConfig = require('../config/environment');
  const config = environmentConfig.getConfig();

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    if (decoded.type !== 'refresh') {
      return next(new AppError('Invalid refresh token', 400));
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError('User no longer exists', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated', 403));
    }

    // Generate new tokens
    const newAccessToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    sendSuccessResponse(res, 200, 'Token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid refresh token', 400));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token has expired. Please log in again.', 401));
    }
    throw error;
  }
});

/**
 * Logout user
 * @route POST /api/v1/auth/logout
 * @access Private
 */
exports.logout = catchAsync(async (req, res, next) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // Here we can add token to a blacklist if needed in the future
  
  sendSuccessResponse(res, 200, 'Logout successful', null);
});

/**
 * Get current authenticated user
 * @route GET /api/v1/auth/me
 * @access Private
 */
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate('gigs')
    .select('-__v');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendSuccessResponse(res, 200, 'User retrieved successfully', user);
});

/**
 * Verify wallet ownership
 * @route POST /api/v1/auth/verify-wallet
 * @access Private
 */
exports.verifyWallet = catchAsync(async (req, res, next) => {
  const { walletAddress, signature, message } = req.body;

  if (!walletAddress || !signature || !message) {
    return next(new AppError('Wallet address, signature, and message are required', 400));
  }

  // Verify the wallet address matches the authenticated user
  if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return next(new AppError('Wallet address does not match authenticated user', 403));
  }

  // TODO: Implement actual signature verification using ethers.js
  // const ethers = require('ethers');
  // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  // if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
  //   return next(new AppError('Invalid signature', 400));
  // }

  // Update user verification status
  req.user.isVerified = true;
  await req.user.save({ validateBeforeSave: false });

  sendSuccessResponse(res, 200, 'Wallet verified successfully', {
    isVerified: true,
    walletAddress: req.user.walletAddress
  });
});

/**
 * Check if email or wallet exists
 * @route POST /api/v1/auth/check-availability
 * @access Public
 */
exports.checkAvailability = catchAsync(async (req, res, next) => {
  const { email, walletAddress } = req.body;

  const result = {
    emailAvailable: true,
    walletAvailable: true
  };

  if (email) {
    const emailExists = await User.findOne({ email });
    result.emailAvailable = !emailExists;
  }

  if (walletAddress) {
    const walletExists = await User.findByWallet(walletAddress);
    result.walletAvailable = !walletExists;
  }

  sendSuccessResponse(res, 200, 'Availability checked', result);
});
