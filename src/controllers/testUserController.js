const TestUser = require("../models/TestUser");
const {
  USER_ROLES,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PAGINATION,
} = require("../config/constants");
const {
  catchAsync,
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../utils/errorHandler");
const {
  sendSuccess,
  sendError,
  sendPaginated,
} = require("../utils/responseHandler");
const logger = require("../utils/logger");
const {
  isEmpty,
  sanitizeObject,
  pick,
  parsePagination,
  isValidEmail,
  generateRandomString,
} = require("../utils/helpers");
const {
  isValidUserRole,
  isValidWalletAddress,
  isValidObjectId,
  isValidRating,
  isValidIpfsHash,
} = require("../utils/modelValidators");
const { generateToken } = require("../middlewares/auth");

/**
 * @desc    Create a new test user
 * @route   POST /api/test-users
 * @access  Public (for testing)
 */
exports.createTestUser = catchAsync(async (req, res) => {
  logger.info("Creating new test user", { body: req.body });

  const { username, email, walletAddress, role, bio, skills, rating } =
    req.body;

  // Validate required fields
  if (isEmpty(username) || isEmpty(email) || isEmpty(walletAddress)) {
    logger.warn("Missing required fields", { username, email, walletAddress });
    throw new ValidationError(
      "Username, email, and wallet address are required"
    );
  }

  // Validate email format
  if (!isValidEmail(email)) {
    throw new ValidationError("Invalid email format");
  }

  // Validate wallet address format
  if (!isValidWalletAddress(walletAddress)) {
    throw new ValidationError("Invalid wallet address format");
  }

  // Validate role if provided
  if (role && !isValidUserRole(role)) {
    throw new ValidationError(
      `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(", ")}`
    );
  }

  // Validate rating if provided
  if (rating && !isValidRating(rating)) {
    throw new ValidationError("Rating must be between 1 and 5");
  }

  // Check for duplicate email or wallet
  const existingUser = await TestUser.findOne({
    $or: [{ email }, { walletAddress }, { username }],
  });

  if (existingUser) {
    logger.warn("User already exists", { email, walletAddress, username });
    throw new ConflictError(
      "User with this email, username, or wallet address already exists"
    );
  }

  // Create user
  const testUser = await TestUser.create({
    username,
    email,
    walletAddress,
    role: role || USER_ROLES.CLIENT,
    profileData: {
      bio: bio || "",
      skills: skills || [],
      rating: rating || null,
    },
  });

  logger.info("Test user created successfully", { userId: testUser._id });

  sendSuccess(res, testUser, SUCCESS_MESSAGES.CREATED, HTTP_STATUS.CREATED);
});

/**
 * @desc    Get all test users with pagination
 * @route   GET /api/test-users
 * @access  Protected
 */
exports.getAllTestUsers = catchAsync(async (req, res) => {
  logger.info("Fetching all test users", { query: req.query });

  const { page, limit, skip } = parsePagination(req.query);
  const { status, role, search } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
  }

  if (role) {
    if (!isValidUserRole(role)) {
      throw new ValidationError("Invalid role parameter");
    }
    query.role = role;
  }

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Execute query with pagination
  const [users, total] = await Promise.all([
    TestUser.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    TestUser.countDocuments(query),
  ]);

  logger.info("Test users retrieved", { count: users.length, total });

  sendPaginated(
    res,
    users,
    {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    SUCCESS_MESSAGES.RETRIEVED
  );
});

/**
 * @desc    Get single test user by ID
 * @route   GET /api/test-users/:id
 * @access  Protected
 */
exports.getTestUserById = catchAsync(async (req, res) => {
  const { id } = req.params;

  logger.info("Fetching test user by ID", { userId: id });

  // Validate ObjectId format
  if (!isValidObjectId(id)) {
    throw new ValidationError("Invalid user ID format");
  }

  const user = await TestUser.findById(id);

  if (!user) {
    logger.warn("Test user not found", { userId: id });
    throw new NotFoundError("User");
  }

  logger.info("Test user found", { userId: id });

  sendSuccess(res, user, SUCCESS_MESSAGES.RETRIEVED);
});

/**
 * @desc    Update test user
 * @route   PUT /api/test-users/:id
 * @access  Protected
 */
exports.updateTestUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  logger.info("Updating test user", { userId: id, updates: req.body });

  // Validate ObjectId format
  if (!isValidObjectId(id)) {
    throw new ValidationError("Invalid user ID format");
  }

  const user = await TestUser.findById(id);

  if (!user) {
    throw new NotFoundError("User");
  }

  // Pick only allowed fields for update
  const allowedUpdates = [
    "username",
    "email",
    "bio",
    "skills",
    "rating",
    "status",
    "ipfsData",
  ];
  const updates = pick(req.body, allowedUpdates);

  // Validate specific fields if they're being updated
  if (updates.email && !isValidEmail(updates.email)) {
    throw new ValidationError("Invalid email format");
  }

  if (updates.rating && !isValidRating(updates.rating)) {
    throw new ValidationError("Rating must be between 1 and 5");
  }

  if (updates.ipfsData && !isValidIpfsHash(updates.ipfsData)) {
    throw new ValidationError("Invalid IPFS hash format");
  }

  // Apply updates
  if (updates.bio !== undefined) user.profileData.bio = updates.bio;
  if (updates.skills !== undefined) user.profileData.skills = updates.skills;
  if (updates.rating !== undefined) user.profileData.rating = updates.rating;
  if (updates.ipfsData !== undefined) user.metadata.ipfsData = updates.ipfsData;
  if (updates.username !== undefined) user.username = updates.username;
  if (updates.email !== undefined) user.email = updates.email;
  if (updates.status !== undefined) user.status = updates.status;

  await user.save();

  logger.info("Test user updated successfully", { userId: id });

  sendSuccess(res, user, SUCCESS_MESSAGES.UPDATED);
});

