const RequestChange = require("../models/RequestChange");
const Agreement = require("../models/Agreement");

const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseHandler");
const pinataService = require("../services/pinataService");
const logger = require("../utils/logger");

/**
 * @desc    Create a new request change
 * @route   POST /request-changes
 * @access  Private (Client only)
 */
const createRequestChange = async (req, res, next) => {
  try {
    const { agreement, title, description } = req.body;

    // Debug logging
    logger.info('Request change creation started', {
      hasFiles: !!req.files,
      filesCount: req.files?.length || 0,
      bodyKeys: Object.keys(req.body)
    });

    // Validate required fields
    if (!agreement || !title || !description) {
      return sendErrorResponse(res, 400, 
        "Please provide agreement, title, and description"
      );
    }

    // Verify the agreement exists
    const agreementDoc = await Agreement.findById(agreement);
    if (!agreementDoc) {
      return sendErrorResponse(res, 404, "Agreement not found");
    }

    // Verify user is the client of the agreement
    if (agreementDoc.client.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "Only the client can create change requests for this agreement"
      );
    }

    // Agreement must be active or in-progress
    if (!["active", "in-progress"].includes(agreementDoc.status)) {
      return sendErrorResponse(res, 400, 
        "Change requests can only be created for active or in-progress agreements"
      );
    }

    // Handle file uploads to Pinata (if any)
    const fileUrls = [];
    if (req.files && req.files.length > 0) {
      logger.info(`Uploading ${req.files.length} files to Pinata`);
      
      for (const file of req.files) {
        const fileName = `request_change_${Date.now()}_${file.originalname}`;

        logger.info(`Uploading file: ${fileName}`, {
          size: file.size,
          mimetype: file.mimetype
        });

        const uploadResult = await pinataService.uploadFile(
          file.buffer,
          fileName,
          {
            mimeType: file.mimetype,
            keyvalues: {
              type: "request-change-file",
              agreementId: agreementDoc.agreementID,
              uploadedAt: new Date().toISOString(),
            },
          }
        );

        logger.info(`File uploaded successfully`, {
          ipfsHash: uploadResult.ipfsHash,
          url: uploadResult.url
        });

        fileUrls.push({
          ipfsHash: uploadResult.ipfsHash,
          url: uploadResult.url,
        });
      }
    } else {
      logger.warn('No files found in request');
    }

    // Create request change
    const requestChange = await RequestChange.create({
      agreement,
      title,
      description,
      files: fileUrls,
      status: "pending",
    });

    logger.info(`Request change created with ${fileUrls.length} files`, {
      requestID: requestChange.requestID,
      filesUploaded: fileUrls.length
    });

    await requestChange.populate("agreement", "agreementID title status");

    logger.info(`Request change created: ${requestChange.requestID}`);

    sendSuccessResponse(res, 201, "Request change created successfully", {
      requestChange,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get request change by ID or requestID
 * @route   GET /request-changes/:id
 * @access  Private
 */
const getRequestChangeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Try to find by MongoDB _id first, then by requestID
    let requestChange = await RequestChange.findById(id).populate(
      "agreement",
      "agreementID title status client developer"
    );

    if (!requestChange) {
      requestChange = await RequestChange.findOne({ requestID: id }).populate(
        "agreement",
        "agreementID title status client developer"
      );
    }

    if (!requestChange) {
      return sendErrorResponse(res, 404, "Request change not found");
    }

    // Verify user has access to this request change
    const userId = req.user.userId;
    if (
      requestChange.agreement.client.toString() !== userId &&
      requestChange.agreement.developer.toString() !== userId
    ) {
      return sendErrorResponse(res, 403, 
        "You do not have permission to view this request change"
      );
    }

    sendSuccessResponse(res, 200, "Request change retrieved successfully", {
      requestChange,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update request change status
 * @route   PATCH /request-changes/:id/status
 * @access  Private (Developer to accept, both parties to mark paid)
 */
const updateRequestChangeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendErrorResponse(res, 400, "Status is required");
    }

    const validStatuses = ["pending", "priced","paid"];
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, 400, 
        `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`
      );
    }

    const requestChange = await RequestChange.findById(id).populate(
      "agreement"
    );

    if (!requestChange) {
      return sendErrorResponse(res, 404, "Request change not found");
    }

    const userId = req.user.userId;

    // Status transition rules
    if (status === "priced") {
      return sendErrorResponse(res, 400, 
        "Use the /price endpoint to set the price for this request change"
      );
    } else if (status === "accepted") {
      // Only client can accept
      if (requestChange.agreement.client.toString() !== userId) {
        return sendErrorResponse(res, 403, 
          "Only the client can accept the request change"
        );
      }
      if (requestChange.status !== "priced") {
        return sendErrorResponse(res, 400, 
          "Only priced request changes can be accepted"
        );
      }
    } else if (status === "paid") {
      // Both parties can mark as paid
      if (
        requestChange.agreement.client.toString() !== userId &&
        requestChange.agreement.developer.toString() !== userId
      ) {
        return sendErrorResponse(res, 403, 
          "Only parties involved can mark request change as paid"
        );
      }
      if (requestChange.status !== "accepted") {
        return sendErrorResponse(res, 400, 
          "Only accepted request changes can be marked as paid"
        );
      }
    }

    requestChange.status = status;
    await requestChange.save();
    await requestChange.populate(
      "agreement",
      "agreementID title status client developer"
    );

    logger.info(
      `Request change status updated: ${requestChange.requestID} -> ${status}`
    );

    sendSuccessResponse(
      res,
      200,
      "Request change status updated successfully",
      {
        requestChange,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete request change
 * @route   DELETE /request-changes/:id
 * @access  Private (Client who created it, and only if pending)
 */
const deleteRequestChange = async (req, res, next) => {
  try {
    const { id } = req.params;

    const requestChange = await RequestChange.findById(id).populate(
      "agreement"
    );

    if (!requestChange) {
      return sendErrorResponse(res, 404, "Request change not found");
    }

    // Only client who created the request can delete it
    if (requestChange.agreement.client.toString() !== req.user.userId) {
      return sendErrorResponse(res, 403, 
        "Only the client who created the request change can delete it"
      );
    }

    // Only allow deletion if request is pending
    if (requestChange.status !== "pending") {
      return sendErrorResponse(res, 400, "Only pending request changes can be deleted");
    }

    await RequestChange.findByIdAndDelete(id);

    logger.info(`Request change deleted: ${requestChange.requestID}`);

    sendSuccessResponse(res, 200, "Request change deleted successfully", null);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get request changes by agreement
 * @route   GET /request-changes/agreement/:agreementId
 * @access  Private
 */
const getRequestChangesByAgreement = async (req, res, next) => {
  try {
    const { agreementId } = req.params;
    const { status } = req.query;

    // Verify the agreement exists
    const agreement = await Agreement.findById(agreementId);
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
        "You do not have permission to view request changes for this agreement"
      );
    }

    const filter = { agreement: agreementId };

    if (status) {
      filter.status = status;
    }

    const requestChanges = await RequestChange.find(filter)
      .populate("agreement", "agreementID title status")
      .sort({ createdAt: -1 });

    sendSuccessResponse(
      res,
      200,
      "Agreement request changes retrieved successfully",
      {
        requestChanges,
        count: requestChanges.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set price for a request change (Developer only)
 * @route   PATCH /request-changes/:id/price
 * @access  Private (Developer only)
 */
const setRequestChangePrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return sendErrorResponse(res, 400, "Valid price is required");
    }

    const requestChange = await RequestChange.findById(id).populate(
      "agreement"
    );

    if (!requestChange) {
      return sendErrorResponse(res, 404, "Request change not found");
    }

    const userId = req.user.userId;

    // Only developer can set price
    if (requestChange.agreement.developer.toString() !== userId) {
      return sendErrorResponse(res, 403, 
        "Only the developer can set the price for this request change"
      );
    }

    // Can only set price if status is pending
    if (requestChange.status !== "pending") {
      return sendErrorResponse(res, 400, 
        "Price can only be set for pending request changes"
      );
    }

    requestChange.price = parseFloat(price);
    requestChange.status = "priced";
    await requestChange.save();
    await requestChange.populate(
      "agreement",
      "agreementID title status client developer"
    );

    logger.info(
      `Price set for request change: ${requestChange.requestID} -> ${price}`
    );

    sendSuccessResponse(
      res,
      200,
      "Price set successfully",
      {
        requestChange,
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRequestChange,
  getRequestChangeById,
  updateRequestChangeStatus,
  setRequestChangePrice,
  deleteRequestChange,
  getRequestChangesByAgreement,
};


