const User = require("../models/User");
const logger = require("../utils/logger");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
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
      return sendErrorResponse(res, 400, "Wallet address is required");
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
      return sendErrorResponse(res, 400, "Email is required");
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(res, 400, "Invalid email format");
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
      return sendErrorResponse(res, 400, "Email and OTP are required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // Check if OTP exists
    if (!user.OTP || !user.OTP.code) {
      return sendErrorResponse(res, 400, "No OTP found. Please request a new one.");
    }

    // Check if OTP has expired
    if (isOTPExpired(user.OTP.expiresAt)) {
      // Clear expired OTP
      user.OTP = { code: null, expiresAt: null };
      await user.save();
      return sendErrorResponse(res, 400, "OTP has expired. Please request a new one.");
    }

    // Verify OTP
    if (!verifyOTP(otp, user.OTP.code)) {
      return sendErrorResponse(res, 400, "Invalid OTP. Please try again.");
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
      return sendErrorResponse(res, 404, "User not found");
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
    const { fullname, bio, skills, role, email } = req.body;

    // Find user
    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
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
        return sendErrorResponse(res, 500, `Failed to upload avatar: ${uploadError.message}`);
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
        return sendErrorResponse(res, 400, "Invalid role. Must be 'client' or 'developer'");
      }
      user.role = role;
    }
    if (email !== undefined && email !== null && email !== "") {
      // Validate and normalize email
      const emailRegex = /^\S+@\S+\.\S+$/;
      const normalizedEmail = String(email).toLowerCase().trim();

      if (!emailRegex.test(normalizedEmail)) {
        return sendErrorResponse(res, 400, "Invalid email format");
      }

      // Check if email is already in use by another user
      const existingUserByEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: user._id },
      });

      if (existingUserByEmail) {
        return sendErrorResponse(res, 400, "Email is already in use");
      }

      user.email = normalizedEmail;
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



