const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/responseHandler');

/**
 * Validation Middleware
 * Contains validation rules and error handling for request data
 */

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return next(new AppError('Validation failed', 400, errorMessages));
  }
  
  next();
};

/**
 * User Validation Rules
 */
const userValidation = {
  register: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('walletAddress')
      .trim()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Please provide a valid Ethereum wallet address'),
    
    body('role')
      .optional()
      .isIn(['client', 'developer', 'both'])
      .withMessage('Role must be either client, developer, or both'),
    
    handleValidationErrors
  ],

  updateProfile: [
    body('profile.name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('profile.bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    
    body('profile.skills')
      .optional()
      .isArray()
      .withMessage('Skills must be an array'),
    
    body('profile.portfolio')
      .optional()
      .trim()
      .isURL()
      .withMessage('Please provide a valid portfolio URL'),
    
    body('profile.hourlyRate')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Hourly rate must be a positive number'),
    
    handleValidationErrors
  ]
};

/**
 * Gig Validation Rules
 */
const gigValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be between 10 and 200 characters'),
    
    body('description')
      .trim()
      .isLength({ min: 50, max: 5000 })
      .withMessage('Description must be between 50 and 5000 characters'),
    
    body('category')
      .isIn([
        'web-development', 'mobile-development', 'blockchain-development',
        'ai-ml', 'data-science', 'devops', 'ui-ux-design',
        'smart-contracts', 'backend', 'frontend', 'full-stack', 'other'
      ])
      .withMessage('Invalid category'),
    
    body('skills')
      .isArray({ min: 1 })
      .withMessage('At least one skill is required'),
    
    body('pricing.type')
      .isIn(['fixed', 'hourly'])
      .withMessage('Pricing type must be either fixed or hourly'),
    
    body('pricing.amount')
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    body('deliveryTime')
      .isInt({ min: 1, max: 365 })
      .withMessage('Delivery time must be between 1 and 365 days'),
    
    handleValidationErrors
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Title must be between 10 and 200 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ min: 50, max: 5000 })
      .withMessage('Description must be between 50 and 5000 characters'),
    
    body('pricing.amount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a positive number'),
    
    handleValidationErrors
  ]
};

/**
 * Agreement Validation Rules
 */
const agreementValidation = {
  create: [
    body('developerId')
      .isMongoId()
      .withMessage('Invalid developer ID'),
    
    body('gigId')
      .optional()
      .isMongoId()
      .withMessage('Invalid gig ID'),
    
    body('project.name')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Project name must be between 5 and 200 characters'),
    
    body('project.description')
      .trim()
      .isLength({ min: 20, max: 5000 })
      .withMessage('Project description must be between 20 and 5000 characters'),
    
    body('project.expectedEndDate')
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid expected end date'),
    
    body('financials.totalValue')
      .isFloat({ min: 0 })
      .withMessage('Total value must be a positive number'),
    
    body('milestones')
      .isArray({ min: 1 })
      .withMessage('At least one milestone is required'),
    
    handleValidationErrors
  ],

  update: [
    body('project.description')
      .optional()
      .trim()
      .isLength({ min: 20, max: 5000 })
      .withMessage('Project description must be between 20 and 5000 characters'),
    
    handleValidationErrors
  ]
};

/**
 * Milestone Validation Rules
 */
const milestoneValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10 and 2000 characters'),
    
    body('financials.value')
      .isFloat({ min: 0 })
      .withMessage('Milestone value must be a positive number'),
    
    body('timeline.dueDate')
      .isISO8601()
      .toDate()
      .withMessage('Please provide a valid due date'),
    
    handleValidationErrors
  ],

  submit: [
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters'),
    
    handleValidationErrors
  ],

  review: [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    
    body('feedback')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Feedback cannot exceed 1000 characters'),
    
    handleValidationErrors
  ]
};

/**
 * Common Validation Rules
 */
const commonValidation = {
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format'),
    
    handleValidationErrors
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
  ],

  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    handleValidationErrors
  ]
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  // Basic sanitization - remove potentially dangerous characters
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj !== null && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        obj[key] = sanitize(obj[key]);
      });
    }
    
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

module.exports = {
  handleValidationErrors,
  userValidation,
  gigValidation,
  agreementValidation,
  milestoneValidation,
  commonValidation,
  sanitizeInput
};
