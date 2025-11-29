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

module.exports = {
  validate,
  sanitizeInput,
  requireFields,
  validateUser,
  validateUserUpdate,
};
