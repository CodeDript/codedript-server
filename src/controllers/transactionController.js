const Transaction = require("../models/Transaction");
const Agreement = require("../models/Agreement");
const User = require("../models/User");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../utils/errorHandler");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const ethersService = require("../services/ethersService");
const logger = require("../utils/logger");

/**
 * @desc    Create a new transaction by fetching blockchain data
 * @route   POST /transactions
 * @access  Private
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, agreement, transactionHash, network } = req.body;

    // Validate required fields
    if (!type || !agreement || !transactionHash || !network) {
      throw new ValidationError(
        "Please provide type, agreement, transactionHash, and network"
      );
    }

    // Validate transaction type
    const validTypes = ["creation", "modification", "completion"];
    if (!validTypes.includes(type)) {
      throw new ValidationError(
        `Invalid transaction type. Must be one of: ${validTypes.join(", ")}`
      );
    }

    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      throw new AuthorizationError("User not authenticated");
    }

    // Verify the agreement exists
    const agreementDoc = await Agreement.findById(agreement);
    if (!agreementDoc) {
      throw new NotFoundError("Agreement not found");
    }

    // Verify user is authorized (client or developer of the agreement)
    const userId = req.user.userId.toString();
    const isClient = agreementDoc.client.toString() === userId;
    const isDeveloper = agreementDoc.developer.toString() === userId;

    if (!isClient && !isDeveloper) {
      throw new AuthorizationError(
        "You are not authorized to create transactions for this agreement"
      );
    }

    // Check if transaction hash already exists
    const existingTransaction = await Transaction.findOne({ transactionHash });
    if (existingTransaction) {
      throw new ValidationError(
        "Transaction with this hash already exists in the system"
      );
    }

    logger.info(
      `Creating transaction: type=${type}, agreement=${agreement}, hash=${transactionHash}, network=${network}`
    );

    // Fetch transaction details from blockchain
    const blockchainData = await ethersService.fetchTransactionDetails(
      transactionHash,
      network
    );

    // Validate that the transaction is confirmed
    if (blockchainData.confirmations < 1) {
      throw new ValidationError(
        "Transaction must have at least 1 confirmation before recording"
      );
    }

    // Get price from the blockchain transaction value
    const price = parseFloat(blockchainData.value);

    // Create transaction record
    const transaction = await Transaction.create({
      type,
      agreement,
      price,
      network,
      transactionHash: blockchainData.transactionHash,
      blockNumber: blockchainData.blockNumber,
      blockHash: blockchainData.blockHash,
      contractAddress: blockchainData.contractAddress,
      from: blockchainData.from,
      to: blockchainData.to,
      transactionFee: blockchainData.transactionFee,
      timestamp: blockchainData.timestamp,
      timestampDate: blockchainData.timestampDate,
    });

    logger.info(
      `Transaction created successfully: ID=${transaction.transactionID}, Hash=${transactionHash}`
    );

    // Update user statistics for completion transactions
    if (type === "completion") {
      const paymentAmount = parseFloat(blockchainData.value);
      
      // Update developer's totalEarned
      await User.findByIdAndUpdate(
        agreementDoc.developer,
        { $inc: { "statistics.totalEarned": paymentAmount } },
        { new: true }
      );
      
      // Update client's totalSpent
      await User.findByIdAndUpdate(
        agreementDoc.client,
        { $inc: { "statistics.totalSpent": paymentAmount } },
        { new: true }
      );
      
      logger.info(
        `Updated statistics - Developer ${agreementDoc.developer} earned: ${paymentAmount}, Client ${agreementDoc.client} spent: ${paymentAmount}`
      );
    }

    // Populate agreement details
    await transaction.populate({
      path: "agreement",
      select: "agreementID title client developer status totalValue",
      populate: [
        { path: "client", select: "userID username email role" },
        { path: "developer", select: "userID username email role" },
      ],
    });

    // Convert to JSON to include virtuals
    const transactionData = transaction.toJSON();

    sendSuccessResponse(res, 201, "Transaction created successfully", {
      transaction: transactionData,
      blockchainDetails: {
        confirmations: blockchainData.confirmations,
        from: blockchainData.from,
        to: blockchainData.to,
        value: blockchainData.value,
        gasUsed: blockchainData.gasUsed,
        timestamp: blockchainData.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all transactions with optional filters
 * @route   GET /transactions
 * @access  Private
 */
