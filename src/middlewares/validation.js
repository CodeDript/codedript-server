const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errorHandler');

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
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Sanitize input middleware
 * Removes potentially dangerous characters from request body
 */
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
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
    
    fields.forEach(field => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      throw new ValidationError(
        'Missing required fields',
        missingFields.map(field => ({
          field,
          message: `${field} is required`
        }))
      );
    }
    
    next();
  };
};

module.exports = {
  validate,
  sanitizeInput,
  requireFields
};
