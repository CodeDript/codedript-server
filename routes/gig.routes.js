const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gig.controller');
const { authenticate, restrictTo } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   GET /api/v1/gigs/search
 * @desc    Search gigs
 * @access  Public
 */
router.get('/search', gigController.searchGigs);

/**
 * @route   GET /api/v1/gigs/category/:category
 * @desc    Get gigs by category
 * @access  Public
 */
router.get('/category/:category', gigController.getGigsByCategory);

/**
 * @route   GET /api/v1/gigs
 * @desc    Get all gigs with pagination and filtering
 * @access  Public
 */
router.get('/', gigController.getAllGigs);

/**
 * @route   POST /api/v1/gigs
 * @desc    Create new gig
 * @access  Private (Developer only)
 */
router.post('/', authenticate, restrictTo('developer', 'both'), gigController.createGig);

/**
 * @route   GET /api/v1/gigs/:id
 * @desc    Get gig by ID
 * @access  Public
 */
router.get('/:id', gigController.getGigById);

/**
 * @route   PUT /api/v1/gigs/:id
 * @desc    Update gig
 * @access  Private (Owner only)
 */
router.put('/:id', authenticate, gigController.updateGig);

/**
 * @route   DELETE /api/v1/gigs/:id
 * @desc    Delete gig
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, gigController.deleteGig);

/**
 * @route   POST /api/v1/gigs/:id/images
 * @desc    Upload gig images
 * @access  Private (Owner only)
 */
router.post('/:id/images', authenticate, upload.array('images', 5), gigController.uploadGigImages);

/**
 * @route   DELETE /api/v1/gigs/:id/images/:imageIndex
 * @desc    Delete gig image
 * @access  Private (Owner only)
 */
router.delete('/:id/images/:imageIndex', authenticate, gigController.deleteGigImage);

/**
 * @route   POST /api/v1/gigs/:id/inquire
 * @desc    Record gig inquiry
 * @access  Private
 */
router.post('/:id/inquire', authenticate, gigController.inquireGig);

module.exports = router;
