/**
 * Error Handler Utilities
 * Centralized error handling for Express application
 */

const logger = require("./logger");
const { sendErrorResponse } = require("./responseHandler");

/**
 * ValidationError class
 * Used to represent client-side validation errors with a 400 status code
 */
class ValidationError extends Error {
  constructor(message, errors = null, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async Error Handler Wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle Uncaught Exceptions
 */
const handleUncaughtException = () => {
  process.on("uncaughtException", (err) => {
    logger.error("ERROR: Uncaught Exception:", err.name, err.message);
    logger.error(err.stack);
    process.exit(1);
  });
};

/**
 * Handle Unhandled Promise Rejections
 */
const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (err) => {
    logger.error("ERROR: Unhandled Rejection:", err.name, err.message);
    logger.error(err.stack);
    process.exit(1);
  });
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  return sendErrorResponse(res, 404, `Route ${req.originalUrl} not found`);
};

/**
 * Global Error Handler Middleware
 * Catches all errors passed via next(error) and sends consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  // Default status code and message
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  // Log error
  logger.error("ERROR:", {
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Send error response using standardized format
  const errorDetails = err.errors || null;

  return sendErrorResponse(res, statusCode, message, errorDetails);
};

module.exports = {
  catchAsync,
  handleUncaughtException,
  handleUnhandledRejection,
  notFound,
  errorHandler,
  ValidationError,
};
