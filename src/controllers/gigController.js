const Gig = require("../models/Gig");
const User = require("../models/User");

const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const supabaseConfig = require("../config/supabase");
const logger = require("../utils/logger");

/**
 * @desc    Create a new gig
 * @route   POST /gigs
 * @access  Private (Developer only)
 */
const createGig = async (req, res, next) => {
  try {
    const { title, description, packages } = req.body;

    // Validate required fields
    if (!title || !description || !packages) {
      return sendErrorResponse(res, 400, 
        "Please provide title, description, and at least one package"
      );
    }

    // Parse packages if it's a string (from form-data)
    let parsedPackages = packages;
    if (typeof packages === "string") {
      try {
        parsedPackages = JSON.parse(packages);
      } catch (e) {
        return sendErrorResponse(res, 400, "Invalid packages format");
      }
    }

    // Validate packages
    if (!Array.isArray(parsedPackages) || parsedPackages.length === 0) {
      return sendErrorResponse(res, 400, "Please provide at least one package");
    }

    if (parsedPackages.length > 3) {
      return sendErrorResponse(res, 400, "A gig can have at most 3 packages");
    }

    // Handle image uploads to Supabase
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        for (const file of req.files) {
          const uploadResult = await supabaseConfig.uploadFile(
            file.buffer,
            file.originalname,
            "gig-images",
            file.mimetype
          );
          imageUrls.push(uploadResult.publicUrl);
        }
        logger.info(`Uploaded ${imageUrls.length} images for new gig`);
      } catch (uploadError) {
        logger.error(`Image upload failed: ${uploadError.message}`);
        return sendErrorResponse(res, 400, 
          `Failed to upload images: ${uploadError.message}`
        );
      }
    }

    // Create gig with authenticated user as developer
    const gig = await Gig.create({
      developer: req.user.userId,
      title,
      description,
      images: imageUrls,
      packages: parsedPackages,
    });

    // Populate developer details
    await gig.populate("developer", "username email walletAddress role");

    // Update developer's totalGigs statistics
    await User.findByIdAndUpdate(
      req.user.userId,
      { $inc: { "statistics.totalGigs": 1 } },
      { new: true }
    );
    logger.info(`Updated totalGigs for developer: ${req.user.userId}`);

    sendSuccessResponse(res, 201, "Gig created successfully", gig);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all gigs with filtering and pagination
 * @route   GET /gigs
 * @access  Public
 */
