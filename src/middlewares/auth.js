const jwt = require("jsonwebtoken");
const { sendErrorResponse } = require("../utils/responseHandler");
const { getConfig } = require("../config/environment");
const { verifyToken } = require("../utils/jwtUtils");

/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  const config = getConfig();

  return jwt.sign(
    payload,
    config.jwt?.secret || process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: config.jwt?.refreshExpiresIn || "30d" }
  );
};

/**
 * Protect route - require authentication
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return sendErrorResponse(res, 401, 
        "No token provided. Please login to access this resource"
      );
    }

    // Verify token
    try {
      const decoded = verifyToken(token);
      // Attach user info to request
      req.user = decoded;
    } catch (error) {
      if (error.message === "Token has expired") {
        return sendErrorResponse(res, 401, "Token has expired");
      } else if (error.message === "Invalid token") {
        return sendErrorResponse(res, 401, "Invalid token");
      } else {
        return sendErrorResponse(res, 401, "Invalid or expired token");
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(res, 401, "You must be logged in");
    }

    if (!roles.includes(req.user.role)) {
      return sendErrorResponse(res, 403, 
        `You do not have permission to perform this action. Required roles: ${roles.join(
          ", "
        )}`
      );
    }

    next();
  };
};

/**
 * Optional authentication - attach user if token exists but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = decoded;
      } catch (error) {
        // If token is invalid, just continue without user
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

module.exports = {
  generateRefreshToken,
  protect,
  restrictTo,
  optionalAuth,
};

