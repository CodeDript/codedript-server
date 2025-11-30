const express = require("express");
const router = express.Router();
const {
  createGig,
  getAllGigs,
  getGigById,
  getGigsByDeveloper,
  updateGig,
  deleteGig,
  toggleGigStatus,
} = require("../controllers/gigController");
const { protect, restrictTo } = require("../middlewares/auth");
const { uploadGigImages, handleUploadError } = require("../middlewares/upload");

/**
 * @route   POST /gigs
 * @desc    Create a new gig
 * @access  Private (Developer only)
 */
router.post(
  "/",
  protect,
  restrictTo("developer"),
  uploadGigImages,
  handleUploadError,
  createGig
);

/**
 * @route   GET /gigs
 * @desc    Get all gigs with filtering and pagination
 * @access  Public
 */
router.get("/", getAllGigs);

/**
 * @route   GET /gigs/developer/:developerId
 * @desc    Get all gigs by a specific developer
 * @access  Public
 */
router.get("/developer/:developerId", getGigsByDeveloper);

/**
 * @route   GET /gigs/:id
 * @desc    Get gig by ID or gigID
 * @access  Public
 */
router.get("/:id", getGigById);

/**
 * @route   PATCH /gigs/:id
 * @desc    Update gig
 * @access  Private (Owner only)
 */
router.patch("/:id", protect, uploadGigImages, handleUploadError, updateGig);

/**
 * @route   PATCH /gigs/:id/toggle-status
 * @desc    Toggle gig active status
 * @access  Private (Owner only)
 */
router.patch("/:id/toggle-status", protect, toggleGigStatus);

/**
 * @route   DELETE /gigs/:id
 * @desc    Delete gig (soft delete)
 * @access  Private (Owner only)
 */
router.delete("/:id", protect, deleteGig);

module.exports = router;
