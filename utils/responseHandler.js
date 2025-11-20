/**
 * Response Handler Utility
 * Standardizes API responses across the application
 */

/**
 * Send success response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @param {object} meta - Additional metadata (pagination, etc.)
 */
const sendSuccessResponse = (res, statusCode = 200, message, data = null, meta = null) => {
  const response = {
    success: true,
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  response.timestamp = new Date().toISOString();

  res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {array} errors - Validation errors
 */
const sendErrorResponse = (res, statusCode = 500, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  response.timestamp = new Date().toISOString();

  res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {array} data - Array of data
 * @param {object} pagination - Pagination info
 */
const sendPaginatedResponse = (res, statusCode = 200, message, data, pagination) => {
  const response = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrevPage: pagination.page > 1
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
const sendCreatedResponse = (res, message, data) => {
  sendSuccessResponse(res, 201, message, data);
};

/**
 * Send no content response (204)
 */
const sendNoContentResponse = (res) => {
  res.status(204).send();
};

/**
 * Send unauthorized response (401)
 */
const sendUnauthorizedResponse = (res, message = 'Unauthorized access') => {
  sendErrorResponse(res, 401, message);
};

/**
 * Send forbidden response (403)
 */
const sendForbiddenResponse = (res, message = 'Forbidden access') => {
  sendErrorResponse(res, 403, message);
};

/**
 * Send not found response (404)
 */
const sendNotFoundResponse = (res, message = 'Resource not found') => {
  sendErrorResponse(res, 404, message);
};

/**
 * Send bad request response (400)
 */
const sendBadRequestResponse = (res, message, errors = null) => {
  sendErrorResponse(res, 400, message, errors);
};

/**
 * Send conflict response (409)
 */
const sendConflictResponse = (res, message = 'Resource already exists') => {
  sendErrorResponse(res, 409, message);
};

/**
 * Send server error response (500)
 */
const sendServerErrorResponse = (res, message = 'Internal server error') => {
  sendErrorResponse(res, 500, message);
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendPaginatedResponse,
  sendCreatedResponse,
  sendNoContentResponse,
  sendUnauthorizedResponse,
  sendForbiddenResponse,
  sendNotFoundResponse,
  sendBadRequestResponse,
  sendConflictResponse,
  sendServerErrorResponse
};
