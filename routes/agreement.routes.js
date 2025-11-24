const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreement.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   GET /api/v1/agreements/statistics
 * @desc    Get agreement statistics for current user
 * @access  Private
 */
router.get('/statistics', authenticate, agreementController.getStatistics);

/**
 * @route   GET /api/v1/agreements
 * @desc    Get all agreements for current user
 * @access  Private
 */
router.get('/', authenticate, agreementController.getAllAgreements);

/**
 * @route   POST /api/v1/agreements
 * @desc    Create new agreement
 * @access  Public/Private (optional auth)
 */
router.post('/', optionalAuth, agreementController.createAgreement);

/**
 * @route   GET /api/v1/agreements/:id
 * @desc    Get agreement by ID
 * @access  Private
 */
router.get('/:id', authenticate, agreementController.getAgreementById);

/**
 * @route   PUT /api/v1/agreements/:id
 * @desc    Update agreement (draft only)
 * @access  Private
 */
router.put('/:id', authenticate, agreementController.updateAgreement);

/**
 * @route   POST /api/v1/agreements/:id/submit
 * @desc    Submit agreement for acceptance
 * @access  Private (Client only)
 */
router.post('/:id/submit', authenticate, agreementController.submitAgreement);

/**
 * @route   POST /api/v1/agreements/:id/client-approve
 * @desc    Client approves agreement after developer sets payment terms
 * @access  Private (Client only)
 */
router.post('/:id/client-approve', authenticate, agreementController.clientApproveAgreement);

/**
 * @route   POST /api/v1/agreements/:id/developer-accept
 * @desc    Developer accepts agreement with payment terms
 * @access  Private (Developer only)
 */
router.post('/:id/developer-accept', authenticate, agreementController.developerAcceptAgreement);

/**
 * @route   POST /api/v1/agreements/:id/respond
 * @desc    Accept or reject agreement
 * @access  Private (Developer only)
 */
router.post('/:id/respond', authenticate, agreementController.respondToAgreement);

/**
 * @route   POST /api/v1/agreements/:id/sign
 * @desc    Sign agreement with wallet
 * @access  Private
 */
router.post('/:id/sign', authenticate, agreementController.signAgreement);

/**
 * @route   POST /api/v1/agreements/:id/modifications
 * @desc    Request modification to agreement
 * @access  Private
 */
router.post('/:id/modifications', authenticate, agreementController.requestModification);

/**
 * @route   PUT /api/v1/agreements/:id/modifications/:modificationId
 * @desc    Approve or reject modification
 * @access  Private
 */
router.put('/:id/modifications/:modificationId', authenticate, agreementController.respondToModification);

/**
 * @route   POST /api/v1/agreements/:id/cancel
 * @desc    Cancel agreement
 * @access  Private
 */
router.post('/:id/cancel', authenticate, agreementController.cancelAgreement);

/**
 * @route   POST /api/v1/agreements/:id/complete
 * @desc    Mark agreement as complete
 * @access  Private (Client only)
 */
router.post('/:id/complete', authenticate, agreementController.completeAgreement);

/**
 * @route   POST /api/v1/agreements/:id/documents
 * @desc    Upload additional document
 * @access  Private
 */
router.post('/:id/documents', authenticate, upload.single('document'), agreementController.uploadDocument);

/**
 * @route   POST /api/v1/agreements/:id/generate-pdf
 * @desc    Generate agreement PDF
 * @access  Private
 */
router.post('/:id/generate-pdf', authenticate, agreementController.generateAgreementPDF);

module.exports = router;
