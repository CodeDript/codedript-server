const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');
const environmentConfig = require('../config/environment');

/**
 * Upload Middleware
 * Handles file uploads with validation and storage configuration
 */

/**
 * Configure multer storage (memory storage for Supabase upload)
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 */
const fileFilter = (req, file, cb) => {
  const config = environmentConfig.getConfig();
  const allowedMimeTypes = config.upload.allowedMimeTypes;

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        400
      ),
      false
    );
  }
};

/**
 * Create multer upload instance
 */
const createUploadMiddleware = (options = {}) => {
  const config = environmentConfig.getConfig();

  const uploadConfig = {
    storage,
    fileFilter,
    limits: {
      fileSize: options.maxSize || config.upload.maxFileSize
    }
  };

  return multer(uploadConfig);
};

/**
 * Upload single file middleware
 * @param {string} fieldName - Name of the form field
 * @param {object} options - Upload options
 */
const uploadSingle = (fieldName, options = {}) => {
  const upload = createUploadMiddleware(options);
  return upload.single(fieldName);
};

/**
 * Upload multiple files middleware
 * @param {string} fieldName - Name of the form field
 * @param {number} maxCount - Maximum number of files
 * @param {object} options - Upload options
 */
const uploadMultiple = (fieldName, maxCount = 10, options = {}) => {
  const upload = createUploadMiddleware(options);
  return upload.array(fieldName, maxCount);
};

/**
 * Upload multiple fields middleware
 * @param {Array} fields - Array of field configurations
 * @param {object} options - Upload options
 */
const uploadFields = (fields, options = {}) => {
  const upload = createUploadMiddleware(options);
  return upload.fields(fields);
};

/**
 * Validate uploaded file
 */
const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return next(new AppError('No file uploaded', 400));
  }

  next();
};

/**
 * Validate file size
 */
const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    const file = req.file || (req.files && req.files[0]);

    if (!file) {
      return next(new AppError('No file uploaded', 400));
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return next(
        new AppError(`File size exceeds maximum limit of ${maxSizeMB}MB`, 400)
      );
    }

    next();
  };
};

/**
 * Validate PDF file
 */
const validatePDF = (req, res, next) => {
  const file = req.file || (req.files && req.files[0]);

  if (!file) {
    return next(new AppError('No file uploaded', 400));
  }

  if (file.mimetype !== 'application/pdf') {
    return next(new AppError('Only PDF files are allowed', 400));
  }

  next();
};

/**
 * Validate image file
 */
const validateImage = (req, res, next) => {
  const file = req.file || (req.files && req.files[0]);

  if (!file) {
    return next(new AppError('No file uploaded', 400));
  }

  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (!allowedImageTypes.includes(file.mimetype)) {
    return next(
      new AppError('Only JPEG, PNG, GIF, and WebP images are allowed', 400)
    );
  }

  next();
};

/**
 * Get file extension from mimetype
 */
const getFileExtension = (mimetype) => {
  const mimeToExt = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/zip': '.zip'
  };

  return mimeToExt[mimetype] || '';
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(sanitizedName);
  const nameWithoutExt = path.basename(sanitizedName, ext);

  return `${prefix}${prefix ? '-' : ''}${nameWithoutExt}-${timestamp}-${randomString}${ext}`;
};

/**
 * Handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const config = environmentConfig.getConfig();
      const maxSizeMB = (config.upload.maxFileSize / (1024 * 1024)).toFixed(2);
      return next(new AppError(`File size exceeds maximum limit of ${maxSizeMB}MB`, 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field', 400));
    }
    return next(new AppError(err.message, 400));
  }

  next(err);
};

/**
 * Default upload instance for convenience
 */
const upload = createUploadMiddleware();

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,
  validateFile,
  validateFileSize,
  validatePDF,
  validateImage,
  getFileExtension,
  generateFileName,
  handleMulterError
};
