const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema(
  {
    agreementID: {
      type: String,
      unique: true,
      match: /^\d{3,}$/,
    },
    blockchain: {
      agreementId: {
        type: Number,
        sparse: true, // Allows null values while maintaining uniqueness for non-null values
        index: true,
      },
      transactionHash: {
        type: String,
        trim: true,
      },
      contractAddress: {
        type: String,
        trim: true,
      },
      createdAt: {
        type: Date,
      },
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    packageId: {
      type: String,
      required: true,
      trim: true,
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
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "rejected",
        "cancelled",
        "active",
        "in-progress",
        "completed",
        "priced",
        "paid"
      ],
      default: "pending",
      index: true,
    },
    deliverables: [
      {
        url: {
          type: String,
          trim: true,
        },
        ipfsHash: {
          type: String,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    financials: {
      totalValue: {
        type: Number,
        required: true,
        min: 0,
      },
      releasedAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      remainingAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    documents: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        ipfsHash: {
          type: String,
          required: true,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    milestones: [
      {
        name: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          default: "",
        },
        status: {
          type: String,
          enum: ["pending", "inProgress", "completed"],
          default: "pending",
        },
        previews: [
          {
            url: {
              type: String,
              trim: true,
            },
            ipfsHash: {
              type: String,
              trim: true,
            },
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        completedAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
agreementSchema.index({ agreementID: 1 });
agreementSchema.index({ client: 1, status: 1 });
agreementSchema.index({ developer: 1, status: 1 });
agreementSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to generate agreementID
agreementSchema.pre("save", async function (next) {
  if (!this.agreementID) {
    try {
      const lastAgreement = await this.constructor.findOne(
        {},
        {},
        { sort: { agreementID: -1 } }
      );
      if (lastAgreement && lastAgreement.agreementID) {
        const lastNumber = parseInt(lastAgreement.agreementID);
        this.agreementID = String(lastNumber + 1).padStart(3, "0");
      } else {
        this.agreementID = "001";
      }
    } catch (error) {
      return next(error);
    }
  }

  // Auto-calculate remaining amount
  if (this.financials) {
    this.financials.remainingAmount =
      this.financials.totalValue - this.financials.releasedAmount;
  }

  next();
});

// Virtual for agreement progress percentage
agreementSchema.virtual("progressPercentage").get(function () {
  if (!this.milestones || this.milestones.length === 0) return 0;
  const completedMilestones = this.milestones.filter(
    (m) => m.status === "completed"
  ).length;
  return Math.round((completedMilestones / this.milestones.length) * 100);
});

// Ensure virtuals are included in JSON and remove redundant stored info
agreementSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    // Remove redundant clientInfo/developerInfo if present in stored documents
    if (ret.clientInfo) delete ret.clientInfo;
    if (ret.developerInfo) delete ret.developerInfo;
    return ret;
  },
});

agreementSchema.set("toObject", { virtuals: true });

// Static method to get agreements by status
agreementSchema.statics.getByStatus = function (status, userId = null) {
  const query = { status };
  if (userId) {
    query.$or = [{ client: userId }, { developer: userId }];
  }
  return this.find(query)
    .populate("client developer gig")
    .sort({ createdAt: -1 });
};

const Agreement = mongoose.model("Agreement", agreementSchema);

module.exports = Agreement;
