const express = require("express");
const router = express.Router();
const {
  loginWithWallet,
  requestEmailOTP,
  verifyEmailOTP,
  getCurrentUser,
  updateUser,
} = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const { uploadAvatar, handleUploadError } = require("../middlewares/upload");

/**
 * @route   POST /auth/wallet-login
 * @desc    Login or register with MetaMask wallet
 * @access  Public
 */
router.post("/wallet-login", loginWithWallet);

/**
 * @route   POST /auth/email/request-otp
 * @desc    Request OTP for email login
 * @access  Public
 */
router.post("/email/request-otp", requestEmailOTP);

/**
 * @route   POST /auth/email/verify-otp
 * @desc    Verify OTP and login with email
 * @access  Public
 */
router.post("/email/verify-otp", verifyEmailOTP);

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", protect, getCurrentUser);

/**
 * @route   PUT /auth/me
 * @desc    Update current user profile (with optional avatar upload)
 * @access  Private
 */
router.put("/me", protect, uploadAvatar, handleUploadError, updateUser);

module.exports = router;
