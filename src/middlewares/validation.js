const { validationResult } = require("express-validator");
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
  const { developer, gig, title, description, totalValue } = req.body;

  const errors = [];

  // Required fields validation
  if (!developer) errors.push({ field: "developer", message: "Developer is required" });
  if (!gig) errors.push({ field: "gig", message: "Gig is required" });
  if (!title) errors.push({ field: "title", message: "Title is required" });
  if (!description) errors.push({ field: "description", message: "Description is required" });
  if (!totalValue) errors.push({ field: "totalValue", message: "Total value is required" });

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

  const validStatuses = ["pending", "rejected", "cancelled", "active", "in-progress", "completed"];
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
};
