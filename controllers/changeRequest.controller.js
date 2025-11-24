const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse } = require('../utils/responseHandler');
const { uploadFile } = require('../services/pinataService');
const ChangeRequest = require('../models/ChangeRequest');
const Agreement = require('../models/Agreement');

/**
 * Create new change request (Client only)
 * @route POST /api/v1/change-requests
 * @access Private
 */
exports.createChangeRequest = catchAsync(async (req, res, next) => {
  const { agreementId, title, description, attachedFiles } = req.body;

  console.log('Create change request - Raw body:', JSON.stringify(req.body, null, 2));
  console.log('attachedFiles type:', typeof attachedFiles);
  console.log('attachedFiles is array:', Array.isArray(attachedFiles));
  console.log('attachedFiles:', attachedFiles);

  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is the client
  const isClient = agreement.client.toString() === req.user._id.toString();

  if (!isClient) {
    return next(new AppError('Only the client can create change requests', 403));
  }

  // Ensure attachedFiles is properly formatted as an array of objects
  let files = [];
  if (attachedFiles) {
    if (typeof attachedFiles === 'string') {
      // If it's a string, try to parse it
      try {
        files = JSON.parse(attachedFiles);
      } catch (e) {
        console.error('Failed to parse attachedFiles string:', e);
        files = [];
      }
    } else if (Array.isArray(attachedFiles)) {
      files = attachedFiles;
    }
  }

  console.log('Processed files:', files);

  const changeRequest = await ChangeRequest.create({
    agreement: agreementId,
    title,
    description,
    createdBy: {
      user: req.user._id,
      role: 'client'
    },
    attachedFiles: files
  });

  const populatedRequest = await ChangeRequest.findById(changeRequest._id)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('agreement');

  sendCreatedResponse(res, 'Change request created successfully', populatedRequest);
});

/**
 * Upload file to IPFS for change request
 * @route POST /api/v1/change-requests/upload-file
 * @access Private
 */
exports.uploadFileToIPFS = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file provided', 400));
  }

  console.log('File upload request:', {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    hasBuffer: !!req.file.buffer
  });

  try {
    // Upload to IPFS via Pinata
    const ipfsResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      { mimeType: req.file.mimetype }
    );

    console.log('IPFS upload successful:', ipfsResult);

    const fileData = {
      name: req.file.originalname,
      size: req.file.size,
      ipfsHash: ipfsResult.ipfsHash,
      url: ipfsResult.url,
      type: req.file.mimetype
    };

    sendSuccessResponse(res, 200, 'File uploaded to IPFS successfully', fileData);
  } catch (error) {
    console.error('IPFS upload error details:', {
      message: error.message,
      stack: error.stack,
      file: req.file.originalname
    });
    return next(new AppError(`Failed to upload file to IPFS: ${error.message}`, 500));
  }
});

/**
 * Get all change requests for an agreement
 * @route GET /api/v1/change-requests/agreement/:agreementId
 * @access Private
 */
exports.getChangeRequestsByAgreement = catchAsync(async (req, res, next) => {
  const { status } = req.query;
  const agreement = await Agreement.findById(req.params.agreementId);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  const changeRequests = await ChangeRequest.findByAgreement(
    req.params.agreementId,
    status
  );

  sendSuccessResponse(res, 200, 'Change requests retrieved successfully', changeRequests);
});

/**
 * Get change request by ID
 * @route GET /api/v1/change-requests/:id
 * @access Private
 */
exports.getChangeRequestById = catchAsync(async (req, res, next) => {
  const changeRequest = await ChangeRequest.findById(req.params.id)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('confirmation.confirmedBy', 'profile email walletAddress')
    .populate('clientResponse.respondedBy', 'profile email walletAddress')
    .populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);
  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  sendSuccessResponse(res, 200, 'Change request retrieved successfully', changeRequest);
});

/**
 * Confirm change request with pricing (Developer only)
 * @route POST /api/v1/change-requests/:id/confirm
 * @access Private
 */
