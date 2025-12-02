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
const { body, param, query } = require("express-validator");
const { validate } = require("../middlewares/validation");

/**
 * Validation rules for creating a transaction
 */
const createTransactionValidation = [
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Transaction type is required")
    .isIn(["creation", "modification", "completion"])
    .withMessage(
      "Transaction type must be one of: creation, modification, completion"
    ),
  body("agreement")
    .trim()
    .notEmpty()
    .withMessage("Agreement ID is required")
    .isMongoId()
    .withMessage("Invalid agreement ID format"),
  body("transactionHash")
    .trim()
    .notEmpty()
    .withMessage("Transaction hash is required")
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage("Invalid transaction hash format"),
  body("network")
    .trim()
    .notEmpty()
    .withMessage("Network is required")
    .isIn(["mainnet", "sepolia", "goerli", "polygon", "mumbai"])
    .withMessage(
      "Network must be one of: mainnet, sepolia, goerli, polygon, mumbai"
    ),
  validate,
];

/**
 * Validation rules for getting transactions with filters
 */
const getTransactionsValidation = [
  query("type")
    .optional()
    .isIn(["creation", "modification", "completion"])
    .withMessage(
      "Type must be one of: creation, modification, completion"
    ),
  query("network")
    .optional()
    .isIn(["mainnet", "sepolia", "goerli", "polygon", "mumbai"])
    .withMessage(
      "Network must be one of: mainnet, sepolia, goerli, polygon, mumbai"
    ),
  query("agreement")
    .optional()
    .isMongoId()
    .withMessage("Invalid agreement ID format"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be at least 1"),
  validate,
];

/**
 * Validation rules for MongoDB ID parameter
 */
const mongoIdValidation = [
  param("id").isMongoId().withMessage("Invalid transaction ID format"),
  validate,
];

/**
 * Validation rules for agreement ID parameter
 */
const agreementIdValidation = [
  param("agreementId").isMongoId().withMessage("Invalid agreement ID format"),
  validate,
];

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
router.get("/:id", protect, mongoIdValidation, getTransactionById);

/**
 * @route   GET /api/v1/transactions/:id/verify
 * @desc    Verify a transaction on blockchain
 * @access  Private
 */
router.get("/:id/verify", protect, mongoIdValidation, verifyTransaction);

module.exports = router;
