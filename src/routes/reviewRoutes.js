const express = require("express");
const router = express.Router();
const {
  createReview,
  getReviewById,
  getReviewsByGig,
  getReviewsByUser,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const { protect } = require("../middlewares/auth");
const {
  createReviewValidation,
  updateReviewValidation,
  getReviewsValidation,
  reviewIdValidation,
  gigIdValidation,
  userIdValidation,
} = require("../middlewares/validation");

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a new review
 * @access  Private
 */
router.post("/", protect, createReviewValidation, createReview);

/**
 * @route   GET /api/v1/reviews/gig/:gigId
 * @desc    Get all reviews for a specific gig
 * @access  Public
 */
router.get("/gig/:gigId", gigIdValidation, getReviewsByGig);

/**
 * @route   GET /api/v1/reviews/user/:userId
 * @desc    Get all reviews for a developer user (as reviewee)
 * @access  Public
 */
router.get("/user/:userId", userIdValidation, getReviewsByUser);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get a single review by ID
 * @access  Public
 */
router.get("/:id", reviewIdValidation, getReviewById);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update a review
 * @access  Private (Only reviewer)
 */
router.patch("/:id", protect, reviewIdValidation, updateReviewValidation, updateReview);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private (Only reviewer or admin)
 */
router.delete("/:id", protect, reviewIdValidation, deleteReview);

module.exports = router;