exports.confirmChangeRequest = catchAsync(async (req, res, next) => {
  const { amount, currency, details } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Valid amount is required', 400));
  }

  const changeRequest = await ChangeRequest.findById(req.params.id).populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);

  if (agreement.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the developer can confirm change requests', 403));
  }

  if (changeRequest.status !== 'pending') {
    return next(new AppError('Only pending requests can be confirmed', 400));
  }

  await changeRequest.confirmRequest(
    req.user._id,
    amount,
    currency || 'ETH',
    details
  );

  const populatedRequest = await ChangeRequest.findById(changeRequest._id)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('confirmation.confirmedBy', 'profile email walletAddress')
    .populate('agreement');

  sendSuccessResponse(res, 200, 'Change request confirmed successfully', populatedRequest);
});

/**
 * Ignore change request (Developer only)
 * @route POST /api/v1/change-requests/:id/ignore
 * @access Private
 */
exports.ignoreChangeRequest = catchAsync(async (req, res, next) => {
  const changeRequest = await ChangeRequest.findById(req.params.id).populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);

  if (agreement.developer.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the developer can ignore change requests', 403));
  }

  await changeRequest.ignoreRequest();

  sendSuccessResponse(res, 200, 'Change request ignored successfully', changeRequest);
});

/**
 * Approve change request and update contract price (Client only)
 * @route POST /api/v1/change-requests/:id/approve
 * @access Private
 */
exports.approveChangeRequest = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const changeRequest = await ChangeRequest.findById(req.params.id).populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);

  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can approve change requests', 403));
  }

  if (changeRequest.status !== 'confirmed') {
    return next(new AppError('Only confirmed requests can be approved', 400));
  }

  await changeRequest.approveRequest(req.user._id, reason);

  // Update agreement total value
  if (changeRequest.confirmation.amount) {
    agreement.financials.totalValue += changeRequest.confirmation.amount;
    agreement.financials.remainingAmount += changeRequest.confirmation.amount;
    
    // Add to modifications array
    agreement.modifications.push({
      modifiedBy: req.user._id,
      modificationType: 'payment_change',
      description: `Approved change request: ${changeRequest.title}`,
      previousValue: agreement.financials.totalValue - changeRequest.confirmation.amount,
      newValue: agreement.financials.totalValue,
      additionalCost: changeRequest.confirmation.amount,
      status: 'approved',
      approvedBy: req.user._id,
      requestedAt: changeRequest.createdAt,
      respondedAt: new Date()
    });

    await agreement.save();
  }

  const populatedRequest = await ChangeRequest.findById(changeRequest._id)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('confirmation.confirmedBy', 'profile email walletAddress')
    .populate('clientResponse.respondedBy', 'profile email walletAddress')
    .populate('agreement');

  sendSuccessResponse(res, 200, 'Change request approved and contract price updated', {
    changeRequest: populatedRequest,
    updatedAgreement: agreement
  });
});

/**
 * Reject change request (Client only)
 * @route POST /api/v1/change-requests/:id/reject
 * @access Private
 */
exports.rejectChangeRequest = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const changeRequest = await ChangeRequest.findById(req.params.id).populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);

  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can reject change requests', 403));
  }

  await changeRequest.rejectRequest(req.user._id, reason);

  const populatedRequest = await ChangeRequest.findById(changeRequest._id)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('confirmation.confirmedBy', 'profile email walletAddress')
    .populate('clientResponse.respondedBy', 'profile email walletAddress')
    .populate('agreement');

  sendSuccessResponse(res, 200, 'Change request rejected successfully', populatedRequest);
});

/**
 * Delete change request (Client only - before confirmation)
 * @route DELETE /api/v1/change-requests/:id
 * @access Private
 */
exports.deleteChangeRequest = catchAsync(async (req, res, next) => {
  const changeRequest = await ChangeRequest.findById(req.params.id).populate('agreement');

  if (!changeRequest) {
    return next(new AppError('Change request not found', 404));
  }

  const agreement = await Agreement.findById(changeRequest.agreement._id);

  if (agreement.client.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can delete change requests', 403));
  }

  if (changeRequest.status !== 'pending') {
    return next(new AppError('Only pending requests can be deleted', 400));
  }

  await ChangeRequest.findByIdAndDelete(req.params.id);

  sendSuccessResponse(res, 200, 'Change request deleted successfully', null);
});
