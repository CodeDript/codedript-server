/**
 * Validation Utilities
 * Business logic validation functions
 */

/**
 * Validate milestone values sum equals total agreement value
 * @param {array} milestones - Array of milestones
 * @param {number} totalValue - Total agreement value
 */
const validateMilestoneValues = (milestones, totalValue) => {
  const sum = milestones.reduce((acc, milestone) => {
    return acc + (milestone.financials?.value || milestone.value || 0);
  }, 0);

  const tolerance = 0.0001; // Allow small floating point differences
  const isValid = Math.abs(sum - totalValue) < tolerance;

  return {
    isValid,
    sum,
    totalValue,
    difference: totalValue - sum
  };
};

/**
 * Validate milestone dates
 * @param {array} milestones - Array of milestones
 * @param {Date} startDate - Agreement start date
 * @param {Date} endDate - Agreement end date
 */
const validateMilestoneDates = (milestones, startDate, endDate) => {
  const errors = [];

  milestones.forEach((milestone, index) => {
    const dueDate = new Date(milestone.timeline?.dueDate || milestone.dueDate);

    if (dueDate < new Date(startDate)) {
      errors.push({
        milestone: index + 1,
        error: 'Milestone due date cannot be before agreement start date'
      });
    }

    if (dueDate > new Date(endDate)) {
      errors.push({
        milestone: index + 1,
        error: 'Milestone due date cannot be after agreement end date'
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate agreement modification request
 * @param {object} currentAgreement - Current agreement state
 * @param {object} modification - Proposed modification
 */
const validateAgreementModification = (currentAgreement, modification) => {
  const errors = [];

  // Cannot modify completed agreements
  if (currentAgreement.status === 'completed') {
    errors.push('Cannot modify a completed agreement');
  }

  // Cannot modify cancelled agreements
  if (currentAgreement.status === 'cancelled') {
    errors.push('Cannot modify a cancelled agreement');
  }

  // Cannot reduce total value below already released amount
  if (modification.financials?.totalValue) {
    if (modification.financials.totalValue < currentAgreement.financials.releasedAmount) {
      errors.push('New total value cannot be less than already released amount');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate milestone completion eligibility
 * @param {object} milestone - Milestone object
 * @param {object} agreement - Agreement object
 */
const validateMilestoneCompletion = (milestone, agreement) => {
  const errors = [];

  if (milestone.status === 'completed' || milestone.status === 'approved') {
    errors.push('Milestone is already completed');
  }

  if (agreement.status !== 'active' && agreement.status !== 'in_progress') {
    errors.push('Agreement must be active to complete milestones');
  }

  if (!agreement.signatures?.client?.signed || !agreement.signatures?.developer?.signed) {
    errors.push('Agreement must be fully signed before milestone completion');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate payment release
 * @param {object} milestone - Milestone object
 * @param {object} agreement - Agreement object
 */
const validatePaymentRelease = (milestone, agreement) => {
  const errors = [];

  if (milestone.status !== 'completed') {
    errors.push('Milestone must be completed before payment release');
  }

  if (milestone.financials.isPaid) {
    errors.push('Payment has already been released for this milestone');
  }

  const remainingFunds = agreement.financials.totalValue - agreement.financials.releasedAmount;
  if (milestone.financials.value > remainingFunds) {
    errors.push('Insufficient funds in escrow');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate gig pricing
 * @param {object} pricing - Pricing object
 */
const validateGigPricing = (pricing) => {
  const errors = [];

  if (pricing.amount <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (pricing.type === 'hourly' && pricing.amount > 1000) {
    errors.push('Hourly rate seems unusually high');
  }

  if (pricing.type === 'fixed' && pricing.amount > 100000) {
    errors.push('Fixed price seems unusually high');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user role for action
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required role for action
 */
const validateUserRole = (userRole, requiredRole) => {
  if (userRole === 'both') {
    return { isValid: true };
  }

  if (userRole !== requiredRole) {
    return {
      isValid: false,
      error: `This action requires ${requiredRole} role`
    };
  }

  return { isValid: true };
};

/**
 * Validate agreement participants
 * @param {string} clientId - Client user ID
 * @param {string} developerId - Developer user ID
 */
const validateAgreementParticipants = (clientId, developerId) => {
  const errors = [];

  if (clientId === developerId) {
    errors.push('Client and developer cannot be the same user');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate wallet address format
 * @param {string} address - Ethereum wallet address
 */
const validateWalletAddress = (address) => {
  const regex = /^0x[a-fA-F0-9]{40}$/;
  
  return {
    isValid: regex.test(address),
    error: !regex.test(address) ? 'Invalid Ethereum wallet address format' : null
  };
};

/**
 * Validate file upload
 * @param {object} file - Uploaded file object
 * @param {object} options - Validation options
 */
const validateFileUpload = (file, options = {}) => {
  const errors = [];
  const {
    maxSize = 50 * 1024 * 1024, // 50MB
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
  } = options;

  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }

  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
  }

  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
const validateDateRange = (startDate, endDate) => {
  const errors = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (start > end) {
    errors.push('Start date cannot be after end date');
  }

  if (end < now) {
    errors.push('End date cannot be in the past');
  }

  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    errors.push('Date range cannot exceed 365 days');
  }

  return {
    isValid: errors.length === 0,
    errors,
    daysDifference: Math.ceil(daysDiff)
  };
};

/**
 * Validate email format
 * @param {string} email - Email address
 */
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return {
    isValid: regex.test(email),
    error: !regex.test(email) ? 'Invalid email format' : null
  };
};

/**
 * Validate password strength
 * @param {string} password - Password string
 */
const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak'
  };
};

module.exports = {
  validateMilestoneValues,
  validateMilestoneDates,
  validateAgreementModification,
  validateMilestoneCompletion,
  validatePaymentRelease,
  validateGigPricing,
  validateUserRole,
  validateAgreementParticipants,
  validateWalletAddress,
  validateFileUpload,
  validateDateRange,
  validateEmail,
  validatePassword
};
