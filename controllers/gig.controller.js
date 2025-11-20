const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const { uploadToSupabase, deleteFromSupabase } = require('../services/supabaseService');
const Gig = require('../models/Gig');
const User = require('../models/User');

/**
 * Create new gig
 * @route POST /api/v1/gigs
 * @access Private (Developer only)
 */
exports.createGig = catchAsync(async (req, res, next) => {
  // Verify user is a developer
  if (req.user.role !== 'developer' && req.user.role !== 'both') {
    return next(new AppError('Only developers can create gigs', 403));
  }

  const gigData = {
    ...req.body,
    developer: req.user._id
  };

  const gig = await Gig.create(gigData);

  // Update user statistics
  await req.user.incrementStats('gigsPosted');

  const populatedGig = await Gig.findById(gig._id).populate('developer', 'profile email reputation');

  sendCreatedResponse(res, 'Gig created successfully', populatedGig);
});

/**
 * Get all gigs with pagination and filtering
 * @route GET /api/v1/gigs
 * @access Public
 */
exports.getAllGigs = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { category, minPrice, maxPrice, skills, deliveryTime, status } = req.query;

  const filter = { isActive: true };

  if (status) {
    filter.status = status;
  } else {
    filter.status = 'active';
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    filter.skills = { $in: skillArray };
  }

  if (minPrice || maxPrice) {
    filter['pricing.amount'] = {};
    if (minPrice) filter['pricing.amount'].$gte = parseFloat(minPrice);
    if (maxPrice) filter['pricing.amount'].$lte = parseFloat(maxPrice);
  }

  if (deliveryTime) {
    filter.deliveryTime = { $lte: parseInt(deliveryTime) };
  }

  const [gigs, total] = await Promise.all([
    Gig.find(filter)
      .populate('developer', 'profile email reputation')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Gig.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, 200, 'Gigs retrieved successfully', gigs, { page, limit, total });
});

/**
 * Get gig by ID
 * @route GET /api/v1/gigs/:id
 * @access Public
 */
exports.getGigById = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id)
    .populate('developer', 'profile email reputation statistics');

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  // Increment view count
  await gig.incrementViews();

  sendSuccessResponse(res, 200, 'Gig retrieved successfully', gig);
});

/**
 * Update gig
 * @route PUT /api/v1/gigs/:id
 * @access Private (Owner only)
 */
exports.updateGig = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  // Check ownership
  if (gig.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own gigs', 403));
  }

  // Update gig
  Object.assign(gig, req.body);
  await gig.save();

  const updatedGig = await Gig.findById(gig._id).populate('developer', 'profile email reputation');

  sendSuccessResponse(res, 200, 'Gig updated successfully', updatedGig);
});

/**
 * Delete gig
 * @route DELETE /api/v1/gigs/:id
 * @access Private (Owner only)
 */
exports.deleteGig = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  // Check ownership
  if (gig.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only delete your own gigs', 403));
  }

  // Soft delete - mark as inactive
  gig.isActive = false;
  gig.status = 'inactive';
  await gig.save();

  sendSuccessResponse(res, 200, 'Gig deleted successfully', null);
});

/**
 * Search gigs
 * @route GET /api/v1/gigs/search
 * @access Public
 */
exports.searchGigs = catchAsync(async (req, res, next) => {
  const { q, category, skills } = req.query;

  if (!q || q.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  const filter = {
    status: 'active',
    isActive: true,
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { skills: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } }
    ]
  };

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (skills) {
    const skillArray = skills.split(',').map(s => s.trim());
    filter.skills = { $in: skillArray };
  }

  const gigs = await Gig.find(filter)
    .populate('developer', 'profile email reputation')
    .limit(20)
    .sort({ 'rating.average': -1, createdAt: -1 });

  sendSuccessResponse(res, 200, 'Search results', gigs);
});

/**
 * Upload gig images
 * @route POST /api/v1/gigs/:id/images
 * @access Private (Owner only)
 */
exports.uploadGigImages = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  // Check ownership
  if (gig.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own gigs', 403));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  // Upload images to Supabase
  const uploadPromises = req.files.map(file => uploadToSupabase(file, 'gig-images'));
  const imageUrls = await Promise.all(uploadPromises);

  // Add images to gig
  const newImages = imageUrls.map(url => ({ url }));
  gig.images.push(...newImages);
  await gig.save();

  sendSuccessResponse(res, 200, 'Images uploaded successfully', {
    images: gig.images
  });
});

/**
 * Delete gig image
 * @route DELETE /api/v1/gigs/:id/images/:imageIndex
 * @access Private (Owner only)
 */
exports.deleteGigImage = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  // Check ownership
  if (gig.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only update your own gigs', 403));
  }

  const imageIndex = parseInt(req.params.imageIndex);
  
  if (imageIndex < 0 || imageIndex >= gig.images.length) {
    return next(new AppError('Invalid image index', 400));
  }

  // Delete from Supabase
  const imageUrl = gig.images[imageIndex].url;
  await deleteFromSupabase(imageUrl).catch(() => {});

  // Remove from array
  gig.images.splice(imageIndex, 1);
  await gig.save();

  sendSuccessResponse(res, 200, 'Image deleted successfully', {
    images: gig.images
  });
});

/**
 * Get gigs by category
 * @route GET /api/v1/gigs/category/:category
 * @access Public
 */
exports.getGigsByCategory = catchAsync(async (req, res, next) => {
  const gigs = await Gig.findByCategory(req.params.category);

  sendSuccessResponse(res, 200, 'Gigs retrieved successfully', gigs);
});

/**
 * Increment gig inquiry count
 * @route POST /api/v1/gigs/:id/inquire
 * @access Private
 */
exports.inquireGig = catchAsync(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    return next(new AppError('Gig not found', 404));
  }

  await gig.incrementInquiries();

  sendSuccessResponse(res, 200, 'Inquiry recorded', {
    inquiries: gig.statistics.inquiries
  });
});
