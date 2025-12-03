const { validationResult, body, param, query } = require("express-validator");
const { ValidationError } = require("../utils/errorHandler");

/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

/**
 * Validate request and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    throw new ValidationError("Validation failed", formattedErrors);
  }

  next();
};

/**
 * Sanitize input middleware
 * Removes potentially dangerous characters from request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === "string") {
        // Trim whitespace
        req.body[key] = req.body[key].trim();
      }
    });
  }

  next();
};

/**
 * Check if required fields are present
 */
const requireFields = (fields) => {
  return (req, res, next) => {
    const missingFields = [];

    fields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      throw new ValidationError(
        "Missing required fields",
        missingFields.map((field) => ({
          field,
          message: `${field} is required`,
        }))
      );
    }

    next();
  };
};

/**
 * Validate user creation data
 */
const validateUser = (req, res, next) => {
  const { walletAddress, email, fullname, role } = req.body;

  // Required fields validation
  if (!walletAddress || !email || !fullname || !role) {
    throw new ValidationError(
      "Missing required fields: walletAddress, email, fullname, and role are required",
      [
        { field: "walletAddress", message: "Wallet address is required" },
        { field: "email", message: "Email is required" },
        { field: "fullname", message: "Full name is required" },
        { field: "role", message: "Role is required" },
      ].filter((err) => !req.body[err.field.replace(" is required", "")])
    );
  }

  // Wallet address validation
  if (typeof walletAddress !== "string" || walletAddress.trim().length === 0) {
    throw new ValidationError("Invalid wallet address", [
      {
        field: "walletAddress",
        message: "Wallet address must be a non-empty string",
      },
    ]);
  }

  // Email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email address", [
      { field: "email", message: "Please provide a valid email address" },
    ]);
  }

  // Role validation
  if (!["client", "developer"].includes(role)) {
    throw new ValidationError("Invalid role", [
      { field: "role", message: "Role must be either 'client' or 'developer'" },
    ]);
  }

  // Bio length validation
  if (req.body.bio && req.body.bio.length > 500) {
    throw new ValidationError("Bio too long", [
      { field: "bio", message: "Bio must not exceed 500 characters" },
    ]);
  }

  // Skills validation
  if (req.body.skills && !Array.isArray(req.body.skills)) {
    throw new ValidationError("Invalid skills format", [
      { field: "skills", message: "Skills must be an array" },
    ]);
  }

  next();
};

/**
 * Validate user update data
 */
const validateUserUpdate = (req, res, next) => {
  const { bio, skills, isActive } = req.body;

  // Bio length validation
  if (bio && bio.length > 500) {
    throw new ValidationError("Bio too long", [
      { field: "bio", message: "Bio must not exceed 500 characters" },
    ]);
  }

  // Skills validation
  if (skills && !Array.isArray(skills)) {
    throw new ValidationError("Invalid skills format", [
      { field: "skills", message: "Skills must be an array" },
    ]);
  }

  // isActive validation
  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new ValidationError("Invalid isActive value", [
      { field: "isActive", message: "isActive must be a boolean" },
    ]);
  }

  next();
};

/**
 * Validate agreement creation data
 */
const validateAgreementCreation = (req, res, next) => {
  const { developer, gig, packageId, title, description } = req.body;

  const errors = [];

  // Required fields validation
  if (!developer) errors.push({ field: "developer", message: "Developer is required" });
  if (!gig) errors.push({ field: "gig", message: "Gig is required" });
  if (!packageId) errors.push({ field: "packageId", message: "Package ID is required" });
  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!description) errors.push({ field: "description", message: "Description is required" });

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // Title length validation
  if (title && title.length > 200) {
    errors.push({ field: "title", message: "Title must not exceed 200 characters" });
  }

  // Description length validation
  if (description && description.length > 5000) {
    errors.push({ field: "description", message: "Description must not exceed 5000 characters" });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  next();
};

/**
 * Validate agreement update data
 */
const validateAgreementUpdate = (req, res, next) => {
  const { title, description, totalValue } = req.body;
  const errors = [];

  // Title length validation
  if (title && title.length > 200) {
    errors.push({ field: "title", message: "Title must not exceed 200 characters" });
  }

  // Description length validation
  if (description && description.length > 5000) {
    errors.push({ field: "description", message: "Description must not exceed 5000 characters" });
  }

  // Total value validation
  if (totalValue && (isNaN(totalValue) || parseFloat(totalValue) < 0)) {
    errors.push({ field: "totalValue", message: "Total value must be a positive number" });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  next();
};

/**
 * Validate status update data
 */
const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    throw new ValidationError("Validation failed", [
      { field: "status", message: "Status is required" },
    ]);
  }

  const validStatuses = ["pending", "rejected", "cancelled", "active", "in-progress", "completed","paid","priced"];
  if (!validStatuses.includes(status)) {
    throw new ValidationError("Validation failed", [
      {
        field: "status",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      },
    ]);
  }

  next();
};

