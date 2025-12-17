const mongoose = require("mongoose");

const requestChangeSchema = new mongoose.Schema(
  {
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agreement",
      required: true,
      index: true,
    },
    requestID: {
      type: String,
      unique: true,
      match: /^\d{2,}$/,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    files: [
      {
        ipfsHash: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "priced", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    price: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
requestChangeSchema.index({ requestID: 1 });
requestChangeSchema.index({ agreement: 1, status: 1 });
requestChangeSchema.index({ createdAt: -1 });

// Pre-save middleware to generate requestID
requestChangeSchema.pre("save", async function (next) {
  if (!this.requestID) {
    try {
      const lastRequest = await this.constructor.findOne(
        {},
        {},
        { sort: { requestID: -1 } }
      );
      if (lastRequest && lastRequest.requestID) {
        const lastNumber = parseInt(lastRequest.requestID);
        this.requestID = String(lastNumber + 1).padStart(2, "0");
      } else {
        this.requestID = "01";
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get requests by agreement
requestChangeSchema.statics.getByAgreement = function (agreementId) {
  return this.find({ agreement: agreementId }).sort({ createdAt: -1 });
};

// Static method to get requests by status
requestChangeSchema.statics.getByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

const RequestChange = mongoose.model("RequestChange", requestChangeSchema);

module.exports = RequestChange;
