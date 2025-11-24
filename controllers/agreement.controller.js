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
  const { 
    developerId, 
    gigId, 
    project, 
    financials, 
    milestones, 
    terms,
    clientInfo,
    developerInfo,
    blockchain,
    documents
  } = req.body;

  console.log('📝 Creating agreement with payload:', JSON.stringify(req.body, null, 2));

  // Handle both old and new approaches
  let clientId = req.user?._id;
  let devId = developerId;

  // If developer info is provided with wallet, try to find user
  if (developerInfo && developerInfo.walletAddress) {
    const normalizedDevWallet = developerInfo.walletAddress.toLowerCase().trim();
    console.log('🔍 Looking up developer by wallet:', normalizedDevWallet);
    const developer = await User.findOne({ walletAddress: normalizedDevWallet });
    if (developer) {
      devId = developer._id;
      console.log('✅ Found developer:', developer._id, developer.email);
    } else {
      console.warn('⚠️ Developer not found by wallet:', normalizedDevWallet);
      console.warn('⚠️ Agreement will be created without developer ObjectId link');
    }
  }

  // If client info is provided with wallet, try to find user
  if (clientInfo && clientInfo.walletAddress && !req.user) {
    const normalizedClientWallet = clientInfo.walletAddress.toLowerCase().trim();
    console.log('🔍 Looking up client by wallet:', normalizedClientWallet);
    const client = await User.findOne({ walletAddress: normalizedClientWallet });
    if (client) {
      clientId = client._id;
      console.log('✅ Found client:', client._id, client.email);
    } else {
      console.warn('⚠️ Client not found by wallet:', normalizedClientWallet);
    }
  }

  // Process documents with IPFS data
  const processedDocuments = {};
  if (documents) {
    // Process contractPdf
    if (documents.contractPdf && documents.contractPdf.ipfsHash) {
      processedDocuments.contractPdf = {
        ipfsHash: documents.contractPdf.ipfsHash,
        url: documents.contractPdf.url || `https://copper-near-junglefowl-259.mypinata.cloud/ipfs/${documents.contractPdf.ipfsHash}`,
        uploadedAt: documents.contractPdf.uploadedAt || new Date()
      };
      console.log('📄 Processed contractPdf with IPFS:', processedDocuments.contractPdf);
    }
    
    // Process projectFiles
    if (documents.projectFiles && Array.isArray(documents.projectFiles)) {
      processedDocuments.projectFiles = documents.projectFiles.map(file => ({
        name: file.name,
        url: file.url || (file.ipfsHash ? `https://copper-near-junglefowl-259.mypinata.cloud/ipfs/${file.ipfsHash}` : undefined),
        ipfsHash: file.ipfsHash,
        description: file.description || 'Project file',
        uploadedAt: file.uploadedAt || new Date()
      }));
      console.log('📎 Processed project files with IPFS:', processedDocuments.projectFiles);
    }
    
    // Process additionalFiles
    if (documents.additionalFiles) {
      processedDocuments.additionalFiles = documents.additionalFiles;
    }
  }

  // Create agreement with new schema
  const agreementData = {
    client: clientId,
    developer: devId,
    clientInfo: clientInfo || {
      name: req.user?.name || 'Unknown',
      email: req.user?.email || 'unknown@example.com',
      walletAddress: req.user?.walletAddress || '0x0'
    },
    developerInfo: developerInfo || {
      name: 'Unknown',
      email: 'unknown@example.com',
      walletAddress: '0x0'
    },
    gig: gigId || undefined,
    project,
    financials,
    terms: terms || {},
    status: blockchain?.isRecorded ? 'active' : 'pending_developer', // Set to pending_developer for developer to accept
    blockchain: blockchain || {},
    documents: processedDocuments
  };

  console.log('💾 Saving agreement to database...', JSON.stringify(agreementData, null, 2));

  try {
    const agreement = await Agreement.create(agreementData);
    console.log('✅ Agreement created successfully:', agreement._id);

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

    // Update user statistics if authenticated
    if (req.user) {
      await req.user.incrementStats('agreementsCreated');
    }

    const populatedAgreement = await Agreement.findById(agreement._id)
      .populate('client developer gig')
      .populate('milestones');

    sendCreatedResponse(res, 'Agreement created successfully', populatedAgreement);
  } catch (error) {
    console.error('❌ Agreement creation error:', error);
    console.error('Error details:', error.message);
    console.error('Validation errors:', error.errors);
    throw error;
  }
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

  // Normalize user's wallet address for matching
  const userWallet = req.user.walletAddress ? req.user.walletAddress.toLowerCase().trim() : null;

  console.log('🔍 Fetching agreements for user:', req.user._id);
  console.log('📧 User email:', req.user.email);
  console.log('💼 User wallet:', userWallet);
  console.log('🎭 Filter role:', role);
  console.log('📊 Filter status:', status);

  let filter = {
    $or: [
      { client: req.user._id }, 
      { developer: req.user._id },
      // Fallback: match by wallet address in Info fields
      ...(userWallet ? [
        { 'clientInfo.walletAddress': userWallet },
        { 'developerInfo.walletAddress': userWallet }
      ] : [])
    ]
  };

  if (status) {
    filter.status = status;
  }

  if (role === 'client') {
    filter = {
      $or: [
        { client: req.user._id },
        ...(userWallet ? [{ 'clientInfo.walletAddress': userWallet }] : [])
      ]
    };
    if (status) filter.status = status;
  } else if (role === 'developer') {
    filter = {
      $or: [
        { developer: req.user._id },
        ...(userWallet ? [{ 'developerInfo.walletAddress': userWallet }] : [])
      ]
    };
    if (status) filter.status = status;
  }

  console.log('🔎 MongoDB filter:', JSON.stringify(filter, null, 2));

  const [agreements, total] = await Promise.all([
    Agreement.find(filter)
      .populate('client developer gig')
      .populate('milestones')
      .skip(skip)
      .limit(limit)
      .sort({ 'metadata.lastActivityAt': -1 }),
    Agreement.countDocuments(filter)
  ]);

  console.log(`✅ Found ${agreements.length} agreements (total: ${total})`);
  if (agreements.length > 0) {
    console.log('📋 Agreement IDs:', agreements.map(a => a._id.toString()));
    console.log('📋 Agreement statuses:', agreements.map(a => a.status));
  }

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
 * Client approves agreement after developer sets payment terms
 * @route POST /api/v1/agreements/:id/client-approve
 * @access Private (Client only)
 */
