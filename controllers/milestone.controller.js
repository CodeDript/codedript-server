const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const { uploadToSupabase, deleteFromSupabase } = require('../services/supabaseService');
const Milestone = require('../models/Milestone');
const Agreement = require('../models/Agreement');

/**
 * Create new milestone
 * @route POST /api/v1/milestones
 * @access Private
 */
exports.createMilestone = catchAsync(async (req, res, next) => {
  const { agreementId, title, description, deliverables, financials, timeline } = req.body;

  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is part of the agreement
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  // Get next milestone number
  const milestoneCount = await Milestone.countDocuments({ agreement: agreementId });

  const milestone = await Milestone.create({
    agreement: agreementId,
    milestoneNumber: milestoneCount + 1,
    title,
    description,
    deliverables,
    financials,
    timeline
  });

  // Add milestone to agreement
  agreement.milestones.push(milestone._id);
  await agreement.updateMilestoneStats();

  const populatedMilestone = await Milestone.findById(milestone._id)
    .populate('agreement')
    .populate('submission.submittedBy review.reviewedBy');

  sendCreatedResponse(res, 'Milestone created successfully', populatedMilestone);
});

/**
 * Get all milestones for an agreement
 * @route GET /api/v1/milestones/agreement/:agreementId
 * @access Private
 */
exports.getMilestonesByAgreement = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.agreementId);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  const milestones = await Milestone.findByAgreement(req.params.agreementId);

  sendSuccessResponse(res, 200, 'Milestones retrieved successfully', milestones);
});

/**
 * Get milestone by ID
 * @route GET /api/v1/milestones/:id
 * @access Private
 */
exports.getMilestoneById = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id)
    .populate('agreement')
    .populate('submission.submittedBy review.reviewedBy')
    .populate('revisions.requestedBy');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  sendSuccessResponse(res, 200, 'Milestone retrieved successfully', milestone);
});

/**
 * Update milestone
 * @route PUT /api/v1/milestones/:id
 * @access Private
 */
exports.updateMilestone = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  // Only allow updates if milestone is pending or in_progress
  if (!['pending', 'in_progress'].includes(milestone.status)) {
    return next(new AppError('Cannot update milestone in current status', 400));
  }

  const allowedFields = ['title', 'description', 'deliverables', 'timeline'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field]) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(milestone, updates);
  await milestone.save();

  sendSuccessResponse(res, 200, 'Milestone updated successfully', milestone);
});

/**
 * Start milestone progress
 * @route POST /api/v1/milestones/:id/start
 * @access Private (Developer only)
 */
exports.startMilestone = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  
  if (agreement.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the developer can start the milestone', 403));
  }

  if (milestone.status !== 'pending') {
    return next(new AppError('Milestone must be in pending status to start', 400));
  }

  await milestone.startProgress();

  sendSuccessResponse(res, 200, 'Milestone started successfully', milestone);
});

/**
 * Submit milestone for review
 * @route POST /api/v1/milestones/:id/submit
 * @access Private (Developer only)
 */
exports.submitMilestone = catchAsync(async (req, res, next) => {
  const { notes } = req.body;
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  
  if (agreement.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the developer can submit the milestone', 403));
  }

  if (milestone.status !== 'in_progress' && milestone.status !== 'revision_requested') {
    return next(new AppError('Milestone must be in progress to submit', 400));
  }

  // Handle file uploads if present
  const files = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(file => uploadToSupabase(file, 'milestone-submissions'));
    const urls = await Promise.all(uploadPromises);
    
    urls.forEach((url, index) => {
      files.push({
        name: req.files[index].originalname,
        url,
        uploadedAt: new Date()
      });
    });
  }

  await milestone.submit(req.user._id, notes, files);

  sendSuccessResponse(res, 200, 'Milestone submitted for review', milestone);
});

/**
 * Approve milestone
 * @route POST /api/v1/milestones/:id/approve
 * @access Private (Client only)
 */
exports.approveMilestone = catchAsync(async (req, res, next) => {
  const { rating, feedback } = req.body;
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  
  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can approve the milestone', 403));
  }

  if (milestone.status !== 'submitted' && milestone.status !== 'in_review') {
    return next(new AppError('Milestone must be submitted before approval', 400));
  }

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  await milestone.approve(req.user._id, rating, feedback);

  // Release payment for this milestone
  if (milestone.financials.value > 0) {
    await agreement.releasePayment(milestone.financials.value);
  }

  sendSuccessResponse(res, 200, 'Milestone approved successfully', milestone);
});