/**
 * @desc    Delete test user
 * @route   DELETE /api/test-users/:id
 * @access  Protected
 */
exports.deleteTestUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  logger.info("Deleting test user", { userId: id });

  // Validate ObjectId format
  if (!isValidObjectId(id)) {
    throw new ValidationError("Invalid user ID format");
  }

  const user = await TestUser.findById(id);

  if (!user) {
    throw new NotFoundError("User");
  }

  await user.deleteOne();

  logger.info("Test user deleted successfully", { userId: id });

  sendSuccess(res, null, SUCCESS_MESSAGES.DELETED);
});

/**
 * @desc    Login and get JWT token
 * @route   POST /api/test-users/:id/login
 * @access  Public
 */
exports.recordLogin = catchAsync(async (req, res) => {
  const { id } = req.params;

  logger.info("Recording login for test user", { userId: id });

  // Validate ObjectId format
  if (!isValidObjectId(id)) {
    throw new ValidationError("Invalid user ID format");
  }

  const user = await TestUser.findById(id);

  if (!user) {
    throw new NotFoundError("User");
  }

  // Update last login (this will trigger pre-save middleware to increment count)
  user.metadata.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken({
    id: user._id,
    username: user.username,
    email: user.email,
    walletAddress: user.walletAddress,
    role: user.role,
  });

  logger.info("Login recorded and token generated", {
    userId: id,
    loginCount: user.metadata.loginCount,
  });

  sendSuccess(
    res,
    {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        loginCount: user.metadata.loginCount,
        lastLogin: user.metadata.lastLogin,
      },
    },
    "Login successful"
  );
});

/**
 * @desc    Get user statistics
 * @route   GET /api/test-users/stats
 * @access  Protected
 */
exports.getStats = catchAsync(async (req, res) => {
  logger.info("Fetching test user statistics");

  const stats = await TestUser.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        developers: {
          $sum: { $cond: [{ $eq: ["$role", "developer"] }, 1, 0] },
        },
        clients: {
          $sum: { $cond: [{ $eq: ["$role", "client"] }, 1, 0] },
        },
        averageRating: { $avg: "$profileData.rating" },
      },
    },
  ]);

  const result = stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    developers: 0,
    clients: 0,
    averageRating: 0,
  };

  logger.info("Statistics retrieved", result);

  sendSuccess(res, result, "Statistics retrieved successfully");
});