/**
 * Extract blockchain agreement ID from transaction hash and update agreement
 * @route POST /api/v1/agreements/:id/extract-blockchain-id
 * @access Private
 */
exports.extractBlockchainId = catchAsync(async (req, res, next) => {
  console.log('🔍 Extracting blockchain ID for agreement:', req.params.id);
  
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is part of this agreement
  const isClient = agreement.client && agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer && agreement.developer.toString() === req.user._id.toString();
  
  if (!isClient && !isDeveloper) {
    return next(new AppError('You do not have access to this agreement', 403));
  }

  // Check if blockchain data exists
  if (!agreement.blockchain || !agreement.blockchain.transactionHash) {
    return next(new AppError('No blockchain transaction hash found for this agreement', 400));
  }

  // Check if agreement ID already exists
  if (agreement.blockchain.agreementId) {
    return sendSuccessResponse(res, 200, 'Blockchain agreement ID already set', {
      agreementId: agreement.blockchain.agreementId,
      alreadySet: true
    });
  }

  const txHash = agreement.blockchain.transactionHash;
  console.log('📝 Extracting agreement ID from transaction:', txHash);

  // Import the extraction logic (you'll need to add this to your backend)
  // For now, we'll accept it from the request body
  const { blockchainAgreementId } = req.body;

  if (!blockchainAgreementId && blockchainAgreementId !== 0) {
    return next(new AppError('blockchainAgreementId is required in request body', 400));
  }

  // Update agreement with blockchain ID
  agreement.blockchain.agreementId = blockchainAgreementId;
  await agreement.save();

  console.log('✅ Updated blockchain agreement ID:', blockchainAgreementId);

  sendSuccessResponse(res, 200, 'Blockchain agreement ID extracted and saved', {
    agreementId: blockchainAgreementId,
    transactionHash: txHash
  });
});

exports.clientApproveAgreement = catchAsync(async (req, res, next) => {
  console.log('👤 Client approving agreement:', req.params.id);
  const { blockchainTxHash, ipfsHash, blockchainAgreementId } = req.body;
  
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is the client (by ObjectId or wallet address)
  const isClientById = agreement.client && agreement.client.toString() === req.user._id.toString();
  const userWallet = req.user.walletAddress?.toLowerCase().trim();
  const isClientByWallet = userWallet && agreement.clientInfo?.walletAddress?.toLowerCase().trim() === userWallet;
  
  if (!isClientById && !isClientByWallet) {
    console.error('❌ User is not the client of this agreement');
    return next(new AppError('Only the client can approve this agreement', 403));
  }

  // Only allow if status is pending_client
  if (agreement.status !== 'pending_client') {
    return next(new AppError(`Cannot approve agreement with status: ${agreement.status}`, 400));
  }

  // Blockchain transaction hash is required
  if (!blockchainTxHash) {
    return next(new AppError('Blockchain transaction hash is required', 400));
  }

  // Link client ObjectId if not already set
  if (!agreement.client) {
    agreement.client = req.user._id;
    console.log('✅ Linked client ObjectId:', req.user._id);
  }

  // Store blockchain data
  agreement.blockchain = {
    agreementId: blockchainAgreementId, // Store the on-chain agreement ID
    transactionHash: blockchainTxHash,
    ipfsHash: ipfsHash || agreement.blockchain?.ipfsHash,
    isRecorded: true,
    network: 'sepolia'
  };

  console.log('✅ Stored blockchain agreement ID:', blockchainAgreementId);

  // Change status to active (agreement is now recorded on blockchain and client has paid)
  agreement.status = 'active';
  
  await agreement.save();

  // Create transaction document for the escrow deposit
  try {
    const developer = await User.findById(agreement.developer);
    
    const transactionData = {
      type: 'escrow_deposit',
      agreement: agreement._id,
      from: {
        user: req.user._id,
        walletAddress: req.user.walletAddress || agreement.clientInfo.walletAddress
      },
      to: {
        user: agreement.developer,
        walletAddress: developer.walletAddress || agreement.developerInfo.walletAddress
      },
      amount: {
        value: agreement.financials.totalValue,
        currency: agreement.financials.currency || 'ETH'
      },
      fees: {
        platformFee: agreement.financials.platformFee?.amount || (agreement.financials.totalValue * 2.5) / 100,
        networkFee: 0,
        totalFees: agreement.financials.platformFee?.amount || (agreement.financials.totalValue * 2.5) / 100
      },
      status: 'completed',
      blockchain: {
        isOnChain: true,
        network: 'sepolia',
        transactionHash: blockchainTxHash
      },
      metadata: {
        description: `Escrow deposit for agreement: ${agreement.project.name}`,
        initiatedBy: req.user._id
      },
      timestamps: {
        initiated: new Date(),
        completed: new Date()
      }
    };

    const transaction = await Transaction.create(transactionData);
    console.log('✅ Transaction document created:', transaction.transactionId);
  } catch (transactionError) {
    console.error('⚠️ Failed to create transaction document:', transactionError.message);
    // Don't fail the agreement approval if transaction creation fails
  }

  const updatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer gig')
    .populate('milestones');

  console.log('✅ Agreement approved by client and recorded on blockchain, status changed to active');
  sendSuccessResponse(res, 200, 'Agreement approved and activated successfully', updatedAgreement);
});

