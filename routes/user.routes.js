const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by name, email, or skills
 * @access  Public
 */
router.get('/search', userController.searchUsers);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users with pagination and filtering
 * @access  Public
 */
router.get('/', userController.getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:id', authenticate, userController.updateProfile);

/**
 * @route   POST /api/v1/users/:id/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/:id/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

/**
 * @route   GET /api/v1/users/:id/statistics
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:id/statistics', userController.getUserStatistics);

/**
 * @route   GET /api/v1/users/:id/agreements
 * @desc    Get user agreements
 * @access  Private
 */
router.get('/:id/agreements', authenticate, userController.getUserAgreements);

/**
 * @route   GET /api/v1/users/:id/gigs
 * @desc    Get user gigs
 * @access  Public
 */
router.get('/:id/gigs', userController.getUserGigs);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/:id', authenticate, userController.deactivateAccount);

module.exports = router;
