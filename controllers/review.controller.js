const Review = require('../models/Review');
const Gig = require('../models/Gig');
const Agreement = require('../models/Agreement');
const User = require('../models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/responseHandler');

/**
 * @desc    Get all reviews for a specific developer (reviewee)
 * @route   GET /api/v1/reviews/developer/:developerId/reviews
 * @access  Public
 */
exports.getDeveloperReviews = async (req, res) => {
  try {
    const { developerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify developer exists
    const developer = await User.findById(developerId);
    if (!developer) {
      return sendErrorResponse(res, 404, 'Developer not found');
    }

    const reviews = await Review.find({ reviewee: developerId })
      .populate('reviewer', 'profile.name profile.avatar walletAddress')
      .populate('reviewee', 'profile.name profile.avatar')
      .populate({
        path: 'agreement',
        select: 'agreementId project.title createdAt',
        populate: {
          path: 'client',
          select: 'profile.name'
        }
      })
      .populate('gig', 'gigId title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ reviewee: developerId });

    // Calculate rating statistics
    const stats = await Review.aggregate([
      { $match: { reviewee: developer._id } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    sendSuccessResponse(res, 200, 'Developer reviews fetched successfully', {
      reviews,
      statistics: stats.length > 0 ? stats[0] : {
        avgRating: 0,
        totalReviews: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasMore: skip + reviews.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching developer reviews:', error);
    sendErrorResponse(res, 500, 'Failed to fetch developer reviews');
  }
};

/**
 * @desc    Get all reviews for a specific gig
 * @route   GET /api/v1/gigs/:gigId/reviews
 * @access  Public
 */
exports.getGigReviews = async (req, res) => {
  try {
    const { gigId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify gig exists
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return sendErrorResponse(res, 404, 'Gig not found');
    }

    const reviews = await Review.find({ gig: gigId })
      .populate('reviewer', 'profile.name profile.avatar walletAddress')
      .populate('reviewee', 'profile.name profile.avatar')
      .populate({
        path: 'agreement',
        select: 'agreementId project.title createdAt',
        populate: {
          path: 'client',
          select: 'profile.name'
        }
      })
      .populate('gig', 'gigId title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ gig: gigId });

    // Calculate rating statistics
    const stats = await Review.aggregate([
      { $match: { gig: gig._id } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    sendSuccessResponse(res, 200, 'Reviews fetched successfully', {
      reviews,
      statistics: stats.length > 0 ? stats[0] : {
        avgRating: 0,
        totalReviews: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        hasMore: skip + reviews.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching gig reviews:', error);
    sendErrorResponse(res, 500, 'Failed to fetch reviews');
  }
};

/**
 * @desc    Get review by ID
 * @route   GET /api/v1/reviews/:id
 * @access  Public
 */
exports.getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'profile.name profile.avatar walletAddress')
      .populate('reviewee', 'profile.name profile.avatar')
      .populate('gig', 'title gigId images')
      .populate('agreement', 'agreementId project.title');

    if (!review) {
      return sendErrorResponse(res, 404, 'Review not found');
    }

    sendSuccessResponse(res, 200, 'Review fetched successfully', review);
  } catch (error) {
    console.error('Error fetching review:', error);
    sendErrorResponse(res, 500, 'Failed to fetch review');
  }
};

/**
 * @desc    Create a new review
 * @route   POST /api/v1/reviews
 * @access  Private (Client only)
 */
exports.createReview = async (req, res) => {
  try {
    const { agreementId, gigId, rating, review, categories } = req.body;

    // Verify agreement exists and user is the client
    const agreement = await Agreement.findById(agreementId)
      .populate('client')
      .populate('developer');

    if (!agreement) {
      return sendErrorResponse(res, 404, 'Agreement not found');
    }

    if (agreement.client._id.toString() !== req.user._id.toString()) {
      return sendErrorResponse(res, 403, 'Only the client can review this agreement');
    }

    // Check if agreement is completed
    if (agreement.status !== 'completed') {
      return sendErrorResponse(res, 400, 'Can only review completed agreements');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ agreement: agreementId });
    if (existingReview) {
      return sendErrorResponse(res, 400, 'Review already exists for this agreement');
    }

    // Verify gig
    const gig = await Gig.findById(gigId || agreement.gig);
    if (!gig) {
      return sendErrorResponse(res, 404, 'Gig not found');
    }

    // Generate review ID
    const reviewCount = await Review.countDocuments();
    const reviewId = `REV-${String(reviewCount + 1).padStart(4, '0')}`;

    const newReview = await Review.create({
      reviewId,
      agreement: agreementId,
      gig: gig._id,
      reviewer: req.user._id,
      reviewee: agreement.developer._id,
      rating,
      review,
      categories
    });

    const populatedReview = await Review.findById(newReview._id)
      .populate('reviewer', 'profile.name profile.avatar')
      .populate('reviewee', 'profile.name profile.avatar')
      .populate('gig', 'title gigId');

    sendSuccessResponse(res, 201, 'Review created successfully', populatedReview);
  } catch (error) {
    console.error('Error creating review:', error);
    sendErrorResponse(res, 500, error.message || 'Failed to create review');
  }
};

/**
 * @desc    Mark review as helpful
 * @route   PUT /api/v1/reviews/:id/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendErrorResponse(res, 404, 'Review not found');
    }

    // Check if user already marked as helpful
    const alreadyMarked = review.helpful.users.some(
      userId => userId.toString() === req.user._id.toString()
    );

    if (alreadyMarked) {
      return sendErrorResponse(res, 400, 'Already marked as helpful');
    }

    review.helpful.users.push(req.user._id);
    review.helpful.count += 1;
    await review.save();

    sendSuccessResponse(res, 200, 'Marked as helpful', review);
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    sendErrorResponse(res, 500, 'Failed to mark review as helpful');
  }
};

/**
 * @desc    Add developer response to review
 * @route   PUT /api/v1/reviews/:id/response
 * @access  Private (Developer only)
 */
exports.addResponse = async (req, res) => {
  try {
    const { text } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendErrorResponse(res, 404, 'Review not found');
    }

    // Verify user is the reviewee
    if (review.reviewee.toString() !== req.user._id.toString()) {
      return sendErrorResponse(res, 403, 'Only the developer can respond to this review');
    }

    if (review.response && review.response.text) {
      return sendErrorResponse(res, 400, 'Response already exists');
    }

    review.response = {
      text,
      respondedAt: new Date()
    };

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('reviewer', 'profile.name profile.avatar')
      .populate('reviewee', 'profile.name profile.avatar');

    sendSuccessResponse(res, 200, 'Response added successfully', updatedReview);
  } catch (error) {
    console.error('Error adding response:', error);
    sendErrorResponse(res, 500, 'Failed to add response');
  }
};