/**
 * Developer accepts agreement with payment terms
 * @route POST /api/v1/agreements/:id/developer-accept
 * @access Private (Developer only)
 */
exports.developerAcceptAgreement = catchAsync(async (req, res, next) => {
  const { financials, milestones } = req.body;
  
  console.log('👨‍💻 Developer accepting agreement:', req.params.id);
  console.log('Financials:', financials);
  console.log('Milestones:', milestones);
  
  const agreement = await Agreement.findById(req.params.id);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Check if user is the developer (by ObjectId or wallet address)
  const isDeveloperById = agreement.developer && agreement.developer.toString() === req.user._id.toString();
  const userWallet = req.user.walletAddress?.toLowerCase().trim();
  const isDeveloperByWallet = userWallet && agreement.developerInfo?.walletAddress?.toLowerCase().trim() === userWallet;
  
  if (!isDeveloperById && !isDeveloperByWallet) {
    console.error('❌ User is not the developer of this agreement');
    console.error('Agreement developer:', agreement.developer);
    console.error('Agreement developerInfo.walletAddress:', agreement.developerInfo?.walletAddress);
    console.error('User ID:', req.user._id);
    console.error('User wallet:', userWallet);
    return next(new AppError('Only the developer can accept this agreement', 403));
  }

  // Only allow if status is pending_developer
  if (agreement.status !== 'pending_developer') {
    return next(new AppError(`Cannot accept agreement with status: ${agreement.status}`, 400));
  }

  // Link developer ObjectId if not already set
  if (!agreement.developer) {
    agreement.developer = req.user._id;
    console.log('✅ Linked developer ObjectId:', req.user._id);
  }

  // Update financials if provided
  if (financials) {
    agreement.financials = {
      ...agreement.financials,
      totalValue: financials.totalValue || agreement.financials.totalValue,
      currency: financials.currency || agreement.financials.currency
    };
  }

  // Update or create milestones
  if (milestones && milestones.length > 0) {
    // Delete existing milestones
    if (agreement.milestones && agreement.milestones.length > 0) {
      await Milestone.deleteMany({ _id: { $in: agreement.milestones } });
    }

    // Create new milestones
    const milestonePromises = milestones.map((milestone, index) => 
      Milestone.create({
        agreement: agreement._id,
        milestoneNumber: index + 1,
        title: milestone.title,
        description: milestone.description || milestone.title,
        deliverables: milestone.deliverables || [],
        financials: {
          value: milestone.financials?.value || parseFloat(milestone.amount) || 0,
          currency: milestone.financials?.currency || financials?.currency || agreement.financials.currency
        },
        timeline: {
          dueDate: milestone.timeline?.dueDate || agreement.project.expectedEndDate
        }
      })
    );
    
    const createdMilestones = await Promise.all(milestonePromises);
    agreement.milestones = createdMilestones.map(m => m._id);
    console.log('✅ Created milestones:', createdMilestones.length);
  }

  // Change status to pending_client for client review
  agreement.status = 'pending_client';
  
  await agreement.save();
  await agreement.updateMilestoneStats();

  const updatedAgreement = await Agreement.findById(agreement._id)
    .populate('client developer gig')
    .populate('milestones');

  console.log('✅ Agreement accepted by developer, status changed to pending_client');
  sendSuccessResponse(res, 200, 'Agreement accepted successfully', updatedAgreement);
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
