const express = require('express');
const router = express.Router();
const {
  getGigReviews,
  getDeveloperReviews,
  getReviewById,
  createReview,
  markHelpful,
  addResponse
} = require('../controllers/review.controller');
const { protect } = require('../middlewares/auth');

// Public routes
router.get('/gigs/:gigId/reviews', getGigReviews);
router.get('/developer/:developerId/reviews', getDeveloperReviews);
router.get('/:id', getReviewById);

// Protected routes
router.post('/', protect, createReview);
router.put('/:id/helpful', protect, markHelpful);
router.put('/:id/response', protect, addResponse);

module.exports = router;
