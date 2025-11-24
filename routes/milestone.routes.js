const express = require('express');
const router = express.Router();
const milestoneController = require('../controllers/milestone.controller');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   GET /api/v1/milestones/overdue
 * @desc    Get overdue milestones for current user
 * @access  Private
 */
router.get('/overdue', authenticate, milestoneController.getOverdueMilestones);

/**
 * @route   GET /api/v1/milestones/statistics
 * @desc    Get milestone statistics for current user
 * @access  Private
 */
router.get('/statistics', authenticate, milestoneController.getMilestoneStatistics);

/**
 * @route   GET /api/v1/milestones/agreement/:agreementId
 * @desc    Get all milestones for an agreement
 * @access  Private
 */
router.get('/agreement/:agreementId', authenticate, milestoneController.getMilestonesByAgreement);

/**
 * @route   POST /api/v1/milestones
 * @desc    Create new milestone
 * @access  Private
 */
router.post('/', authenticate, milestoneController.createMilestone);

/**
 * @route   GET /api/v1/milestones/:id
 * @desc    Get milestone by ID
 * @access  Private
 */
router.get('/:id', authenticate, milestoneController.getMilestoneById);

/**
 * @route   PUT /api/v1/milestones/:id
 * @desc    Update milestone
 * @access  Private
 */
router.put('/:id', authenticate, milestoneController.updateMilestone);

/**
 * @route   POST /api/v1/milestones/:id/start
 * @desc    Start milestone progress
 * @access  Private (Developer only)
 */
router.post('/:id/start', authenticate, milestoneController.startMilestone);

/**
 * @route   POST /api/v1/milestones/:id/submit
 * @desc    Submit milestone for review
 * @access  Private (Developer only)
 */
router.post('/:id/submit', authenticate, upload.array('files', 10), milestoneController.submitMilestone);

/**
 * @route   POST /api/v1/milestones/:id/approve
 * @desc    Approve milestone
 * @access  Private (Client only)
 */
router.post('/:id/approve', authenticate, milestoneController.approveMilestone);

/**
 * @route   POST /api/v1/milestones/:id/request-revision
 * @desc    Request revision for milestone
 * @access  Private (Client only)
 */
router.post('/:id/request-revision', authenticate, milestoneController.requestRevision);

/**
 * @route   POST /api/v1/milestones/:id/complete
 * @desc    Complete milestone and move next to in_progress
 * @access  Private (Developer only)
 */
router.post('/:id/complete', authenticate, milestoneController.completeMilestone);

/**
 * @route   POST /api/v1/milestones/:id/add-deliverable
 * @desc    Add deliverable with IPFS hash to milestone
 * @access  Private (Developer only)
 */
router.post('/:id/add-deliverable', authenticate, milestoneController.addDeliverable);

/**
 * @route   POST /api/v1/milestones/:id/files
 * @desc    Upload milestone files
 * @access  Private (Developer only)
 */
router.post('/:id/files', authenticate, upload.array('files', 10), milestoneController.uploadMilestoneFiles);

/**
 * @route   DELETE /api/v1/milestones/:id
 * @desc    Delete milestone
 * @access  Private (Client only)
 */
router.delete('/:id', authenticate, milestoneController.deleteMilestone);

module.exports = router;