const getAllGigs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      developer,
      minPrice,
      maxPrice,
      isActive = true,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Filter by active status (default to active gigs only)
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    // Filter by developer
    if (developer) {
      filter.developer = developer;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = order === "asc" ? 1 : -1;

    // Execute query
    const gigs = await Gig.find(filter)
      .populate("developer", "username email walletAddress role")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Filter by price range if specified (done after query due to virtual field)
    let filteredGigs = gigs;
    if (minPrice || maxPrice) {
      filteredGigs = gigs.filter((gig) => {
        const priceRange = gig.priceRange;
        if (minPrice && priceRange.min < parseFloat(minPrice)) return false;
        if (maxPrice && priceRange.max > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Get total count for pagination
    const total = await Gig.countDocuments(filter);

    sendSuccessResponse(res, 200, "Gigs retrieved successfully", {
      gigs: filteredGigs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get gig by ID or gigID
 * @route   GET /gigs/:id
 * @access  Public
 */
const getGigById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by MongoDB _id first, then by gigID
    let gig = await Gig.findById(id).populate(
      "developer",
      "username email walletAddress role"
    );

    if (!gig) {
      // Try finding by gigID
      gig = await Gig.findOne({ gigID: id }).populate(
        "developer",
        "username email walletAddress role"
      );
    }

    if (!gig) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    sendSuccessResponse(res, 200, "Gig retrieved successfully", gig);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all gigs by a specific developer
 * @route   GET /gigs/developer/:developerId
 * @access  Public
 */
const getGigsByDeveloper = async (req, res, next) => {
  try {
    const { developerId } = req.params;
    const {
      page = 1,
      limit = 10,
      isActive,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Build filter
    const filter = { developer: developerId };
    if (isActive !== undefined) {
      filter.isActive = isActive === "true" || isActive === true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = order === "asc" ? 1 : -1;

    // Execute query
    const gigs = await Gig.find(filter)
      .populate("developer", "username email walletAddress role")
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Gig.countDocuments(filter);

    sendSuccessResponse(res, 200, "Developer gigs retrieved successfully", {
      gigs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update gig
 * @route   PUT /gigs/:id
 * @access  Private (Owner only)
 */
const updateGig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, packages } = req.body;

    // Find gig
    const gig = await Gig.findById(id);

    if (!gig) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    // Check if user is the owner
    if (gig.developer.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, "You can only update your own gigs");
    }

    // Parse packages if it's a string (from form-data)
    let parsedPackages = packages;
    if (packages && typeof packages === "string") {
      try {
        parsedPackages = JSON.parse(packages);
      } catch (e) {
        return sendErrorResponse(res, 400, "Invalid packages format");
      }
    }

    // Validate packages if provided
    if (parsedPackages) {
      if (
        !Array.isArray(parsedPackages) ||
        parsedPackages.length === 0 ||
        parsedPackages.length > 3
      ) {
        return sendErrorResponse(res, 400, 
          "A gig must have at least 1 and at most 3 packages"
        );
      }
    }

    // Handle image uploads to Supabase
    if (req.files && req.files.length > 0) {
      try {
        // Delete old images from Supabase
        if (gig.images && gig.images.length > 0) {
          for (const imageUrl of gig.images) {
            if (imageUrl.includes("supabase")) {
              try {
                const urlParts = imageUrl.split("/");
                const bucketIndex = urlParts.findIndex(
                  (part) => part === supabaseConfig.bucketName
                );
                if (bucketIndex !== -1) {
                  const filePath = urlParts.slice(bucketIndex + 1).join("/");
                  await supabaseConfig.deleteFile(filePath);
                  logger.info(`Deleted old gig image: ${filePath}`);
                }
              } catch (deleteError) {
                logger.warn(
                  `Failed to delete old image: ${deleteError.message}`
                );
              }
            }
          }
        }

        // Upload new images
        const imageUrls = [];
        for (const file of req.files) {
          const uploadResult = await supabaseConfig.uploadFile(
            file.buffer,
            file.originalname,
            "gig-images",
            file.mimetype
          );
          imageUrls.push(uploadResult.publicUrl);
        }
        gig.images = imageUrls;
        logger.info(`Uploaded ${imageUrls.length} new images for gig ${id}`);
      } catch (uploadError) {
        logger.error(`Image upload failed: ${uploadError.message}`);
        return sendErrorResponse(res, 400, 
          `Failed to upload images: ${uploadError.message}`
        );
      }
    }

    // Update fields
    if (title) gig.title = title;
    if (description) gig.description = description;
    if (parsedPackages) gig.packages = parsedPackages;

    await gig.save();

    // Populate developer details
    await gig.populate("developer", "username email walletAddress role");

    sendSuccessResponse(res, 200, "Gig updated successfully", gig);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete gig (soft delete by setting isActive to false)
 * @route   DELETE /gigs/:id
 * @access  Private (Owner only)
 */
const deleteGig = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find gig
    const gig = await Gig.findById(id);

    if (!gig) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    // Check if user is the owner
    if (gig.developer.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, "You can only delete your own gigs");
    }

    // Soft delete by setting isActive to false
    const wasActive = gig.isActive;
    if (wasActive) {
      gig.isActive = false;
      await gig.save();

      // Safely decrement developer's totalGigs statistics only if it won't go below 0
      try {
        const user = await User.findById(req.user.userId).select("statistics.totalGigs");
        const current = user && user.statistics ? user.statistics.totalGigs || 0 : 0;
        if (current > 0) {
          await User.findByIdAndUpdate(
            req.user.userId,
            { $inc: { "statistics.totalGigs": -1 } },
            { new: true, runValidators: true }
          );
          logger.info(`Decremented totalGigs for developer: ${req.user.userId}`);
        } else {
          logger.info(`Skipped decrementing totalGigs for developer: ${req.user.userId} (current=${current})`);
        }
      } catch (e) {
        logger.warn(`Failed to update totalGigs for developer ${req.user.userId}: ${e.message}`);
      }
    } else {
      // Already inactive: return a clear response and avoid changing statistics
      logger.info(`Gig ${gig._id} already inactive; no statistics change required`);
      return sendErrorResponse(res, 410, "Gig already deleted");
    }

    sendSuccessResponse(res, 200, "Gig deleted successfully", {
      gigId: gig._id,
      gigID: gig.gigID,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle gig active status
 * @route   PATCH /gigs/:id/toggle-status
 * @access  Private (Owner only)
 */
const toggleGigStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find gig
    const gig = await Gig.findById(id);

    if (!gig) {
      return sendErrorResponse(res, 404, "Gig not found");
    }

    // Check if user is the owner
    if (gig.developer.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "You can only toggle status of your own gigs"
      );
    }

    // Toggle status
    gig.isActive = !gig.isActive;
    await gig.save();

    // Populate developer details
    await gig.populate("developer", "username email walletAddress role");

    sendSuccessResponse(
      res,
      200,
      `Gig ${gig.isActive ? "activated" : "deactivated"} successfully`,
      gig
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGig,
  getAllGigs,
  getGigById,
  getGigsByDeveloper,
  updateGig,
  deleteGig,
  toggleGigStatus,
};


