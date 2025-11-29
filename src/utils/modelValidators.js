/**
 * Model Validation Helpers
 * Utilities to validate data against model enums and schema constraints
 */

const {
  USER_ROLES,
  AGREEMENT_STATUS,
  TRANSACTION_TYPES,
  BLOCKCHAIN_NETWORKS,
  MILESTONE_STATUS,
  REQUEST_CHANGE_STATUS,
  GIG_PACKAGE_TYPES,
} = require("../config/constants");

/**
 * Validate if value is in enum
 */
const isValidEnum = (value, enumObject) => {
  return Object.values(enumObject).includes(value);
};

/**
 * Validate user role
 */
const isValidUserRole = (role) => {
  return isValidEnum(role, USER_ROLES);
};

/**
 * Validate agreement status
 */
const isValidAgreementStatus = (status) => {
  return isValidEnum(status, AGREEMENT_STATUS);
};

/**
 * Validate transaction type
 */
const isValidTransactionType = (type) => {
  return isValidEnum(type, TRANSACTION_TYPES);
};

/**
 * Validate blockchain network
 */
const isValidBlockchainNetwork = (network) => {
  return isValidEnum(network, BLOCKCHAIN_NETWORKS);
};

/**
 * Validate milestone status
 */
const isValidMilestoneStatus = (status) => {
  return isValidEnum(status, MILESTONE_STATUS);
};

/**
 * Validate request change status
 */
const isValidRequestChangeStatus = (status) => {
  return isValidEnum(status, REQUEST_CHANGE_STATUS);
};

/**
 * Validate gig package type
 */
const isValidGigPackageType = (type) => {
  return isValidEnum(type, GIG_PACKAGE_TYPES);
};

/**
 * Validate wallet address format (Ethereum)
 */
const isValidWalletAddress = (address) => {
  if (!address || typeof address !== "string") return false;
  // Ethereum address format: 0x followed by 40 hex characters
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate MongoDB ObjectId format
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== "string") return false;
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate rating value (1-5)
 */
const isValidRating = (rating) => {
  return typeof rating === "number" && rating >= 1 && rating <= 5;
};

/**
 * Validate IPFS hash format
 */
const isValidIpfsHash = (hash) => {
  if (!hash || typeof hash !== "string") return false;
  // Common IPFS hash formats (CIDv0 and CIDv1)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})$/.test(hash);
};

/**
 * Validate transaction hash format (Ethereum)
 */
const isValidTransactionHash = (hash) => {
  if (!hash || typeof hash !== "string") return false;
  // Ethereum transaction hash: 0x followed by 64 hex characters
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Get all valid values for an enum
 */
const getEnumValues = (enumName) => {
  const enums = {
    USER_ROLES,
    AGREEMENT_STATUS,
    TRANSACTION_TYPES,
    BLOCKCHAIN_NETWORKS,
    MILESTONE_STATUS,
    REQUEST_CHANGE_STATUS,
    GIG_PACKAGE_TYPES,
  };

  return enums[enumName] ? Object.values(enums[enumName]) : [];
};

module.exports = {
  isValidEnum,
  isValidUserRole,
  isValidAgreementStatus,
  isValidTransactionType,
  isValidBlockchainNetwork,
  isValidMilestoneStatus,
  isValidRequestChangeStatus,
  isValidGigPackageType,
  isValidWalletAddress,
  isValidObjectId,
  isValidRating,
  isValidIpfsHash,
  isValidTransactionHash,
  getEnumValues,
};
