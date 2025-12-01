const express = require("express");
const router = express.Router();
const {
  createRequestChange,
  getRequestChangeById,
  updateRequestChangeStatus,
  setRequestChangePrice,
  deleteRequestChange,
  getRequestChangesByAgreement,
} = require("../controllers/requestChangeController");
const { protect, restrictTo } = require("../middlewares/auth");
const {
  uploadRequestChangeFiles,
  handleUploadError,
} = require("../middlewares/upload");
const {
  validateRequestChangeCreation,
  validateRequestChangePrice,
  validateStatusUpdate,
  validate,
} = require("../middlewares/validation");


/**
 * @route   POST /request-changes
 * @desc    Create a new request change
 * @access  Private (Client only)
 */
router.post(
  "/",
  protect,
  restrictTo("client"),
  uploadRequestChangeFiles,
  handleUploadError,
  validateRequestChangeCreation,
  validate,
  createRequestChange
);


/**
 * @route   GET /request-changes/agreement/:agreementId
 * @desc    Get all request changes for a specific agreement
 * @access  Private
 */
router.get("/agreement/:agreementId", protect, getRequestChangesByAgreement);

/**
 * @route   GET /request-changes/:id
 * @desc    Get request change by ID or requestID
 * @access  Private
 */
router.get("/:id", protect, getRequestChangeById);

/**
 * @route   PATCH /request-changes/:id/price
 * @desc    Set price for a request change (Developer only)
 * @access  Private (Developer only)
 */
router.patch(
  "/:id/price",
  protect,
  restrictTo("developer"),
  validateRequestChangePrice,
  validate,
  setRequestChangePrice
);

/**
 * @route   PATCH /request-changes/:id/status
 * @desc    Update request change status
 * @access  Private
 */
router.patch(
  "/:id/status",
  protect,
  validateStatusUpdate,
  validate,
  updateRequestChangeStatus
);

/**
 * @route   DELETE /request-changes/:id
 * @desc    Delete request change (only if pending)
 * @access  Private (Client who created it)
 */
router.delete("/:id", protect, restrictTo("client"), deleteRequestChange);

module.exports = router;
