/**
 * Response Handler Utilities
 * Standardized response formats for API endpoints
 */

/**
 * Send success response
 */
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data })
  };

  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
const sendCreatedResponse = (res, message, data = null) => {
  return sendSuccessResponse(res, 201, message, data);
};

/**
 * Send paginated response
 */
const sendPaginatedResponse = (res, statusCode, message, data, pagination) => {
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
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    error: {
      message,
      statusCode,
      ...(errors && { errors })
    }
  };

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
const sendValidationError = (res, errors) => {
  return sendErrorResponse(res, 400, 'Validation failed', errors);
};

/**
 * Send not found response
 */
const sendNotFoundResponse = (res, resource = 'Resource') => {
  return sendErrorResponse(res, 404, `${resource} not found`);
};

/**
 * Send unauthorized response
 */
const sendUnauthorizedResponse = (res, message = 'Unauthorized access') => {
  return sendErrorResponse(res, 401, message);
};

/**
 * Send forbidden response
 */
const sendForbiddenResponse = (res, message = 'Access forbidden') => {
  return sendErrorResponse(res, 403, message);
};

module.exports = {
  sendSuccessResponse,
  sendCreatedResponse,
  sendPaginatedResponse,
  sendErrorResponse,
  sendValidationError,
  sendNotFoundResponse,
  sendUnauthorizedResponse,
  sendForbiddenResponse
};
