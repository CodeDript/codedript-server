const express = require("express");
const router = express.Router();
const {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionsByAgreement,
  verifyTransaction,
} = require("../controllers/transactionController");
const { protect } = require("../middlewares/auth");
const {
  createTransactionValidation,
  getTransactionsValidation,
  transactionIdValidation,
  agreementIdValidation,
} = require("../middlewares/validation");

/**
 * @route   POST /api/v1/transactions
 * @desc    Create a new transaction by fetching blockchain data
 * @access  Private
 */
router.post("/", protect, createTransactionValidation, createTransaction);

/**
 * @route   GET /api/v1/transactions
 * @desc    Get all transactions with optional filters
 * @access  Private
 */
router.get("/", protect, getTransactionsValidation, getTransactions);

/**
 * @route   GET /api/v1/transactions/agreement/:agreementId
 * @desc    Get all transactions for a specific agreement
 * @access  Private
 */
router.get(
  "/agreement/:agreementId",
  protect,
  agreementIdValidation,
  getTransactionsByAgreement
);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get a single transaction by ID
 * @access  Private
 */
router.get("/:id", protect, transactionIdValidation, getTransactionById);

/**
 * @route   GET /api/v1/transactions/:id/verify
 * @desc    Verify a transaction on blockchain
 * @access  Private
 */
router.get("/:id/verify", protect, transactionIdValidation, verifyTransaction);

module.exports = router;
