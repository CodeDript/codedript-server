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
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
const ERROR_MESSAGES = {
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  USER_EXISTS: 'User already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_INPUT: 'Invalid input provided'
};

// Success Messages
const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  RETRIEVED: 'Resource retrieved successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful'
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// File Upload
const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
};

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  DEVELOPER: 'developer',
  CLIENT: 'client'
};

// Agreement Status
const AGREEMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_DEVELOPER: 'pending_developer',
  PENDING_CLIENT: 'pending_client',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Transaction Types
const TRANSACTION_TYPES = {
  ESCROW_DEPOSIT: 'escrow_deposit',
  MILESTONE_PAYMENT: 'milestone_payment',
  REFUND: 'refund',
  WITHDRAWAL: 'withdrawal'
};

// Transaction Status
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Milestone Status
const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed'
};

// Rate Limiting
const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100
};

// JWT Configuration
const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN: '30d'
};

// Database Configuration
const DB_CONFIG = {
  MAX_POOL_SIZE: 50,
  MIN_POOL_SIZE: 10,
  MAX_IDLE_TIME_MS: 30000,
  SERVER_SELECTION_TIMEOUT_MS: 10000
};

// CORS Configuration
const CORS_CONFIG = {
  ALLOWED_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  CREDENTIALS: true,
  OPTIONS_SUCCESS_STATUS: 200
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
  TRANSACTION_STATUS,
  MILESTONE_STATUS,
  RATE_LIMIT,
  JWT_CONFIG,
  DB_CONFIG,
  CORS_CONFIG
};
