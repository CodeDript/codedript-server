const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const { uploadToSupabase, deleteFromSupabase } = require('../services/supabaseService');
const User = require('../models/User');

/**
 * Get all users with pagination and filtering
 * @route GET /api/v1/users
 * @access Public
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { role, skills, verified } = req.query;

  const filter = { isActive: true };
  
  if (role && role !== 'all') {
    filter.role = role === 'both' ? 'both' : { $in: [role, 'both'] };
  }
  
  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    filter['profile.skills'] = { $in: skillArray };
  }
  
  if (verified !== undefined) {
    filter.isVerified = verified === 'true';
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-__v')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, 200, 'Users retrieved successfully', users, { page, limit, total });
});

/**
 * Get user by ID
 * @route GET /api/v1/users/:id
 * @access Public
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate({
      path: 'gigs',
      match: { status: 'active' }
    })
    .select('-__v');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  sendSuccessResponse(res, 200, 'User retrieved successfully', user);
});

/**
 * Update user profile
 * @route PUT /api/v1/users/:id
 * @access Private
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check ownership
  if (user._id.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own profile', 403));
  }

  // Fields allowed to update
  const allowedFields = ['profile'];
  const updates = {};

  if (req.body.profile) {
    updates.profile = {
      ...user.profile,
      ...req.body.profile
    };
  }

  // Update user
  Object.assign(user, updates);
  await user.save();

  sendSuccessResponse(res, 200, 'Profile updated successfully', user);
});

/**
 * Upload user avatar
 * @route POST /api/v1/users/:id/avatar
 * @access Private
 */
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check ownership
  if (user._id.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own avatar', 403));
  }

  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  // Delete old avatar if exists
  if (user.profile.avatar) {
    await deleteFromSupabase(user.profile.avatar).catch(() => {});
  }

  // Upload new avatar
  const avatarUrl = await uploadToSupabase(req.file, 'avatars');
  user.profile.avatar = avatarUrl;
  await user.save({ validateBeforeSave: false });

  sendSuccessResponse(res, 200, 'Avatar uploaded successfully', {
    avatar: avatarUrl
  });
});

/**
 * Search users
 * @route GET /api/v1/users/search
 * @access Public
 */
exports.searchUsers = catchAsync(async (req, res, next) => {
  const { q, role, skills } = req.query;

  if (!q || q.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  const filter = {
    isActive: true,
    $or: [
      { 'profile.name': { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { 'profile.skills': { $regex: q, $options: 'i' } }
    ]
  };

  if (role && role !== 'all') {
    filter.role = role === 'both' ? 'both' : { $in: [role, 'both'] };
  }

  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    filter['profile.skills'] = { $in: skillArray };
  }

  const users = await User.find(filter)
    .select('profile email reputation role createdAt')
    .limit(20);

  sendSuccessResponse(res, 200, 'Search results', users);
});

/**
 * Get user statistics
 * @route GET /api/v1/users/:id/statistics
 * @access Public
 */
exports.getUserStatistics = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('statistics reputation');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const Agreement = require('../models/Agreement');
  const Gig = require('../models/Gig');

  const [activeAgreements, completedAgreements, activeGigs] = await Promise.all([
    Agreement.countDocuments({
      $or: [{ client: user._id }, { developer: user._id }],
      status: { $in: ['active', 'in_progress'] }
    }),
    Agreement.countDocuments({
      $or: [{ client: user._id }, { developer: user._id }],
      status: 'completed'
    }),
    Gig.countDocuments({ developer: user._id, status: 'active' })
  ]);

  const statistics = {
    ...user.statistics.toObject(),
    activeAgreements,
    completedAgreements,
    activeGigs,
    reputation: user.reputation
  };

  sendSuccessResponse(res, 200, 'User statistics retrieved', statistics);
});

/**
 * Get user agreements
 * @route GET /api/v1/users/:id/agreements
 * @access Private
 */
exports.getUserAgreements = catchAsync(async (req, res, next) => {
  const { status, role } = req.query;

  // Check if requesting own agreements or if admin
  if (req.params.id !== req.user._id.toString()) {
    return next(new AppError('You can only view your own agreements', 403));
  }

  const Agreement = require('../models/Agreement');
  
  let filter = {
    $or: [{ client: req.params.id }, { developer: req.params.id }]
  };

  if (status) {
    filter.status = status;
  }

  if (role === 'client') {
    filter = { client: req.params.id };
    if (status) filter.status = status;
  } else if (role === 'developer') {
    filter = { developer: req.params.id };
    if (status) filter.status = status;
  }

  const agreements = await Agreement.find(filter)
    .populate('client developer gig')
    .sort({ 'metadata.lastActivityAt': -1 });

  sendSuccessResponse(res, 200, 'User agreements retrieved', agreements);
});

/**
 * Get user gigs
 * @route GET /api/v1/users/:id/gigs
 * @access Public
 */
exports.getUserGigs = catchAsync(async (req, res, next) => {
  const Gig = require('../models/Gig');
  const { status } = req.query;

  const filter = { developer: req.params.id };
  
  if (status) {
    filter.status = status;
  } else {
    filter.status = 'active'; // Default to active gigs
  }

  const gigs = await Gig.find(filter)
    .populate('developer', 'profile email reputation')
    .sort({ createdAt: -1 });

  sendSuccessResponse(res, 200, 'User gigs retrieved', gigs);
});

/**
 * Deactivate user account
 * @route DELETE /api/v1/users/:id
 * @access Private
 */
exports.deactivateAccount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check ownership
  if (user._id.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only deactivate your own account', 403));
  }

  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  sendSuccessResponse(res, 200, 'Account deactivated successfully', null);
});