/**
 * Validate milestone creation data
 */
const validateMilestoneCreation = (req, res, next) => {
  const { name } = req.body;

  if (!name) {
    throw new ValidationError("Validation failed", [
      { field: "name", message: "Milestone name is required" },
    ]);
  }

  if (name && name.length > 200) {
    throw new ValidationError("Validation failed", [
      { field: "name", message: "Milestone name must not exceed 200 characters" },
    ]);
  }

  next();
};

/**
 * Validate milestone update data
 */
const validateMilestoneUpdate = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    throw new ValidationError("Validation failed", [
      { field: "status", message: "Status is required" },
    ]);
  }

  const validStatuses = ["pending", "inProgress", "completed"];
  if (!validStatuses.includes(status)) {
    throw new ValidationError("Validation failed", [
      {
        field: "status",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      },
    ]);
  }

  next();
};

/**
 * Validate request change creation data
 */
const validateRequestChangeCreation = (req, res, next) => {
  const { agreement, title, description } = req.body;
  const errors = [];

  // Required fields validation
  if (!agreement) errors.push({ field: "agreement", message: "Agreement is required" });
  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!description) errors.push({ field: "description", message: "Description is required" });

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // Title length validation
  if (title && title.length > 200) {
    errors.push({ field: "title", message: "Title must not exceed 200 characters" });
  }

  // Description length validation
  if (description && description.length > 2000) {
    errors.push({ field: "description", message: "Description must not exceed 2000 characters" });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  next();
};

/**
 * Validate request change price data
 */
const validateRequestChangePrice = (req, res, next) => {
  const { price } = req.body;
  const errors = [];

  if (!price) {
    errors.push({ field: "price", message: "Price is required" });
  }

  // Price validation
  if (price && (isNaN(price) || parseFloat(price) <= 0)) {
    errors.push({ field: "price", message: "Price must be a positive number" });
  }

  if (errors.length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  next();
};

/**
 * Review validation rules
 */

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
 * Validation rules for review ID parameter
 */
const reviewIdValidation = [
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
 * Transaction validation rules
 */

/**
 * Validation rules for creating a transaction
 */
const createTransactionValidation = [
  body("type")
    .trim()
    .notEmpty()
    .withMessage("Transaction type is required")
    .isIn(["creation", "modification", "completion"])
    .withMessage(
      "Transaction type must be one of: creation, modification, completion"
    ),
  body("agreement")
    .trim()
    .notEmpty()
    .withMessage("Agreement ID is required")
    .isMongoId()
    .withMessage("Invalid agreement ID format"),
  body("transactionHash")
    .trim()
    .notEmpty()
    .withMessage("Transaction hash is required")
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage("Invalid transaction hash format"),
  body("network")
    .trim()
    .notEmpty()
    .withMessage("Network is required")
    .isIn(["mainnet", "sepolia", "goerli", "polygon", "mumbai"])
    .withMessage(
      "Network must be one of: mainnet, sepolia, goerli, polygon, mumbai"
    ),
  validate,
];

/**
 * Validation rules for getting transactions with filters
 */
const getTransactionsValidation = [
  query("type")
    .optional()
    .isIn(["creation", "modification", "completion"])
    .withMessage(
      "Type must be one of: creation, modification, completion"
    ),
  query("network")
    .optional()
    .isIn(["mainnet", "sepolia", "goerli", "polygon", "mumbai"])
    .withMessage(
      "Network must be one of: mainnet, sepolia, goerli, polygon, mumbai"
    ),
  query("agreement")
    .optional()
    .isMongoId()
    .withMessage("Invalid agreement ID format"),
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
 * Validation rules for transaction ID parameter
 */
const transactionIdValidation = [
  param("id").isMongoId().withMessage("Invalid transaction ID format"),
  validate,
];

/**
 * Validation rules for agreement ID parameter
 */
const agreementIdValidation = [
  param("agreementId").isMongoId().withMessage("Invalid agreement ID format"),
  validate,
];

module.exports = {
  validate,
  sanitizeInput,
  requireFields,
  validateUser,
  validateUserUpdate,
  validateAgreementCreation,
  validateAgreementUpdate,
  validateStatusUpdate,
  validateMilestoneCreation,
  validateMilestoneUpdate,
  validateRequestChangeCreation,
  validateRequestChangePrice,
  createReviewValidation,
  updateReviewValidation,
  getReviewsValidation,
  reviewIdValidation,
  gigIdValidation,
  userIdValidation,
  createTransactionValidation,
  getTransactionsValidation,
  transactionIdValidation,
  agreementIdValidation,
};
