const express = require("express");
const router = express.Router();
const {
  createAgreement,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
  updateAgreementStatus,
  addDeliverables,
  completeMilestoneWithPreviews,
  getAgreementsByUser,
  getAgreementStats,
} = require("../controllers/agreementController");
const { protect, restrictTo } = require("../middlewares/auth");
const {
  uploadAgreementDocuments,
  uploadDeliverables,
  uploadMilestonePreviews,
  handleUploadError,
} = require("../middlewares/upload");
const {
  validateAgreementCreation,
  validateAgreementUpdate,
  validateStatusUpdate,
  validateMilestoneCreation,
  validateMilestoneUpdate,
  validate,
} = require("../middlewares/validation");

/**
 * @route   GET /agreements/stats
 * @desc    Get agreement statistics for the authenticated user
 * @access  Private
 */
router.get("/stats", protect, getAgreementStats);

/**
 * @route   POST /agreements
 * @desc    Create a new agreement
 * @access  Private (Client only)
 */
router.post(
  "/",
  protect,
  restrictTo("client"),
  uploadAgreementDocuments,
  handleUploadError,
  validateAgreementCreation,
  validate,
  createAgreement
);


/**
 * @route   GET /agreements/user/:userId
 * @desc    Get all agreements for a specific user
 * @access  Private
 */
router.get("/user", protect, getAgreementsByUser);

/**
 * @route   GET /agreements/:id
 * @desc    Get agreement by ID or agreementID
 * @access  Private
 */
router.get("/:id", protect, getAgreementById);

/**
 * @route   PUT /agreements/:id
 * @access  Private (Client or Developer involved)
 */
router.patch(
  "/:id",
  protect,
  validateAgreementUpdate,
  validate,
  updateAgreement
);

/**
 * @route   DELETE /agreements/:id
 * @desc    Delete agreement (only if pending)
 * @access  Private (Client who created it)
 */
router.delete("/:id", protect, restrictTo("client"), deleteAgreement);

/**
 * @route   PATCH /agreements/:id/status
 * @desc    Update agreement status
 * @access  Private
 */
router.patch(
  "/:id/status",
  protect,
  validateStatusUpdate,
  validate,
  updateAgreementStatus
);

/**
 * @route   POST /agreements/:id/deliverables
 * @desc    Add deliverables to agreement
 * @access  Private (Developer only)
 */
router.post(
  "/:id/deliverables",
  protect,
  restrictTo("developer"),
  uploadDeliverables,
  handleUploadError,
  addDeliverables
);


/**
 * @route   POST /agreements/:id/milestones/:milestoneId/complete
 * @desc    Complete milestone by uploading preview files
 * @access  Private (Developer only)
 */
router.post(
  "/:id/milestones/:milestoneId/complete",
  protect,
  restrictTo("developer"),
  uploadMilestonePreviews,
  handleUploadError,
  completeMilestoneWithPreviews
);

module.exports = router;
