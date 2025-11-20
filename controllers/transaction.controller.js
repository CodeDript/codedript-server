const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse, sendPaginatedResponse } = require('../utils/responseHandler');
const Transaction = require('../models/Transaction');
const Agreement = require('../models/Agreement');
const Milestone = require('../models/Milestone');
const User = require('../models/User');

/**
 * Create new transaction
 * @route POST /api/v1/transactions
 * @access Private
 */
exports.createTransaction = catchAsync(async (req, res, next) => {
  const {
    type,
    agreementId,
    milestoneId,
    toUserId,
    amount,
    description
  } = req.body;

  // Validate recipient user
  const toUser = await User.findById(toUserId);
  if (!toUser) {
    return next(new AppError('Recipient user not found', 404));
  }

  // Create transaction data
  const transactionData = {
    type,
    agreement: agreementId || undefined,
    milestone: milestoneId || undefined,
    from: {
      user: req.user._id,
      walletAddress: req.user.walletAddress
    },
    to: {
      user: toUserId,
      walletAddress: toUser.walletAddress
    },
    amount: {
      value: amount.value,
      currency: amount.currency || 'ETH',
      usdValue: amount.usdValue || undefined
    },
    metadata: {
      description,
      initiatedBy: req.user._id
    }
  };

  // Calculate platform fee (2.5% by default)
  if (type === 'milestone_payment' || type === 'escrow_deposit') {
    transactionData.fees = {
      platformFee: (amount.value * 2.5) / 100,
      networkFee: 0,
      totalFees: (amount.value * 2.5) / 100
    };
  }

  const transaction = await Transaction.create(transactionData);

  const populatedTransaction = await Transaction.findById(transaction._id)
    .populate('from.user to.user agreement milestone');

  sendCreatedResponse(res, 'Transaction created successfully', populatedTransaction);
});

/**
 * Get all transactions for current user
 * @route GET /api/v1/transactions
 * @access Private
 */
exports.getAllTransactions = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { type, status, role } = req.query;

  let filter = {
    $or: [
      { 'from.user': req.user._id },
      { 'to.user': req.user._id }
    ]
  };

  if (type) {
    filter.type = type;
  }

  if (status) {
    filter.status = status;
  }

  if (role === 'sender') {
    filter = { 'from.user': req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
  } else if (role === 'receiver') {
    filter = { 'to.user': req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('from.user to.user agreement milestone')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    Transaction.countDocuments(filter)
  ]);

  sendPaginatedResponse(res, 200, 'Transactions retrieved successfully', transactions, { page, limit, total });
});

/**
 * Get transaction by ID
 * @route GET /api/v1/transactions/:id
 * @access Private
 */
exports.getTransactionById = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('from.user to.user agreement milestone');

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  // Check if user is part of the transaction
  const isSender = transaction.from.user._id.toString() === req.user._id.toString();
  const isReceiver = transaction.to.user._id.toString() === req.user._id.toString();

  if (!isSender && !isReceiver) {
    return next(new AppError('You do not have access to this transaction', 403));
  }

  sendSuccessResponse(res, 200, 'Transaction retrieved successfully', transaction);
});

/**
 * Get transactions by agreement
 * @route GET /api/v1/transactions/agreement/:agreementId
 * @access Private
 */
exports.getTransactionsByAgreement = catchAsync(async (req, res, next) => {
  const agreement = await Agreement.findById(req.params.agreementId);

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  const isClient = agreement.client.toString() === req.user._id.toString();
  const isDeveloper = agreement.developer.toString() === req.user._id.toString();

  if (!isClient && !isDeveloper) {
    return next(new AppError('You are not part of this agreement', 403));
  }

  const transactions = await Transaction.findByAgreement(req.params.agreementId);

  sendSuccessResponse(res, 200, 'Transactions retrieved successfully', transactions);
});

/**
 * Update transaction status (for blockchain confirmation)
 * @route PUT /api/v1/transactions/:id/status
 * @access Private
 */
exports.updateTransactionStatus = catchAsync(async (req, res, next) => {
  const { status, blockchainData } = req.body;
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  // Only sender can update transaction status
  if (transaction.from.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the sender can update transaction status', 403));
  }

  if (status === 'completed' && blockchainData) {
    await transaction.markCompleted(blockchainData);
  } else if (status === 'failed') {
    await transaction.markFailed(req.body.errorCode, req.body.errorMessage);
  } else {
    transaction.status = status;
    await transaction.save();
  }

  sendSuccessResponse(res, 200, 'Transaction status updated', transaction);
});

/**
 * Record blockchain transaction
 * @route POST /api/v1/transactions/:id/blockchain
 * @access Private
 */
exports.recordBlockchainTransaction = catchAsync(async (req, res, next) => {
  const {
    transactionHash,
    blockNumber,
    blockHash,
    gasUsed,
    gasPrice,
    network
  } = req.body;

  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return next(new AppError('Transaction not found', 404));
  }

  // Only sender can record blockchain transaction
  if (transaction.from.user.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the sender can record blockchain transaction', 403));
  }

  transaction.blockchain.isOnChain = true;
  transaction.blockchain.transactionHash = transactionHash;
  transaction.blockchain.blockNumber = blockNumber;
  transaction.blockchain.blockHash = blockHash;
  transaction.blockchain.gasUsed = gasUsed;
  transaction.blockchain.gasPrice = gasPrice;
  transaction.blockchain.network = network || 'mainnet';
  transaction.status = 'completed';

  await transaction.save();

  sendSuccessResponse(res, 200, 'Blockchain transaction recorded', transaction);
});

/**
 * Get user transaction summary
 * @route GET /api/v1/transactions/summary
 * @access Private
 */
