const User = require("../models/User");
const logger = require("../utils/logger");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseHandler");
const { AppError } = require("../utils/errorHandler");
const {
  generateToken,
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiration,
  isOTPExpired,
} = require("../utils/jwtUtils");
const { sendOTP, sendWelcomeEmail } = require("../services/emailService");
const supabaseConfig = require("../config/supabase");

/**
 * @desc    Login with MetaMask wallet
 * @route   POST /auth/wallet-login
 * @access  Public
 */
const loginWithWallet = async (req, res, next) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      throw new AppError("Wallet address is required", 400);
    }

    // Normalize wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase().trim();

    // Check if user exists
    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (user) {
      // Existing user - update last login
      user.lastLogin = new Date();
      if (user.firstLogin) {
        user.firstLogin = false;
      }
      await user.save();

      // Generate JWT token
      const token = generateToken({
        userId: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        email: user.email,
      });

      logger.info(`Wallet login successful for existing user: ${user._id}`);

      return sendSuccessResponse(res, 200, "Login successful", {
        token,
        user,
        isNewUser: false,
      });
    } else {
      // New user - create with pending state
      user = await User.create({
        walletAddress: normalizedAddress,
        lastLogin: new Date(),
      });

      // Generate JWT token
      const token = generateToken({
        userId: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
      });

      logger.info(`New user created via wallet login: ${user._id}`);

      return sendSuccessResponse(
        res,
        201,
        "Account created successfully. Please complete your profile.",
        {
          token,
          user,
          isNewUser: true,
          profileComplete: false,
        }
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request OTP for email login
 * @route   POST /auth/email/request-otp
 * @access  Public
 */
const requestEmailOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new AppError("Invalid email format", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists with this email
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Create new user with email only (pending state)
      user = await User.create({
        email: normalizedEmail,
        role: "client", // Default role for email-only users
        walletAddress: `pending_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`, // Temporary unique wallet address
      });

      logger.info(`New user created via email: ${user._id}`);
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    // Store OTP in user document
    user.OTP = {
      code: hashedOTP,
      expiresAt: getOTPExpiration(),
    };
    await user.save();

    // Send OTP via email
    await sendOTP(normalizedEmail, otp);

    logger.info(`OTP sent to email: ${normalizedEmail}`);

    sendSuccessResponse(
      res,
      200,
      "OTP sent successfully. Please check your email.",
      {
        email: normalizedEmail,
        expiresIn: "5 minutes",
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and login with email
 * @route   POST /auth/email/verify-otp
 * @access  Public
 */
const verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new AppError("Email and OTP are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Check if OTP exists
    if (!user.OTP || !user.OTP.code) {
      throw new AppError("No OTP found. Please request a new one.", 400);
    }

    // Check if OTP has expired
    if (isOTPExpired(user.OTP.expiresAt)) {
      // Clear expired OTP
      user.OTP = { code: null, expiresAt: null };
      await user.save();
      throw new AppError("OTP has expired. Please request a new one.", 400);
    }

    // Verify OTP
    if (!verifyOTP(otp, user.OTP.code)) {
      throw new AppError("Invalid OTP. Please try again.", 400);
    }

    // OTP is valid - clear it and update user
    user.OTP = { code: null, expiresAt: null };
    user.lastLogin = new Date();
    if (user.firstLogin) {
      user.firstLogin = false;
    }
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      walletAddress: user.walletAddress,
      role: user.role,
      email: user.email,
    });

    logger.info(`Email OTP verification successful for user: ${user._id}`);

    sendSuccessResponse(res, 200, "Login successful", {
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile (requires authentication)
 * @route   GET /auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // User is attached to request by auth middleware
    const user = await User.findById(req.user.userId).select("-OTP");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    sendSuccessResponse(res, 200, "User profile retrieved", {
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /auth/me
 * @access  Private
 */
const updateUser = async (req, res, next) => {
  try {
    const { fullname, bio, skills, role } = req.body;

    // Find user
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Handle avatar upload if file is provided
    let avatarUrl = user.avatar;
    if (req.file) {
      try {
        // Upload new avatar to Supabase
        const uploadResult = await supabaseConfig.uploadFile(
          req.file.buffer,
          req.file.originalname,
          "avatars",
          req.file.mimetype
        );

        avatarUrl = uploadResult.publicUrl;

        // Delete old avatar if it exists and is from Supabase
        if (user.avatar && user.avatar.includes("supabase")) {
          try {
            // Extract file path from URL
            const urlParts = user.avatar.split("/");
            const bucketIndex = urlParts.findIndex(
              (part) => part === supabaseConfig.bucketName
            );
            if (bucketIndex !== -1) {
              const filePath = urlParts.slice(bucketIndex + 1).join("/");
              await supabaseConfig.deleteFile(filePath);
              logger.info(`Old avatar deleted: ${filePath}`);
            }
          } catch (deleteError) {
            // Log error but don't fail the update
            logger.warn(`Failed to delete old avatar: ${deleteError.message}`);
          }
        }

        logger.info(`Avatar uploaded successfully for user: ${user._id}`);
      } catch (uploadError) {
        logger.error(`Avatar upload failed: ${uploadError.message}`);
        throw new AppError(
          `Failed to upload avatar: ${uploadError.message}`,
          500
        );
      }
    }

    // Update user fields
    if (fullname !== undefined) user.fullname = fullname;
    if (bio !== undefined) user.bio = bio;
    if (skills !== undefined) {
      // Parse skills if it's a string (from form-data)
      if (typeof skills === "string") {
        try {
          user.skills = JSON.parse(skills);
        } catch (e) {
          // If not JSON, treat as comma-separated string
          user.skills = skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(skills)) {
        user.skills = skills;
      }
    }
    if (role !== undefined) {
      // Validate role
      if (!["client", "developer"].includes(role)) {
        throw new AppError(
          "Invalid role. Must be 'client' or 'developer'",
          400
        );
      }
      user.role = role;
    }
    if (avatarUrl !== user.avatar) {
      user.avatar = avatarUrl;
    }

    await user.save();

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.OTP;

    logger.info(`User profile updated: ${user._id}`);

    sendSuccessResponse(res, 200, "Profile updated successfully", {
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginWithWallet,
  requestEmailOTP,
  verifyEmailOTP,
  getCurrentUser,
  updateUser,
};