/**
 * Request revision for milestone
 * @route POST /api/v1/milestones/:id/request-revision
 * @access Private (Client only)
 */
exports.requestRevision = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  
  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can request revisions', 403));
  }

  if (milestone.status !== 'submitted' && milestone.status !== 'in_review') {
    return next(new AppError('Milestone must be submitted before requesting revision', 400));
  }

  if (!reason) {
    return next(new AppError('Revision reason is required', 400));
  }

  await milestone.requestRevision(req.user._id, reason);

  sendSuccessResponse(res, 200, 'Revision requested successfully', milestone);
});

/**
 * Upload milestone files
 * @route POST /api/v1/milestones/:id/files
 * @access Private
 */
exports.uploadMilestoneFiles = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isDeveloper) {
    return next(new AppError('Only the developer can upload milestone files', 403));
  }

  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one file', 400));
  }

  const uploadPromises = req.files.map(file => uploadToSupabase(file, 'milestone-files'));
  const urls = await Promise.all(uploadPromises);

  const files = urls.map((url, index) => ({
    name: req.files[index].originalname,
    url,
    uploadedAt: new Date()
  }));

  milestone.submission.files.push(...files);
  await milestone.save();

  sendSuccessResponse(res, 200, 'Files uploaded successfully', {
    files: milestone.submission.files
  });
});

/**
 * Delete milestone
 * @route DELETE /api/v1/milestones/:id
 * @access Private
 */
exports.deleteMilestone = catchAsync(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id);
  const isClient = agreement.client.toString() === req.user._id.toString();

  if (!isClient) {
    return next(new AppError('Only the client can delete milestones', 403));
  }

  // Can only delete if pending or in draft agreement
  if (milestone.status !== 'pending' && agreement.status !== 'draft') {
    return next(new AppError('Cannot delete milestone in current status', 400));
  }

  // Remove from agreement
  agreement.milestones = agreement.milestones.filter(
    m => m.toString() !== milestone._id.toString()
  );
  await agreement.updateMilestoneStats();

  // Delete milestone
  milestone.metadata.isActive = false;
  await milestone.save();

  sendSuccessResponse(res, 200, 'Milestone deleted successfully', null);
});

/**
 * Get overdue milestones
 * @route GET /api/v1/milestones/overdue
 * @access Private
 */
exports.getOverdueMilestones = catchAsync(async (req, res, next) => {
  const overdueMilestones = await Milestone.findOverdue();

  // Filter to only show user's milestones
  const userMilestones = [];
  
  for (const milestone of overdueMilestones) {
    const agreement = await Agreement.findById(milestone.agreement);
    const isClient = agreement.client.toString() === req.user._id.toString();
    const isDeveloper = agreement.developer.toString() === req.user._id.toString();
    
    if (isClient || isDeveloper) {
      userMilestones.push(milestone);
    }
  }

  sendSuccessResponse(res, 200, 'Overdue milestones retrieved', userMilestones);
});

/**
 * Get milestone statistics
 * @route GET /api/v1/milestones/statistics
 * @access Private
 */
exports.getMilestoneStatistics = catchAsync(async (req, res, next) => {
  const agreements = await Agreement.find({
    $or: [{ client: req.user._id }, { developer: req.user._id }]
  });

  const agreementIds = agreements.map(a => a._id);

  const [
    totalMilestones,
    pending,
    inProgress,
    submitted,
    approved,
    overdue
  ] = await Promise.all([
    Milestone.countDocuments({ agreement: { $in: agreementIds } }),
    Milestone.countDocuments({ agreement: { $in: agreementIds }, status: 'pending' }),
    Milestone.countDocuments({ agreement: { $in: agreementIds }, status: 'in_progress' }),
    Milestone.countDocuments({ agreement: { $in: agreementIds }, status: 'submitted' }),
    Milestone.countDocuments({ agreement: { $in: agreementIds }, status: 'approved' }),
    Milestone.countDocuments({
      agreement: { $in: agreementIds },
      'timeline.dueDate': { $lt: new Date() },
      status: { $nin: ['completed', 'approved'] }
    })
  ]);

  const statistics = {
    totalMilestones,
    pending,
    inProgress,
    submitted,
    approved,
    overdue
  };

  sendSuccessResponse(res, 200, 'Milestone statistics retrieved', statistics);
});
