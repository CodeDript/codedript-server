const Transaction = require("../models/Transaction");
const Agreement = require("../models/Agreement");
const RequestChange = require("../models/RequestChange");
const User = require("../models/User");

const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
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
      return sendErrorResponse(res, 400, 
        "Please provide type, agreement, transactionHash, and network"
      );
    }

    // Validate transaction type
    const validTypes = ["creation", "modification", "completion"];
    if (!validTypes.includes(type)) {
      return sendErrorResponse(res, 400, 
        `Invalid transaction type. Must be one of: ${validTypes.join(", ")}`
      );
    }

    // Verify user is authenticated
    if (!req.user || !req.user.userId) {
      return sendErrorResponse(res, 403, "User not authenticated");
    }

    // Verify the agreement exists
    const agreementDoc = await Agreement.findById(agreement);
    if (!agreementDoc) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Verify user is authorized (client or developer of the agreement)
    const userId = req.user.userId.toString();
    const isClient = agreementDoc.client.toString() === userId;
    const isDeveloper = agreementDoc.developer.toString() === userId;

    if (!isClient && !isDeveloper) {
      return sendErrorResponse(res, 403, 
        "You are not authorized to create transactions for this agreement"
      );
    }

    // Check if transaction hash already exists
    const existingTransaction = await Transaction.findOne({ transactionHash });
    if (existingTransaction) {
      return sendErrorResponse(res, 400, 
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
      return sendErrorResponse(res, 400, 
        "Transaction must have at least 1 confirmation before recording"
      );
    }

    // Get price from the blockchain transaction value.
    // Note: for completion transactions where the contract performs internal transfers,
    // transaction.value may be 0. In that case fall back to agreement financials totalValue.
    let price = parseFloat(blockchainData.value || 0);
    // Track modification-specific payment amount when handling request-change transactions
    let modificationPayment = 0;
    if (!price || price === 0) {
      if (agreementDoc.financials && agreementDoc.financials.totalValue) {
        price = parseFloat(agreementDoc.financials.totalValue);
        logger.info(
          `Blockchain transaction value is zero; falling back to agreement totalValue=${price}`
        );
      } else {
        price = 0;
      }
    }

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

    // Post-transaction actions
    try {
      // If this is a completion transaction, mark agreement as completed and update financials
      if (type === "completion") {
        try {
          agreementDoc.status = "completed";
          // Set releasedAmount to totalValue (mark fully released)
          if (agreementDoc.financials) {
            const total = agreementDoc.financials.totalValue || price || 0;
            agreementDoc.financials.releasedAmount = parseFloat(total.toFixed ? total.toFixed(8) : total);
            agreementDoc.financials.remainingAmount = 0;
          }
          await agreementDoc.save();
          logger.info(`Agreement ${agreementDoc._id} marked as completed after completion transaction`);
        } catch (err) {
          logger.error(`Failed to update agreement status after completion transaction: ${err}`);
        }
      }

      // If this is a modification (request-change) transaction, try to mark corresponding request change as paid
      if (type === "modification") {
        try {
          // Try to find a request change for this agreement that is priced or pending payment
          const possibleRequests = await RequestChange.find({ agreement: agreementDoc._id, status: { $in: ["priced", "paid"] } }).sort({ createdAt: -1 }).limit(5);
          if (possibleRequests && possibleRequests.length > 0) {
            // Match by price if available
            let matched = null;
            for (const req of possibleRequests) {
              const reqPrice = parseFloat(req.price || 0);
              if (reqPrice > 0 && Math.abs(reqPrice - price) < 1e-8) {
                matched = req;
                break;
              }
            }

            // Fallback: take the most recent priced request
            if (!matched) matched = possibleRequests[0];

            if (matched) {
              if (matched.status !== "paid") {
                matched.status = "paid";
                await matched.save();
                logger.info(`Marked requestChange ${matched._id} as paid after transaction ${transactionHash}`);
              }
              // Ensure agreement financials include this change price (idempotent)
              const changePrice = parseFloat(matched.price || 0);
              if (changePrice && agreementDoc.financials) {
                agreementDoc.financials.totalValue = parseFloat(((agreementDoc.financials.totalValue || 0) + changePrice).toFixed(8));
                agreementDoc.financials.remainingAmount = parseFloat(((agreementDoc.financials.totalValue || 0) - (agreementDoc.financials.releasedAmount || 0)).toFixed(8));
                await agreementDoc.save();
                logger.info(`Added request change price to agreement ${agreementDoc._id} totalValue (${changePrice})`);
                modificationPayment = changePrice;
              }
            }
          }
        } catch (err) {
          logger.error(`Failed to associate modification transaction with a request change: ${err}`);
        }
      }
    } catch (err) {
      logger.error(`Post-transaction actions failed: ${err}`);
    }

    // Update user statistics based on transaction type
    
    // CREATION: Client pays escrow to activate agreement
    // - Increment client's totalSpent by the escrow amount
    if (type === "creation") {
      const escrowAmount = price;
      
      if (escrowAmount && escrowAmount > 0) {
        await User.findByIdAndUpdate(
          agreementDoc.client,
          { $inc: { "statistics.totalSpent": escrowAmount } },
          { new: true }
        );
        
        logger.info(
          `Updated statistics for creation - Client ${agreementDoc.client} spent: ${escrowAmount}`
        );
      } else {
        logger.warn(
          `Creation transaction recorded with zero amount for agreement ${agreementDoc._id}. Skipping statistics update.`
        );
      }
    }

    // MODIFICATION: Client pays for request change
    // - Increment client's totalSpent by the request change price
    if (type === "modification") {
      const changeAmount = modificationPayment || price || 0;
      
      if (changeAmount && changeAmount > 0) {
        await User.findByIdAndUpdate(
          agreementDoc.client,
          { $inc: { "statistics.totalSpent": changeAmount } },
          { new: true }
        );

        logger.info(
          `Updated statistics for modification - Client ${agreementDoc.client} spent: ${changeAmount}`
        );
      } else {
        logger.warn(
          `Modification transaction recorded with zero amount for agreement ${agreementDoc._id}. Skipping statistics update.`
        );
      }
    }

    // COMPLETION: Agreement is completed and funds are released to developer
    // - Increment developer's totalEarned by the TOTAL agreement value (including all modifications)
    if (type === "completion") {
      const totalAgreementValue = agreementDoc.financials?.totalValue || price || 0;

      if (totalAgreementValue && totalAgreementValue > 0) {
        await User.findByIdAndUpdate(
          agreementDoc.developer,
          { $inc: { "statistics.totalEarned": totalAgreementValue } },
          { new: true }
        );

        logger.info(
          `Updated statistics for completion - Developer ${agreementDoc.developer} earned: ${totalAgreementValue} (total agreement value including modifications)`
        );
      } else {
        logger.warn(
          `Completion transaction recorded with zero amount for agreement ${agreementDoc._id}. Skipping statistics update.`
        );
      }
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
        return sendErrorResponse(res, 400, 
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
        return sendErrorResponse(res, 400, 
          `Invalid network filter. Must be one of: ${validNetworks.join(", ")}`
        );
      }
      query.network = network;
    }

    if (agreement) {
      // Verify agreement exists
      const agreementDoc = await Agreement.findById(agreement);
      if (!agreementDoc) {
        return sendErrorResponse(res, 404, "Agreement not found");
      }

      // Verify user has access to this agreement
      const userId = req.user.userId.toString();
      const isClient = agreementDoc.client.toString() === userId;
      const isDeveloper = agreementDoc.developer.toString() === userId;

      if (!isClient && !isDeveloper && req.user.role !== "admin") {
        return sendErrorResponse(res, 403, 
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
      return sendErrorResponse(res, 404, "Transaction not found");
    }

    // Verify user has access to this transaction
    const userId = req.user.userId.toString();
    const agreement = transaction.agreement;
    const isClient = agreement.client._id.toString() === userId;
    const isDeveloper = agreement.developer._id.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, 
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
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Verify user has access to this agreement
    const userId = req.user.userId.toString();
    const isClient = agreement.client.toString() === userId;
    const isDeveloper = agreement.developer.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, 
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
      return sendErrorResponse(res, 404, "Transaction not found");
    }

    // Verify user has access
    const userId = req.user.userId.toString();
    const agreement = transaction.agreement;
    const isClient = agreement.client.toString() === userId;
    const isDeveloper = agreement.developer.toString() === userId;

    if (!isClient && !isDeveloper && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, 
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


