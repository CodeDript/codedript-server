const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const { uploadToSupabase, deleteFromSupabase } = require('../services/supabaseService');
const { generatePDF } = require('../services/pdfService');
const Agreement = require('../models/Agreement');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

/**
 * Create new agreement
 * @route POST /api/v1/agreements
 * @access Private
 */
exports.createAgreement = catchAsync(async (req, res, next) => {
  const { agreementId, developerId, gigId, project, financials, milestones, terms } = req.body;

  // Verify developer exists
  const developer = await User.findById(developerId);
  if (!developer) {
    return next(new AppError('Developer not found', 404));
  }

  if (developer.role !== 'developer' && developer.role !== 'both') {
    return next(new AppError('Selected user is not a developer', 400));
  }

  // Auto-generate agreementId if not provided
  const generatedAgreementId = agreementId || `AGR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Create agreement
  const agreementData = {
    agreementId: generatedAgreementId,
    client: req.user._id,
    developer: developerId,
    gig: gigId || undefined,
    project,
    financials,
    terms: terms || {},
    status: 'draft'
  };

  const agreement = await Agreement.create(agreementData);

  // Create milestones if provided
  if (milestones && milestones.length > 0) {
    const milestonePromises = milestones.map((milestone, index) => 
      Milestone.create({
        agreement: agreement._id,
        milestoneNumber: index + 1,
        ...milestone
      })
    );
    
    const createdMilestones = await Promise.all(milestonePromises);
    agreement.milestones = createdMilestones.map(m => m._id);
    await agreement.updateMilestoneStats();
  }

  // Update user statistics
  await req.user.incrementStats('agreementsCreated');

  const populatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer gig')
    .populate('milestones');

  sendCreatedResponse(res, 'Agreement created successfully', populatedAgreement);
});

/**
 * Get all agreements with pagination and filtering
 * @route GET /api/v1/agreements
 * @access Private
 */
exports.getAllAgreements = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { status, role } = req.query;

  let filter = {
    $or: [{ client: req.user._id }, { developer: req.user._id }]
  };

  if (status) {
    filter.status = status;
  }

  if (role === 'client') {
    filter = { client: req.user._id };
    if (status) filter.status = status;
  } else if (role === 'developer') {
    filter = { developer: req.user._id };
    if (status) filter.status = status;
  }

  const [agreements, total] = await Promise.all([
    Agreement.find(filter)
      .populate('client developer gig')
      .populate('milestones')
      .skip(skip)
      .limit(limit)
      .sort({ 'metadata.lastActivityAt': -1 }),
    Agreement.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, 200, 'Agreements retrieved successfully', agreements, { page, limit, total });
});

/**
 * Get agreement by ID
 * @route GET /api/v1/agreements/:id
 * @access Private
 */
exports.getAgreementById = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id)
    .populate('client developer gig')
    .populate('milestones')
    .populate('modifications.modifiedBy modifications.approvedBy');

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is part of the agreement
  const isClient = agreement.client._id.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer._id.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this agreement', 403));
  }

  sendSuccessResponse(res, 200, 'Agreement retrieved successfully', agreement);
});

/**
 * Update agreement
 * @route PUT /api/v1/agreements/:id
 * @access Private
 */
exports.updateAgreement = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is part of the agreement
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this agreement', 403));
  }

  // Only allow updates if agreement is in draft status
  if (agreement.status !== 'draft') {
    return next(new AppError('Cannot update agreement after it has been submitted. Please use modification request.', 400));
  }

  // Update allowed fields
  const allowedFields = ['project', 'financials', 'terms'];
  const updates = {};

  allowedFields.forEach(field => {
    if (req.body[field]) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(agreement, updates);
  await agreement.save();

  const updatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer gig')
    .populate('milestones');

  sendSuccessResponse(res, 200, 'Agreement updated successfully', updatedAgreement);
});

/**
 * Sign agreement
 * @route POST /api/v1/agreements/:id/sign
 * @access Private
 */
exports.signAgreement = catchAsync(async (req, res, next) => {
  const { walletAddress, signature } = req.body;
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Determine user role in agreement
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  // Verify wallet address matches user
  if (req.user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return next(new AppError('Wallet address does not match your account', 403));
  }

  const userRole = isClient ? 'client' : 'developer';
  
  // Check if already signed
  if (agreement.signatures[userRole].signed) {
    return next(new AppError('You have already signed this agreement', 400));
  }

  await agreement.signAgreement(req.user._id, walletAddress, userRole);

  // If both parties signed, update status
  if (agreement.isFullySigned) {
    agreement.status = 'active';
    await agreement.save();
  }

  const updatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer gig')
    .populate('milestones');

  sendSuccessResponse(res, 200, 'Agreement signed successfully', updatedAgreement);
});

/**
 * Submit agreement for acceptance
 * @route POST /api/v1/agreements/:id/submit
 * @access Private
 */
exports.submitAgreement = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Only client can submit
  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can submit the agreement', 403));
  }

  if (agreement.status !== 'draft') {
    return next(new AppError('Agreement has already been submitted', 400));
  }

  agreement.status = 'pending_acceptance';
  await agreement.save();

  // TODO: Send notification to developer

  sendSuccessResponse(res, 200, 'Agreement submitted for acceptance', agreement);
});

/**
 * Accept or reject agreement
 * @route POST /api/v1/agreements/:id/respond
 * @access Private
 */
exports.respondToAgreement = catchAsync(async (req, res, next) => {
  const { action } = req.body; // 'accept' or 'reject'
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Only developer can respond
  if (agreement.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the developer can respond to this agreement', 403));
  }

  if (agreement.status !== 'pending_acceptance') {
    return next(new AppError('Agreement is not pending acceptance', 400));
  }

  if (action === 'accept') {
    agreement.status = 'active';
  } else if (action === 'reject') {
    agreement.status = 'cancelled';
  } else {
    return next(new AppError('Invalid action. Use "accept" or "reject"', 400));
  }

  await agreement.save();

  sendSuccessResponse(res, 200, `Agreement ${action}ed successfully`, agreement);
});

/**
 * Request modification to agreement
 * @route POST /api/v1/agreements/:id/modifications
 * @access Private
 */
exports.requestModification = catchAsync(async (req, res, next) => {
  const { modificationType, description, previousValue, newValue } = req.body;
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  agreement.modifications.push({
    modifiedBy: req.user._id,
    modificationType,
    description,
    previousValue,
    newValue,
    status: 'pending'
  });

  await agreement.save();

  const updatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer')
    .populate('modifications.modifiedBy');

  sendSuccessResponse(res, 200, 'Modification requested successfully', updatedAgreement);
});

/**
 * Respond to modification request
 * @route PUT /api/v1/agreements/:id/modifications/:modificationId
 * @access Private
 */
exports.respondToModification = catchAsync(async (req, res, next) => {
  const { action } = req.body; // 'approve' or 'reject'
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const modification = agreement.modifications.id(req.params.modificationId);

  if (!modification) {
    return next(new AppError('Modification not found', 404));
  }

  // Only the other party can respond
  const isRequester = modification.modifiedBy.toString() === req.user._id.toString();
  if (isRequester) {
    return next(new AppError('You cannot respond to your own modification request', 403));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  if (action === 'approve') {
    modification.status = 'approved';
    modification.approvedBy = req.user._id;
    modification.respondedAt = new Date();
    
    // Apply the modification to the agreement
    // This is simplified - in production, you'd handle each modificationType specifically
    if (modification.modificationType === 'payment_change' && modification.newValue) {
      agreement.financials = { ...agreement.financials, ...modification.newValue };
    }
  } else if (action === 'reject') {
    modification.status = 'rejected';
    modification.respondedAt = new Date();
  } else {
    return next(new AppError('Invalid action. Use "approve" or "reject"', 400));
  }

  await agreement.save();

  sendSuccessResponse(res, 200, `Modification ${action}ed successfully`, agreement);
});

/**
 * Cancel agreement
 * @route POST /api/v1/agreements/:id/cancel
 * @access Private
 */
exports.cancelAgreement = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  // Can only cancel if not completed
  if (agreement.status === 'completed') {
    return next(new AppError('Cannot cancel a completed agreement', 400));
  }

  agreement.status = 'cancelled';
  await agreement.save();

  sendSuccessResponse(res, 200, 'Agreement cancelled successfully', agreement);
});

/**
 * Complete agreement
 * @route POST /api/v1/agreements/:id/complete
 * @access Private
 */
exports.completeAgreement = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id).populate('milestones');

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Only client can mark as complete
  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can complete the agreement', 403));
  }

  // Check if all milestones are approved
  const allApproved = agreement.milestones.every(m => m.status === 'approved');
  
  if (!allApproved) {
    return next(new AppError('All milestones must be approved before completing the agreement', 400));
  }

  agreement.status = 'completed';
  agreement.project.actualEndDate = new Date();
  await agreement.save();

  // Update user statistics
  const client = await User.findById(agreement.client);
  const developer = await User.findById(agreement.developer);
  
  await client.incrementStats('agreementsCompleted');
  await developer.incrementStats('agreementsCompleted');
  await developer.incrementStats('totalEarned', agreement.financials.totalValue);
  await client.incrementStats('totalSpent', agreement.financials.totalValue);

  sendSuccessResponse(res, 200, 'Agreement completed successfully', agreement);
});

/**
 * Upload agreement document
 * @route POST /api/v1/agreements/:id/documents
 * @access Private
 */
exports.uploadDocument = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  if (!req.file) {
    return next(new AppError('Please upload a document', 400));
  }

  const documentUrl = await uploadToSupabase(req.file, 'agreement-documents');

  agreement.documents.additionalFiles.push({
    name: req.file.originalname,
    url: documentUrl,
    uploadedBy: req.user._id,
    uploadedAt: new Date()
  });

  await agreement.save();

  sendSuccessResponse(res, 200, 'Document uploaded successfully', {
    documents: agreement.documents
  });
});

/**
 * Generate agreement PDF
 * @route POST /api/v1/agreements/:id/generate-pdf
 * @access Private
 */
exports.generateAgreementPDF = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.id)
    .populate('client developer gig')
    .populate('milestones');

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client._id.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer._id.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  // Generate PDF (implement in pdfService)
  const pdfBuffer = await generatePDF(agreement);

  // Upload to Supabase
  const pdfUrl = await uploadToSupabase(
    { buffer: pdfBuffer, originalname: `agreement-${agreement.agreementId}.pdf` },
    'agreement-pdfs'
  );

  agreement.documents.contractPdf = {
    url: pdfUrl,
    uploadedAt: new Date()
  };

  await agreement.save();

  sendSuccessResponse(res, 200, 'PDF generated successfully', {
    pdfUrl
  });
});

/**
 * Get agreement statistics
 * @route GET /api/v1/agreements/statistics
 * @access Private
 */
exports.getStatistics = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const [
    totalAgreements,
    activeAgreements,
    completedAgreements,
    asClient,
    asDeveloper
  ] = await Promise.all([
    Agreement.countDocuments({
      $or: [{ client: userId }, { developer: userId }]
    }),
    Agreement.countDocuments({
      $or: [{ client: userId }, { developer: userId }],
      status: { $in: ['active', 'in_progress'] }
    }),
    Agreement.countDocuments({
      $or: [{ client: userId }, { developer: userId }],
      status: 'completed'
    }),
    Agreement.countDocuments({ client: userId }),
    Agreement.countDocuments({ developer: userId })
  ]);

  const statistics = {
    totalAgreements,
    activeAgreements,
    completedAgreements,
    asClient,
    asDeveloper
  };

  sendSuccessResponse(res, 200, 'Agreement statistics retrieved', statistics);
});
