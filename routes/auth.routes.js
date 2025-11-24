const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (client/developer/both)
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email or wallet address
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   POST /api/v1/auth/verify-wallet
 * @desc    Verify wallet ownership with signature
 * @access  Private
 */
router.post('/verify-wallet', authenticate, authController.verifyWallet);

/**
 * @route   POST /api/v1/auth/check-availability
 * @desc    Check if email or wallet address is available
 * @access  Public
 */
router.post('/check-availability', authController.checkAvailability);

module.exports = router;
