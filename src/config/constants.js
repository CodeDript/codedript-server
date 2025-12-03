/**
 * Application Constants
 * Centralized configuration and constant values
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION_FAILED: "Validation failed",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "Access forbidden",
  NOT_FOUND: "Resource not found",
  INTERNAL_ERROR: "Internal server error",
  INVALID_CREDENTIALS: "Invalid credentials",
  TOKEN_EXPIRED: "Token has expired",
  TOKEN_INVALID: "Invalid token",
  USER_EXISTS: "User already exists",
  USER_NOT_FOUND: "User not found",
  INVALID_INPUT: "Invalid input provided",
};

// Success Messages
const SUCCESS_MESSAGES = {
  CREATED: "Resource created successfully",
  UPDATED: "Resource updated successfully",
  DELETED: "Resource deleted successfully",
  RETRIEVED: "Resource retrieved successfully",
  LOGIN_SUCCESS: "Login successful",
  LOGOUT_SUCCESS: "Logout successful",
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// File Upload
const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
};

// User Roles (aligned with User model)
const USER_ROLES = {
  DEVELOPER: "developer",
  CLIENT: "client",
};

// Agreement Status (aligned with Agreement model)
const AGREEMENT_STATUS = {
  PENDING: "pending",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  ACTIVE: "active",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  PAID: "paid",
};

// Transaction Types (aligned with Transaction model)
const TRANSACTION_TYPES = {
  CREATION: "creation",
  MODIFICATION: "modification",
  COMPLETION: "completion",
};

// Blockchain Networks (aligned with Transaction model)
const BLOCKCHAIN_NETWORKS = {
  MAINNET: "mainnet",
  SEPOLIA: "sepolia",
  GOERLI: "goerli",
  POLYGON: "polygon",
  MUMBAI: "mumbai",
};

// Milestone Status (aligned with Agreement model milestones)
const MILESTONE_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  COMPLETED: "completed",
};

// Request Change Status (aligned with RequestChange model)
const REQUEST_CHANGE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PAID: "paid",
};

// Gig Package Types (aligned with Gig model)
const GIG_PACKAGE_TYPES = {
  BASIC: "basic",
  STANDARD: "standard",
  PREMIUM: "premium",
};

// Rate Limiting
const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
};

// JWT Configuration
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  EXPIRES_IN: "7d",
  REFRESH_EXPIRES_IN: "30d",
};

// Database Configuration
const DB_CONFIG = {
  MAX_POOL_SIZE: 50,
  MIN_POOL_SIZE: 10,
  MAX_IDLE_TIME_MS: 30000,
  SERVER_SELECTION_TIMEOUT_MS: 10000,
};

// CORS Configuration
const CORS_CONFIG = {
  ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:5173",
  ],
  CREDENTIALS: true,
  OPTIONS_SUCCESS_STATUS: 200,
};

module.exports = {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
  FILE_UPLOAD,
  USER_ROLES,
  AGREEMENT_STATUS,
  TRANSACTION_TYPES,
  BLOCKCHAIN_NETWORKS,
  MILESTONE_STATUS,
  REQUEST_CHANGE_STATUS,
  GIG_PACKAGE_TYPES,
  RATE_LIMIT,
  JWT_CONFIG,
  DB_CONFIG,
  CORS_CONFIG,
};
