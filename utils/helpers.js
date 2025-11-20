/**
 * Helper Utilities
 * Common utility functions used across the application
 */

/**
 * Generate random string
 * @param {number} length - Length of the string
 */
const generateRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Generate unique ID
 * @param {string} prefix - Prefix for the ID
 */
const generateUniqueId = (prefix = 'ID') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Slugify string (convert to URL-friendly format)
 * @param {string} str - String to slugify
 */
const slugify = (str) => {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 */
const capitalizeWords = (str) => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 */
const truncate = (str, length = 100) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Calculate percentage
 * @param {number} value - Current value
 * @param {number} total - Total value
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

/**
 * Parse pagination parameters
 * @param {object} query - Request query object
 */
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Sanitize filename
 * @param {string} filename - Filename to sanitize
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Parse sort parameters
 * @param {string} sortQuery - Sort query string (e.g., '-createdAt,name')
 */
const parseSortQuery = (sortQuery) => {
  if (!sortQuery) return {};

  const sortFields = sortQuery.split(',');
  const sortObject = {};

  sortFields.forEach(field => {
    if (field.startsWith('-')) {
      sortObject[field.substring(1)] = -1;
    } else {
      sortObject[field] = 1;
    }
  });

  return sortObject;
};

/**
 * Build query filter from request
 * @param {object} query - Request query object
 * @param {array} allowedFields - Allowed filter fields
 */
const buildQueryFilter = (query, allowedFields = []) => {
  const filter = {};

  allowedFields.forEach(field => {
    if (query[field]) {
      filter[field] = query[field];
    }
  });

  return filter;
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined/null values from object
 * @param {object} obj - Object to clean
 */
const cleanObject = (obj) => {
  const cleaned = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });

  return cleaned;
};

/**
 * Get time difference in human readable format
 * @param {Date} date - Date to compare
 */
const getTimeDifference = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Ethereum wallet address
 * @param {string} address - Wallet address to validate
 */
const isValidWalletAddress = (address) => {
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  return walletRegex.test(address);
};

/**
 * Delay execution (Promise-based)
 * @param {number} ms - Milliseconds to delay
 */
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 * @param {function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delayMs - Initial delay in milliseconds
 */
const retryWithBackoff = async (fn, maxRetries = 3, delayMs = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const backoffDelay = delayMs * Math.pow(2, i);
      // Retry with exponential backoff
      await delay(backoffDelay);
    }
  }
};

/**
 * Generate agreement ID
 */
const generateAgreementId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `AGR-${timestamp}-${random}`;
};

/**
 * Generate transaction ID
 * @param {string} type - Transaction type prefix
 */
const generateTransactionId = (type = 'TXN') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${type}-${timestamp}-${random}`;
};

/**
 * Calculate days between dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
const daysBetween = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is past
 * @param {Date} date - Date to check
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 */
const formatCurrency = (amount, currency = 'ETH') => {
  if (currency === 'ETH') {
    return `${amount.toFixed(4)} ETH`;
  }
  return `$${amount.toFixed(2)}`;
};

module.exports = {
  generateRandomString,
  generateUniqueId,
  slugify,
  capitalizeWords,
  truncate,
  formatFileSize,
  calculatePercentage,
  parsePagination,
  buildPaginationMeta,
  sanitizeFilename,
  parseSortQuery,
  buildQueryFilter,
  deepClone,
  cleanObject,
  getTimeDifference,
  isValidEmail,
  isValidWalletAddress,
  delay,
  retryWithBackoff,
  generateAgreementId,
  generateTransactionId,
  daysBetween,
  isPastDate,
  formatCurrency
};
