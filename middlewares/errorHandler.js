const environmentConfig = require('../config/environment');
const { sendErrorResponse } = require('../utils/responseHandler');

/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

/**
 * Custom Application Error Class
 */
class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Mongoose CastError (Invalid ID)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = "${value}". Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message,
    value: el.value
  }));

  const message = 'Invalid input data';
  return new AppError(message, 400, errors);
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  console.error('💥 ERROR:', err);

  const response = {
    success: false,
    message: err.message,
    statusCode: err.statusCode,
    status: err.status,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(err.statusCode).json(response);
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    sendErrorResponse(res, err.statusCode, err.message, err.errors);
  } 
  // Programming or unknown error: don't leak error details
  else {
    console.error('💥 ERROR:', err);
    sendErrorResponse(res, 500, 'Something went wrong. Please try again later.');
  }
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const config = environmentConfig.getConfig();

  if (config.isDevelopment) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle 404 - Route Not Found
 */
const notFound = (req, res, next) => {
  const message = `Cannot ${req.method} ${req.originalUrl} - Route not found`;
  next(new AppError(message, 404));
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  catchAsync,
  handleUnhandledRejection,
  handleUncaughtException
};
