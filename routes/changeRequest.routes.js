const express = require('express');
const router = express.Router();
const changeRequestController = require('../controllers/changeRequest.controller');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   POST /api/v1/change-requests/upload-file
 * @desc    Upload file to IPFS for change request
 * @access  Private
 */
router.post('/upload-file', authenticate, upload.single('file'), changeRequestController.uploadFileToIPFS);

/**
 * @route   GET /api/v1/change-requests/agreement/:agreementId
 * @desc    Get all change requests for an agreement
 * @access  Private
 */
router.get('/agreement/:agreementId', authenticate, changeRequestController.getChangeRequestsByAgreement);

/**
 * @route   POST /api/v1/change-requests
 * @desc    Create new change request (Client only)
 * @access  Private
 */
router.post('/', authenticate, changeRequestController.createChangeRequest);

/**
 * @route   GET /api/v1/change-requests/:id
 * @desc    Get change request by ID
 * @access  Private
 */
router.get('/:id', authenticate, changeRequestController.getChangeRequestById);

/**
 * @route   POST /api/v1/change-requests/:id/confirm
 * @desc    Confirm change request with pricing (Developer only)
 * @access  Private
 */
router.post('/:id/confirm', authenticate, changeRequestController.confirmChangeRequest);

/**
 * @route   POST /api/v1/change-requests/:id/ignore
 * @desc    Ignore change request (Developer only)
 * @access  Private
 */
router.post('/:id/ignore', authenticate, changeRequestController.ignoreChangeRequest);

/**
 * @route   POST /api/v1/change-requests/:id/approve
 * @desc    Approve change request and update contract price (Client only)
 * @access  Private
 */
router.post('/:id/approve', authenticate, changeRequestController.approveChangeRequest);

/**
 * @route   POST /api/v1/change-requests/:id/reject
 * @desc    Reject change request (Client only)
 * @access  Private
 */
router.post('/:id/reject', authenticate, changeRequestController.rejectChangeRequest);

/**
 * @route   DELETE /api/v1/change-requests/:id
 * @desc    Delete change request (Client only - before confirmation)
 * @access  Private
 */
router.delete('/:id', authenticate, changeRequestController.deleteChangeRequest);

module.exports = router;
