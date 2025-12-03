const Review = require("../models/Review");
const User = require("../models/User");
const Gig = require("../models/Gig");
const Agreement = require("../models/Agreement");

const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const logger = require("../utils/logger");

/**
 * @desc    Create a new review
 * @route   POST /reviews
 * @access  Private
 */
const createReview = async (req, res, next) => {
  try {
    const { gig, reviewee, rating, comment } = req.body;

    // Validate required fields
    if (!gig || !reviewee || !rating || !comment) {
      return sendErrorResponse(res, 400, 
        "Please provide gig, reviewee, rating, and comment"
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return sendErrorResponse(res, 400, "Rating must be between 1 and 5");
    }

    // Verify the gig exists
    const gigDoc = await Gig.findById(gig);
    if (!gigDoc) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    // Verify the reviewee exists
    const revieweeUser = await User.findById(reviewee);
    if (!revieweeUser) {
      return sendErrorResponse(res, 404, "Reviewee user not found");
    }

    // Reviewer is the authenticated user
    const reviewer = req.user.userId;

    // Verify reviewer and reviewee are not the same
    if (reviewer.toString() === reviewee.toString()) {
      return sendErrorResponse(res, 400, "You cannot review yourself");
    }

    // Check if gig belongs to the reviewee
    if (gigDoc.developer.toString() !== reviewee.toString()) {
      return sendErrorResponse(res, 400, 
        "The reviewee must be the developer of the gig"
      );
    }

    // Check if there's a completed agreement between reviewer and reviewee for this gig
    const agreement = await Agreement.findOne({
      gig: gig,
      client: reviewer,
      developer: reviewee,
      status: "completed",
    });

    if (!agreement) {
      return sendErrorResponse(res, 403, 
        "You can only review after completing an agreement with this developer for this gig"
      );
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ gig, reviewer });
    if (existingReview) {
      return sendErrorResponse(res, 400, 
        "You have already reviewed this gig. You can update your existing review instead."
      );
    }

    // Create the review
    const review = await Review.create({
      gig,
      reviewer,
      reviewee,
      rating,
      comment,
    });

    logger.info(
      `Review created: Reviewer=${reviewer}, Reviewee=${reviewee}, Gig=${gig}`
    );

    // Populate review details
    await review.populate([
      { path: "reviewer", select: "userID username email role walletAddress" },
      { path: "reviewee", select: "userID username email role walletAddress" },
      { path: "gig", select: "gigID title description price" },
    ]);

    // Update gig's average rating
    const avgRating = await Review.getAverageRating(gig);
    await Gig.findByIdAndUpdate(gig, {
      averageRating: avgRating.averageRating,
      totalReviews: avgRating.totalReviews,
    });

    sendSuccessResponse(res, 201, "Review created successfully", {
      review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single review by ID
 * @route   GET /reviews/:id
 * @access  Public
 */
const getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id).populate([
      { path: "reviewer", select: "userID username email role walletAddress" },
      { path: "reviewee", select: "userID username email role walletAddress" },
      { path: "gig", select: "gigID title description price" },
    ]);

    if (!review) {
      return sendErrorResponse(res, 404, "Review not found");
    }

    logger.info(`Retrieved review: ID=${review._id}`);

    sendSuccessResponse(res, 200, "Review retrieved successfully", {
      review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews for a specific gig
 * @route   GET /reviews/gig/:gigId
 * @access  Public
 */
const getReviewsByGig = async (req, res, next) => {
  try {
    const { gigId } = req.params;

    // Verify gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    // Fetch reviews for this gig
    const reviews = await Review.find({ gig: gigId })
      .populate([
        { path: "reviewer", select: "userID username email role walletAddress" },
        { path: "reviewee", select: "userID username email role walletAddress" },
        { path: "gig", select: "gigID title description price" },
      ])
      .sort({ createdOn: -1 });

    // Get average rating
    const avgRating = await Review.getAverageRating(gigId);

    logger.info(`Retrieved ${reviews.length} reviews for gig ${gigId}`);

    sendSuccessResponse(res, 200, "Gig reviews retrieved successfully", {
      reviews,
      count: reviews.length,
      averageRating: avgRating.averageRating,
      totalReviews: avgRating.totalReviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews for a specific user (as reviewee)
 * @route   GET /reviews/user/:userId
 * @access  Public
 */
const getReviewsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // Fetch reviews for this user as reviewee
    const reviews = await Review.find({ reviewee: userId })
      .populate([
        { path: "reviewer", select: "userID username email role walletAddress" },
        { path: "reviewee", select: "userID username email role walletAddress" },
        { path: "gig", select: "gigID title description price" },
      ])
      .sort({ createdOn: -1 });

    // Get average rating
    const avgRating = await Review.getUserAverageRating(userId);

    logger.info(`Retrieved ${reviews.length} reviews for user ${userId}`);

    sendSuccessResponse(res, 200, "User reviews retrieved successfully", {
      reviews,
      count: reviews.length,
      averageRating: avgRating.averageRating,
      totalReviews: avgRating.totalReviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a review
 * @route   PUT /reviews/:id
 * @access  Private (Only reviewer can update)
 */
const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return sendErrorResponse(res, 404, "Review not found");
    }

    // Verify user is the reviewer
    if (review.reviewer.toString() !== req.user.userId.toString()) {
      return sendErrorResponse(res, 403, 
        "You are not authorized to update this review"
      );
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return sendErrorResponse(res, 400, "Rating must be between 1 and 5");
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();

    logger.info(`Review updated: ID=${review._id}`);

    // Populate review details
    await review.populate([
      { path: "reviewer", select: "userID username email role walletAddress" },
      { path: "reviewee", select: "userID username email role walletAddress" },
      { path: "gig", select: "gigID title description price" },
    ]);

    // Update gig's average rating
    const avgRating = await Review.getAverageRating(review.gig);
    await Gig.findByIdAndUpdate(review.gig, {
      averageRating: avgRating.averageRating,
      totalReviews: avgRating.totalReviews,
    });

    sendSuccessResponse(res, 200, "Review updated successfully", {
      review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /reviews/:id
 * @access  Private (Only reviewer or admin can delete)
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return sendErrorResponse(res, 404, "Review not found");
    }

    // Verify user is the reviewer or admin
    const isReviewer = review.reviewer.toString() === req.user.userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isReviewer && !isAdmin) {
      return sendErrorResponse(res, 403, 
        "You are not authorized to delete this review"
      );
    }

    const gigId = review.gig;

    await review.deleteOne();

    logger.info(`Review deleted: ID=${id}`);

    // Update gig's average rating
    const avgRating = await Review.getAverageRating(gigId);
    await Gig.findByIdAndUpdate(gigId, {
      averageRating: avgRating.averageRating,
      totalReviews: avgRating.totalReviews,
    });

    sendSuccessResponse(res, 200, "Review deleted successfully", null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getReviewById,
  getReviewsByGig,
  getReviewsByUser,
  updateReview,
  deleteReview,
};


