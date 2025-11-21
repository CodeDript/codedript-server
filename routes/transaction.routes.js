const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   GET /api/v1/transactions/summary
 * @desc    Get transaction summary for current user
 * @access  Private
 */
router.get('/summary', authenticate, transactionController.getTransactionSummary);

/**
 * @route   GET /api/v1/transactions/statistics
 * @desc    Get transaction statistics for current user
 * @access  Private
 */
router.get('/statistics', authenticate, transactionController.getTransactionStatistics);

/**
 * @route   GET /api/v1/transactions/agreement/:agreementId
 * @desc    Get transactions for an agreement
 * @access  Private
 */
router.get('/agreement/:agreementId', authenticate, transactionController.getTransactionsByAgreement);

/**
 * @route   POST /api/v1/transactions/escrow-deposit
 * @desc    Create escrow deposit for agreement
 * @access  Private (Client only)
 */
router.post('/escrow-deposit', authenticate, transactionController.createEscrowDeposit);

/**
 * @route   POST /api/v1/transactions/milestone-payment
 * @desc    Create milestone payment
 * @access  Private (Client only)
 */
router.post('/milestone-payment', authenticate, transactionController.createMilestonePayment);

/**
 * @route   GET /api/v1/transactions
 * @desc    Get all transactions for current user
 * @access  Private
 */
router.get('/', authenticate, transactionController.getAllTransactions);

/**
 * @route   POST /api/v1/transactions
 * @desc    Create new transaction
 * @access  Private
 */
router.post('/', authenticate, transactionController.createTransaction);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get('/:id', authenticate, transactionController.getTransactionById);

/**
 * @route   PUT /api/v1/transactions/:id/status
 * @desc    Update transaction status
 * @access  Private
 */
router.put('/:id/status', authenticate, transactionController.updateTransactionStatus);

/**
 * @route   POST /api/v1/transactions/:id/blockchain
 * @desc    Record blockchain transaction details
 * @access  Private
 */
router.post('/:id/blockchain', authenticate, transactionController.recordBlockchainTransaction);

module.exports = router;
