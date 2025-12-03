const Agreement = require("../models/Agreement");
const User = require("../models/User");
const Gig = require("../models/Gig");

const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const pinataService = require("../services/pinataService");
const logger = require("../utils/logger");
const { AGREEMENT_STATUS } = require("../config/constants");

/**
 * @desc    Create a new agreement
 * @route   POST /agreements
 * @access  Private (Client only)
 */
const createAgreement = async (req, res, next) => {
  try {
    const {
      developer,
      gig,
      packageId,
      title,
      description,
      milestones,
    } = req.body;

    // Validate required fields
    if (!developer || !gig || !packageId || !title || !description) {
      return sendErrorResponse(res, 400, 
        "Please provide developer, gig, packageId, title, and description"
      );
    }

    // Verify the developer exists and has the correct role
    const developerUser = await User.findById(developer);
    if (!developerUser) {
      return sendErrorResponse(res, 404, "Developer not found");
    }
    if (developerUser.role !== "developer") {
      return sendErrorResponse(res, 400, "Selected user is not a developer");
    }

    // Verify the gig exists and belongs to the developer
    const gigDoc = await Gig.findById(gig);
    if (!gigDoc) {
      return sendErrorResponse(res, 404, "Gig not found");
    }
    if (gigDoc.developer.toString() !== developer) {
      return sendErrorResponse(res, 400, "Gig does not belong to the selected developer");
    }

    // Find the selected package by ID and get its price
    const selectedPackage = gigDoc.packages.id(packageId);
    if (!selectedPackage) {
      return sendErrorResponse(res, 404, "Package not found in the selected gig");
    }

    const totalValue = selectedPackage.price;

    // Get client info from authenticated user
    const clientUser = await User.findById(req.user.userId);
    if (!clientUser) {
      return sendErrorResponse(res, 404, "Client user not found");
    }

    // Parse milestones if it's a string (from form-data)
    let parsedMilestones = milestones;
    if (typeof milestones === "string") {
      try {
        parsedMilestones = JSON.parse(milestones);
      } catch (e) {
        return sendErrorResponse(res, 400, "Invalid milestones format");
      }
    }

    // Handle document uploads to Pinata (if any)
    const documentUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileName = `agreement_${Date.now()}_${file.originalname}`;

        const uploadResult = await pinataService.uploadFile(
          file.buffer,
          fileName,
          {
            mimeType: file.mimetype,
            keyvalues: {
              type: "agreement-document",
              agreementId: "pending",
              uploadedAt: new Date().toISOString(),
            },
          }
        );

        documentUrls.push({
          url: uploadResult.url,
          ipfsHash: uploadResult.ipfsHash,
        });
      }
    }

    // Create agreement
    const agreement = await Agreement.create({
      client: req.user.userId,
      clientInfo: {
        name: clientUser.fullname ,
        email: clientUser.email,
        walletAddress: clientUser.walletAddress,
      },
      developer,
      gig,
      title,
      description,
      status: "pending",
      financials: {
        totalValue: parseFloat(totalValue),
        releasedAmount: 0,
        remainingAmount: parseFloat(totalValue),
      },
      documents: documentUrls,
      milestones: parsedMilestones || [],
    });

    // Populate referenced documents
    await agreement.populate("client developer gig");

    logger.info(`Agreement created: ${agreement.agreementID}`);

    sendSuccessResponse(res, 201, "Agreement created successfully", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get agreement by ID or agreementID
 * @route   GET /agreements/:id
 * @access  Private
 */
const getAgreementById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by MongoDB _id first, then by agreementID
    let agreement = await Agreement.findById(id)
      .populate(
        "client",
        "fullname email walletAddress avatar profileCompleteness isProfileComplete"
      )
      .populate(
        "developer",
        "fullname email walletAddress avatar profileCompleteness isProfileComplete"
      )
      .populate("gig", "title gigID packages description");

    if (!agreement) {
      agreement = await Agreement.findOne({ agreementID: id })
        .populate(
          "client",
          "fullname email walletAddress avatar profileCompleteness isProfileComplete"
        )
        .populate(
          "developer",
          "fullname email walletAddress avatar profileCompleteness isProfileComplete"
        )
        .populate("gig", "title gigID packages description");
    }

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Verify user has access to this agreement
    const userId = req.user.userId;
    if (
      agreement.client._id.toString() !== userId &&
      agreement.developer._id.toString() !== userId
    ) {
      return sendErrorResponse(res, 403, 
        "You do not have permission to view this agreement"
      );
    }

    sendSuccessResponse(res, 200, "Agreement retrieved successfully", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update agreement
 * @route   PUT /agreements/:id
 * @access  Private (Client or Developer involved in the agreement)
 */
const updateAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, totalValue } = req.body;

    const agreement = await Agreement.findById(id);

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Verify user has access to this agreement
    const userId = req.user.userId;
    if (
      agreement.client.toString() !== userId &&
      agreement.developer.toString() !== userId
    ) {
      return sendErrorResponse(res, 403, 
        "You do not have permission to update this agreement"
      );
    }

    // Only allow updates if agreement is in pending status
    if (agreement.status !== "pending") {
      return sendErrorResponse(res, 400, 
        "Only pending agreements can be updated. Use specific endpoints for other changes."
      );
    }

    // Update fields
    if (title) agreement.title = title;
    if (description) agreement.description = description;
    if (totalValue) {
      agreement.financials.totalValue = parseFloat(totalValue);
      agreement.financials.remainingAmount =
        parseFloat(totalValue) - agreement.financials.releasedAmount;
    }

    await agreement.save();
    await agreement.populate("client developer gig");

    logger.info(`Agreement updated: ${agreement.agreementID}`);

    sendSuccessResponse(res, 200, "Agreement updated successfully", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete agreement
 * @route   DELETE /agreements/:id
 * @access  Private (Client who created it, and only if pending)
 */
const deleteAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agreement = await Agreement.findById(id);

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Only client who created the agreement can delete it
    if (agreement.client.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "Only the client who created the agreement can delete it"
      );
    }

    // Only allow deletion if agreement is pending or rejected
    if (!["pending", "rejected"].includes(agreement.status)) {
      return sendErrorResponse(res, 400, 
        "Only pending or rejected agreements can be deleted"
      );
    }

    await Agreement.findByIdAndDelete(id);

    logger.info(`Agreement deleted: ${agreement.agreementID}`);

    sendSuccessResponse(res, 200, "Agreement deleted successfully", null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update agreement status
 * @route   PATCH /agreements/:id/status
 * @access  Private
 */
const updateAgreementStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status) {
      return sendErrorResponse(res, 400, "Status is required");
    }

    // Validate status
    const validStatuses = Object.values(AGREEMENT_STATUS);
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, 400, 
        `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`
      );
    }

    const agreement = await Agreement.findById(id);

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    const userId = req.user.userId;

    // Status transition rules
    if (status === "active") {
      // Only developer can accept (pending -> active)
      if (agreement.developer.toString() !== userId) {
        return sendErrorResponse(res, 403, 
          "Only the developer can accept the agreement"
        );
      }
      if (agreement.status !== "pending") {
        return sendErrorResponse(res, 400, "Only pending agreements can be accepted");
      }
      agreement.startDate = new Date();
    } else if (status === "rejected") {
      // Only developer can reject
      if (agreement.developer.toString() !== userId) {
        return sendErrorResponse(res, 403, 
          "Only the developer can reject the agreement"
        );
      }
      if (agreement.status !== "pending") {
        return sendErrorResponse(res, 400, "Only pending agreements can be rejected");
      }
    } else if (status === "cancelled") {
      // Both parties can cancel before in-progress
      if (
        agreement.client.toString() !== userId 
      ) {
        return sendErrorResponse(res, 403, 
          "Only client can cancel the agreement"
        );
      }
      if (["in-progress", "completed"].includes(agreement.status)) {
        return sendErrorResponse(res, 400, "Cannot cancel in-progress or completed agreements");
      }
    } else if (status === "in-progress") {
      // Automatically set when work begins (developer)
      if (agreement.developer.toString() !== userId) {
        return sendErrorResponse(res, 403, 
          "Only the developer can start the agreement"
        );
      }
      if (agreement.status !== "active") {
        return sendErrorResponse(res, 400, "Only active agreements can be started");
      }
    } else if (status === "completed") {
      // Can be completed when all milestones are done or by mutual agreement
      if (
        agreement.client.toString() !== userId &&
        agreement.developer.toString() !== userId
      ) {
        return sendErrorResponse(res, 403, 
          "Only parties involved can complete the agreement"
        );
      }
      if (!["active", "in-progress"].includes(agreement.status)) {
        return sendErrorResponse(res, 400, 
          "Only active or in-progress agreements can be completed"
        );
      }
      agreement.endDate = new Date();
      // Note: statistics updated when status changes to "paid"
    } else if (status === "paid") {
      // Only client can mark as paid after completion
      if (agreement.client.toString() !== userId) {
        return sendErrorResponse(res, 403, 
          "Only the client can mark the agreement as paid"
        );
      }
      if (agreement.status !== "completed") {
        return sendErrorResponse(res, 400, 
          "Only completed agreements can be marked as paid"
        );
      }

      const paymentAmount = agreement.financials.totalValue;

      // Update all statistics for both parties when payment is confirmed
      await User.findByIdAndUpdate(
        agreement.client,
        { 
          $inc: { 
            "statistics.completedAgreements": 1,
            "statistics.totalSpent": paymentAmount
          } 
        },
        { new: true }
      );
      await User.findByIdAndUpdate(
        agreement.developer,
        { 
          $inc: { 
            "statistics.completedAgreements": 1,
            "statistics.totalEarned": paymentAmount
          } 
        },
        { new: true }
      );
      logger.info(
        `Updated statistics - Client ${agreement.client}: completedAgreements +1, totalSpent +${paymentAmount}; ` +
        `Developer ${agreement.developer}: completedAgreements +1, totalEarned +${paymentAmount}`
      );
    }

    agreement.status = status;

    if (status === "rejected" && rejectionReason) {
      agreement.rejectionReason = rejectionReason;
    }

    await agreement.save();
    await agreement.populate("client developer gig");

    logger.info(`Agreement status updated: ${agreement.agreementID} -> ${status}`);

    sendSuccessResponse(res, 200, "Agreement status updated successfully", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add deliverables to agreement
 * @route   POST /agreements/:id/deliverables
 * @access  Private (Developer only)
 */
const addDeliverables = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agreement = await Agreement.findById(id);

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Only developer can add deliverables
    if (agreement.developer.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "Only the developer can add deliverables"
      );
    }

    // Agreement must be in-progress or active
    if (!["in-progress"].includes(agreement.status)) {
      return sendErrorResponse(res, 400, 
        "Deliverables can only be added to active or in-progress agreements"
      );
    }

    // Handle file uploads to Pinata
    if (!req.files || req.files.length === 0) {
      return sendErrorResponse(res, 400, "Please upload at least one deliverable file");
    }

    const newDeliverables = [];

    for (const file of req.files) {
      const fileName = `deliverable_${agreement.agreementID}_${Date.now()}_${file.originalname}`;

      const uploadResult = await pinataService.uploadFile(
        file.buffer,
        fileName,
        {
          mimeType: file.mimetype,
          keyvalues: {
            type: "deliverable",
            agreementId: agreement.agreementID,
            uploadedAt: new Date().toISOString(),
          },
        }
      );

      newDeliverables.push({
        url: uploadResult.url,
        ipfsHash: uploadResult.ipfsHash,
        uploadedAt: new Date(),
      });
    }

    agreement.deliverables.push(...newDeliverables);
    await agreement.save();
    await agreement.populate("client developer gig");

    logger.info(`Deliverables added to agreement: ${agreement.agreementID}`);

    sendSuccessResponse(res, 200, "Deliverables added successfully", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete milestone by uploading preview files
 * @route   POST /agreements/:id/milestones/:milestoneId/complete
 * @access  Private (Developer only)
 */
const completeMilestoneWithPreviews = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;

    const agreement = await Agreement.findById(id);

    if (!agreement) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Only developer can complete milestones with previews
    if (agreement.developer.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "Only the developer can complete milestones"
      );
    }

    const milestone = agreement.milestones.id(milestoneId);

    if (!milestone) {
      return sendErrorResponse(res, 404, "Milestone not found");
    }

    // Handle file uploads to Pinata
    if (!req.files || req.files.length === 0) {
      return sendErrorResponse(res, 400, "Please upload at least one preview file to complete the milestone");
    }

    const newPreviews = [];

    for (const file of req.files) {
      const fileName = `milestone_preview_${agreement.agreementID}_${milestoneId}_${Date.now()}_${file.originalname}`;

      const uploadResult = await pinataService.uploadFile(
        file.buffer,
        fileName,
        {
          mimeType: file.mimetype,
          keyvalues: {
            type: "milestone-preview",
            agreementId: agreement.agreementID,
            milestoneId: milestoneId,
            uploadedAt: new Date().toISOString(),
          },
        }
      );

      newPreviews.push({
        url: uploadResult.url,
        ipfsHash: uploadResult.ipfsHash,
        uploadedAt: new Date(),
      });
    }

    // Add previews and mark milestone as completed
    milestone.previews.push(...newPreviews);
    milestone.status = "completed";
    milestone.completedAt = new Date();

    await agreement.save();
    await agreement.populate("client developer gig");

    logger.info(
      `Milestone completed in agreement: ${agreement.agreementID} - Milestone: ${milestone.name}`
    );

    sendSuccessResponse(res, 200, "Milestone completed successfully with preview files", {
      agreement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get agreements by user (client or developer)
 * @route   GET /agreements/user/:userId
 * @access  Private
 */
const getAgreementsByUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { role, status } = req.query;

    // Only allow users to fetch their own agreements
    if (userId !== req.user.userId) {
      return sendErrorResponse(res, 403, "You can only view your own agreements");
    }

    const filter = {};

    if (role === "client") {
      filter.client = userId;
    } else if (role === "developer") {
      filter.developer = userId;
    } else {
      filter.$or = [{ client: userId }, { developer: userId }];
    }

    if (status) {
      filter.status = status;
    }

    const agreements = await Agreement.find(filter)
      .populate(
        "client",
        "fullname email walletAddress avatar profileCompleteness isProfileComplete"
      )
      .populate(
        "developer",
        "fullname email walletAddress avatar profileCompleteness isProfileComplete"
      )
      .populate("gig", "title gigID packages")
      .sort({ createdAt: -1 });

    sendSuccessResponse(res, 200, "User agreements retrieved successfully", {
      agreements,
      count: agreements.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get agreement statistics
 * @route   GET /agreements/stats
 * @access  Private
 */
const getAgreementStats = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // Get counts by status
    const stats = await Agreement.aggregate([
      {
        $match: {
          $or: [{ client: userId }, { developer: userId }],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalValue: { $sum: "$financials.totalValue" },
        },
      },
    ]);

    // Get total statistics
    const totalAgreements = await Agreement.countDocuments({
      $or: [{ client: userId }, { developer: userId }],
    });

    const asClient = await Agreement.countDocuments({ client: userId });
    const asDeveloper = await Agreement.countDocuments({ developer: userId });

    sendSuccessResponse(res, 200, "Agreement statistics retrieved successfully", {
      stats,
      summary: {
        total: totalAgreements,
        asClient,
        asDeveloper,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAgreement,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
  updateAgreementStatus,
  addDeliverables,
  completeMilestoneWithPreviews,
  getAgreementsByUser,
  getAgreementStats,
};