const getTransactions = async (req, res, next) => {
  try {
    const { type, network, agreement, limit = 50, page = 1 } = req.query;

    // Build query
    const query = {};

    if (type) {
      const validTypes = ["creation", "modification", "completion"];
      if (!validTypes.includes(type)) {
        throw new ValidationError(
          `Invalid type filter. Must be one of: ${validTypes.join(", ")}`
        );
      }
      query.type = type;
    }

    if (network) {
      const validNetworks = [
        "mainnet",
        "sepolia",
        "goerli",
        "polygon",
        "mumbai",
      ];
      if (!validNetworks.includes(network)) {
        throw new ValidationError(
          `Invalid network filter. Must be one of: ${validNetworks.join(", ")}`
        );
      }
      query.network = network;
    }

    if (agreement) {
      // Verify agreement exists
      const agreementDoc = await Agreement.findById(agreement);
      if (!agreementDoc) {
        throw new NotFoundError("Agreement not found");
      }

      // Verify user has access to this agreement
      const userId = req.user.userId.toString();
      const isClient = agreementDoc.client.toString() === userId;
      const isDeveloper = agreementDoc.developer.toString() === userId;

      if (!isClient && !isDeveloper && req.user.role !== "admin") {
        throw new AuthorizationError(
          "You are not authorized to view transactions for this agreement"
        );
      }

      query.agreement = agreement;
    } else {
      // If no specific agreement is requested, only show user's transactions
      if (req.user.role !== "admin") {
        // Find all agreements where user is client or developer
        const userAgreements = await Agreement.find({
          $or: [{ client: req.user.userId }, { developer: req.user.userId }],
        }).select("_id");

        query.agreement = {
          $in: userAgreements.map((a) => a._id),
        };
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch transactions
    const transactions = await Transaction.find(query)
      .populate({
        path: "agreement",
        select: "agreementID title client developer status totalValue",
        populate: [
          { path: "client", select: "userID username email role" },
          { path: "developer", select: "userID username email role" },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const totalCount = await Transaction.countDocuments(query);

    logger.info(
      `Retrieved ${transactions.length} transactions (page ${page}, limit ${limit})`
    );

    sendSuccessResponse(res, 200, "Transactions retrieved successfully", {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single transaction by ID
 * @route   GET /transactions/:id
 * @access  Private
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id).populate({
      path: "agreement",
      select: "agreementID title client developer status totalValue",
      populate: [
        { path: "client", select: "userID username email role" },
        { path: "developer", select: "userID username email role" },
      ],
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found");
    }

    // Verify user has access to this transaction
    const userId = req.user.userId.toString();
    const agreement = transaction.agreement;
    const isClient = agreement.client._id.toString() === userId;
    const isDeveloper = agreement.developer._id.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      throw new AuthorizationError(
        "You are not authorized to view this transaction"
      );
    }

    logger.info(`Retrieved transaction: ID=${transaction.transactionID}`);

    sendSuccessResponse(res, 200, "Transaction retrieved successfully", {
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get transactions by agreement ID
 * @route   GET /transactions/agreement/:agreementId
 * @access  Private
 */
const getTransactionsByAgreement = async (req, res, next) => {
  try {
    const { agreementId } = req.params;

    // Verify agreement exists
    const agreement = await Agreement.findById(agreementId);
    if (!agreement) {
      throw new NotFoundError("Agreement not found");
    }

    // Verify user has access to this agreement
    const userId = req.user.userId.toString();
    const isClient = agreement.client.toString() === userId;
    const isDeveloper = agreement.developer.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      throw new AuthorizationError(
        "You are not authorized to view transactions for this agreement"
      );
    }

    // Fetch transactions for this agreement
    const transactions = await Transaction.find({ agreement: agreementId })
      .populate({
        path: "agreement",
        select: "agreementID title client developer status totalValue",
        populate: [
          { path: "client", select: "userID username email role" },
          { path: "developer", select: "userID username email role" },
        ],
      })
      .sort({ createdAt: -1 });

    logger.info(
      `Retrieved ${transactions.length} transactions for agreement ${agreementId}`
    );

    sendSuccessResponse(
      res,
      200,
      "Agreement transactions retrieved successfully",
      {
        transactions,
        count: transactions.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify a transaction on blockchain
 * @route   GET /transactions/:id/verify
 * @access  Private
 */
const verifyTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id).populate({
      path: "agreement",
      select: "agreementID title client developer",
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found");
    }

    // Verify user has access
    const userId = req.user.userId.toString();
    const agreement = transaction.agreement;
    const isClient = agreement.client.toString() === userId;
    const isDeveloper = agreement.developer.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      throw new AuthorizationError(
        "You are not authorized to verify this transaction"
      );
    }

    logger.info(
      `Verifying transaction: ID=${transaction.transactionID}, Hash=${transaction.transactionHash}`
    );

    // Fetch current blockchain data
    const blockchainData = await ethersService.fetchTransactionDetails(
      transaction.transactionHash,
      transaction.network
    );

    // Compare stored data with blockchain data
    const isValid =
      transaction.blockNumber === blockchainData.blockNumber &&
      transaction.blockHash === blockchainData.blockHash &&
      transaction.transactionHash === blockchainData.transactionHash;

    sendSuccessResponse(res, 200, "Transaction verified successfully", {
      isValid,
      storedData: {
        transactionHash: transaction.transactionHash,
        blockNumber: transaction.blockNumber,
        blockHash: transaction.blockHash,
        contractAddress: transaction.contractAddress,
      },
      blockchainData: {
        transactionHash: blockchainData.transactionHash,
        blockNumber: blockchainData.blockNumber,
        blockHash: blockchainData.blockHash,
        confirmations: blockchainData.confirmations,
        from: blockchainData.from,
        to: blockchainData.to,
        value: blockchainData.value,
        timestamp: blockchainData.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionsByAgreement,
  verifyTransaction,
};
