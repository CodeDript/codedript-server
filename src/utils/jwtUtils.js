const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const logger = require("./logger");

/**
 * Get JWT configuration from environment
 */
const getJWTConfig = () => {
  const secret =
    process.env.JWT_SECRET || "your-secret-key-change-in-production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!process.env.JWT_SECRET) {
    logger.warn(
      "JWT_SECRET not set in environment variables. Using default (not recommended for production)"
    );
  }

  return { secret, expiresIn };
};

/**
 * Generate JWT token
 * @param {Object} payload - Data to encode in token (user info)
 * @returns {String} JWT token
 */
const generateToken = (payload) => {
  try {
    const { secret, expiresIn } = getJWTConfig();

    const token = jwt.sign(payload, secret, {
      expiresIn,
      issuer: "codedript-api",
    });

    logger.info(
      `JWT token generated for user: ${payload.userId || payload.walletAddress}`
    );
    return token;
  } catch (error) {
    logger.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const { secret } = getJWTConfig();

    const decoded = jwt.verify(token, secret, {
      issuer: "codedript-api",
    });

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      logger.error("Error verifying JWT token:", error);
      throw new Error("Token verification failed");
    }
  }
};

/**
 * Generate a 6-digit OTP code
 * @returns {String} 6-digit OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash OTP for secure storage
 * @param {String} otp - OTP to hash
 * @returns {String} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/**
 * Verify OTP matches the hashed version
 * @param {String} otp - Plain OTP to verify
 * @param {String} hashedOTP - Hashed OTP to compare against
 * @returns {Boolean} True if OTP matches
 */
const verifyOTP = (otp, hashedOTP) => {
  const hash = hashOTP(otp);
  return hash === hashedOTP;
};

/**
 * Get OTP expiration time (5 minutes from now)
 * @returns {Date} Expiration date
 */
const getOTPExpiration = () => {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
};

/**
 * Check if OTP has expired
 * @param {Date} expiresAt - Expiration date
 * @returns {Boolean} True if expired
 */
const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

module.exports = {
  generateToken,
  verifyToken,
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiration,
  isOTPExpired,
};