exports.getTransactionSummary = catchAsync(async (req, res, next) => {
  const summary = await Transaction.getUserSummary(req.user._id);

  const [
    pendingTransactions,
    completedThisMonth
  ] = await Promise.all([
    Transaction.countDocuments({
      $or: [{ 'from.user': req.user._id }, { 'to.user': req.user._id }],
      status: { $in: ['pending', 'processing'] }
    }),
    Transaction.countDocuments({
      $or: [{ 'from.user': req.user._id }, { 'to.user': req.user._id }],
      status: 'completed',
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    })
  ]);

  const fullSummary = {
    sent: summary.sent,
    received: summary.received,
    pendingTransactions,
    completedThisMonth
  };

  sendSuccessResponse(res, 200, 'Transaction summary retrieved', fullSummary);
});

/**
 * Get transaction statistics
 * @route GET /api/v1/transactions/statistics
 * @access Private
 */
exports.getTransactionStatistics = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const [
    totalSent,
    totalReceived,
    totalPending,
    totalCompleted,
    totalFailed,
    byType
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { 'from.user': userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount.value' }, count: { $sum: 1 } } }
    ]),
    Transaction.aggregate([
      { $match: { 'to.user': userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount.value' }, count: { $sum: 1 } } }
    ]),
    Transaction.countDocuments({
      $or: [{ 'from.user': userId }, { 'to.user': userId }],
      status: { $in: ['pending', 'processing'] }
    }),
    Transaction.countDocuments({
      $or: [{ 'from.user': userId }, { 'to.user': userId }],
      status: 'completed'
    }),
    Transaction.countDocuments({
      $or: [{ 'from.user': userId }, { 'to.user': userId }],
      status: 'failed'
    }),
    Transaction.aggregate([
      {
        $match: {
          $or: [{ 'from.user': userId }, { 'to.user': userId }],
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amount.value' }
        }
      }
    ])
  ]);

  const statistics = {
    sent: totalSent[0] || { total: 0, count: 0 },
    received: totalReceived[0] || { total: 0, count: 0 },
    pending: totalPending,
    completed: totalCompleted,
    failed: totalFailed,
    byType
  };

  sendSuccessResponse(res, 200, 'Transaction statistics retrieved', statistics);
});

/**
 * Create escrow deposit for agreement
 * @route POST /api/v1/transactions/escrow-deposit
 * @access Private
 */
exports.createEscrowDeposit = catchAsync(async (req, res, next) => {
  const { agreementId, amount } = req.body;

  const agreement = await Agreement.findById(agreementId)
    .populate('client developer');

  if (!agreement) {
    return next(new AppError('Agreement not found', 404));
  }

  // Only client can deposit to escrow
  if (agreement.client._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can deposit to escrow', 403));
  }

  // Verify amount matches agreement total
  if (amount !== agreement.financials.totalValue) {
    return next(new AppError('Deposit amount must match agreement total value', 400));
  }

  const transaction = await Transaction.create({
    type: 'escrow_deposit',
    agreement: agreementId,
    from: {
      user: agreement.client._id,
      walletAddress: agreement.client.walletAddress
    },
    to: {
      user: agreement.developer._id,
      walletAddress: agreement.developer.walletAddress
    },
    amount: {
      value: amount,
      currency: agreement.financials.currency
    },
    fees: {
      platformFee: agreement.financials.platformFee.amount,
      networkFee: 0,
      totalFees: agreement.financials.platformFee.amount
    },
    metadata: {
      description: `Escrow deposit for agreement ${agreement.agreementId}`,
      initiatedBy: req.user._id
    }
  });

  const populatedTransaction = await Transaction.findById(transaction._id)
    .populate('from.user to.user agreement');

  sendCreatedResponse(res, 'Escrow deposit created successfully', populatedTransaction);
});

/**
 * Create milestone payment
 * @route POST /api/v1/transactions/milestone-payment
 * @access Private
 */
exports.createMilestonePayment = catchAsync(async (req, res, next) => {
  const { milestoneId } = req.body;

  const milestone = await Milestone.findById(milestoneId).populate('agreement');

  if (!milestone) {
    return next(new AppError('Milestone not found', 404));
  }

  const agreement = await Agreement.findById(milestone.agreement._id)
    .populate('client developer');

  // Only client can release milestone payment
  if (agreement.client._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Only the client can release milestone payment', 403));
  }

  // Milestone must be approved
  if (milestone.status !== 'approved') {
    return next(new AppError('Milestone must be approved before payment', 400));
  }

  // Check if payment already made
  if (milestone.financials.isPaid) {
    return next(new AppError('Payment already made for this milestone', 400));
  }

  const transaction = await Transaction.create({
    type: 'milestone_payment',
    agreement: agreement._id,
    milestone: milestoneId,
    from: {
      user: agreement.client._id,
      walletAddress: agreement.client.walletAddress
    },
    to: {
      user: agreement.developer._id,
      walletAddress: agreement.developer.walletAddress
    },
    amount: {
      value: milestone.financials.value,
      currency: milestone.financials.currency
    },
    fees: {
      platformFee: (milestone.financials.value * 2.5) / 100,
      networkFee: 0,
      totalFees: (milestone.financials.value * 2.5) / 100
    },
    metadata: {
      description: `Payment for milestone: ${milestone.title}`,
      initiatedBy: req.user._id
    }
  });

  // Mark milestone as paid
  milestone.financials.isPaid = true;
  milestone.financials.paidAt = new Date();
  await milestone.save();

  const populatedTransaction = await Transaction.findById(transaction._id)
    .populate('from.user to.user agreement milestone');

  sendCreatedResponse(res, 'Milestone payment created successfully', populatedTransaction);
});
