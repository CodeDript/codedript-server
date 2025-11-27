/**
 * Custom Error Classes
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
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
  process.on('uncaughtException', (err) => {
    console.error('ERROR: Uncaught Exception:', err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

/**
 * Handle Unhandled Promise Rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err) => {
    console.error('ERROR: Unhandled Rejection:', err.name, err.message);
    console.error(err.stack);
    process.exit(1);
  });
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  console.error('ERROR:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        ...(err.errors && { errors: err.errors })
      }
    });
  }

  // Production error response
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        ...(err.errors && { errors: err.errors })
      }
    });
  }

  // Programming or unknown errors: don't leak details
  return res.status(500).json({
    success: false,
    status: 'error',
    error: {
      message: 'Something went wrong',
      statusCode: 500
    }
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  catchAsync,
  handleUncaughtException,
  handleUnhandledRejection,
  notFound,
  errorHandler
};
