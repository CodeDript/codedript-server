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
const { body, param, query } = require("express-validator");
const { validate } = require("../middlewares/validation");

/**
 * Validation rules for creating a review
 */
const createReviewValidation = [
  body("gig")
    .trim()
    .notEmpty()
    .withMessage("Gig ID is required")
    .isMongoId()
    .withMessage("Invalid gig ID format"),
  body("reviewee")
    .trim()
    .notEmpty()
    .withMessage("Reviewee ID is required")
    .isMongoId()
    .withMessage("Invalid reviewee ID format"),
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .trim()
    .notEmpty()
    .withMessage("Comment is required")
    .isLength({ max: 1000 })
    .withMessage("Comment must not exceed 1000 characters"),
  validate,
];

/**
 * Validation rules for updating a review
 */
const updateReviewValidation = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Comment must not exceed 1000 characters"),
  validate,
];

/**
 * Validation rules for getting reviews with filters
 */
const getReviewsValidation = [
  query("gig").optional().isMongoId().withMessage("Invalid gig ID format"),
  query("reviewer")
    .optional()
    .isMongoId()
    .withMessage("Invalid reviewer ID format"),
  query("reviewee")
    .optional()
    .isMongoId()
    .withMessage("Invalid reviewee ID format"),
  query("minRating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Minimum rating must be between 1 and 5"),
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
  param("id").isMongoId().withMessage("Invalid review ID format"),
  validate,
];

/**
 * Validation rules for gig ID parameter
 */
const gigIdValidation = [
  param("gigId").isMongoId().withMessage("Invalid gig ID format"),
  validate,
];

/**
 * Validation rules for user ID parameter
 */
const userIdValidation = [
  param("userId").isMongoId().withMessage("Invalid user ID format"),
  validate,
];

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
router.get("/:id", mongoIdValidation, getReviewById);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update a review
 * @access  Private (Only reviewer)
 */
router.patch("/:id", protect, mongoIdValidation, updateReviewValidation, updateReview);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete a review
 * @access  Private (Only reviewer or admin)
 */
router.delete("/:id", protect, mongoIdValidation, deleteReview);

module.exports = router;
