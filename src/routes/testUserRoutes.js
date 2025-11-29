const express = require("express");
const router = express.Router();
const {
  createTestUser,
  getAllTestUsers,
  getTestUserById,
  updateTestUser,
  deleteTestUser,
  recordLogin,
  getStats,
} = require("../controllers/testUserController");

// Middlewares
const { protect, restrictTo, optionalAuth } = require("../middlewares/auth");
const {
  validate,
  sanitizeInput,
  requireFields,
} = require("../middlewares/validation");
const { body } = require("express-validator");

// Validation rules
const createUserValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters"),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("walletAddress")
    .trim()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("Invalid wallet address format"),
  body("role")
    .optional()
    .isIn(["developer", "client"])
    .withMessage("Role must be either developer or client"),
  body("bio")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Bio must not exceed 500 characters"),
  body("rating")
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
];

const updateUserValidation = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("bio")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Bio must not exceed 500 characters"),
  body("rating")
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
  body("ipfsData")
    .optional()
    .matches(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/)
    .withMessage("Invalid IPFS hash format"),
];

/**
 * Public Routes (for testing purposes)
 */

// Create test user - Public for testing, uses sanitizeInput and validation
router.post("/", sanitizeInput, createUserValidation, validate, createTestUser);

/**
 * Protected Routes - Require authentication
 */

// Get stats - Protected, demonstrates protect middleware
router.get("/stats", protect, getStats);

// Get all users - Protected with optional auth (demonstrates optionalAuth)
router.get("/", optionalAuth, getAllTestUsers);

// Get user by ID - Protected
router.get("/:id", protect, getTestUserById);

// Update user - Protected, uses validation middleware
router.put(
  "/:id",
  protect,
  sanitizeInput,
  updateUserValidation,
  validate,
  updateTestUser
);

// Delete user - Protected and restricted to developers only
router.delete("/:id", protect, restrictTo("developer"), deleteTestUser);

// Record login - Public (generates JWT token for authentication)
router.post("/:id/login", recordLogin);

module.exports = router;
