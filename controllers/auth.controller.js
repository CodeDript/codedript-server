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
  const { email, walletAddress, password, role, profile } = req.body;

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

  // Create user (password will be hashed by pre-save middleware)
  const user = await User.create({
    email,
    walletAddress: walletAddress.toUpperCase(),
    password, // Optional - for email login
    role: role || 'both',
    profile: profile || {}
  });

  // Generate tokens (include walletAddress in the token payload)
  const accessToken = generateToken({ id: user._id, walletAddress: user.walletAddress });
  const refreshToken = generateRefreshToken({ id: user._id, walletAddress: user.walletAddress });

  // Update last login (will set firstLogin)
  await user.updateLastLogin();

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.__v;
  delete userResponse.password;

  sendCreatedResponse(res, 'Registration successful', {
    user: userResponse,
    token: accessToken,
    refreshToken
  });
});

/**
 * Login with wallet address or email/password
 * @route POST /api/v1/auth/login
 * @access Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { walletAddress, email, password } = req.body;

  let user;

  // Login with wallet address
  if (walletAddress) {
    // Find user by wallet address
    user = await User.findByWallet(walletAddress);

    if (!user) {
      return next(new AppError('User not found. Please register first.', 404));
    }
  } 
  // Login with email and password
  else if (email && password) {
    // Find user by email and include password field
    user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }
  } 
  else {
    return next(new AppError('Please provide wallet address or email and password', 400));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 403));
  }

  // Generate tokens (include walletAddress in the token payload)
  const accessToken = generateToken({ id: user._id, walletAddress: user.walletAddress });
  const refreshToken = generateRefreshToken({ id: user._id, walletAddress: user.walletAddress });

  // Update last login (tracks first login automatically)
  await user.updateLastLogin();

  // Remove sensitive data
  const userResponse = user.toObject();
  delete userResponse.__v;
  delete userResponse.password;

  sendSuccessResponse(res, 200, 'Login successful', {
    user: userResponse,
    token: accessToken, // Changed from accessToken to token for frontend compatibility
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

    // Generate new tokens (preserve walletAddress in payload)
    const newAccessToken = generateToken({ id: user._id, walletAddress: user.walletAddress });
    const newRefreshToken = generateRefreshToken({ id: user._id, walletAddress: user.walletAddress });

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
