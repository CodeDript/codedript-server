const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionID: {
      type: String,
      required: true,
      unique: true,
      match: /^\d+$/,
    },
    type: {
      type: String,
      enum: ["creation", "modification", "completion"],
      required: true,
      index: true,
    },
    agreement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agreement",
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    network: {
      type: String,
      enum: ["mainnet", "sepolia", "goerli", "polygon", "mumbai"],
      required: true,
      index: true,
    },
    transactionHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      required: true,
    },
    blockHash: {
      type: String,
      required: true,
      trim: true,
    },
    contractAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
transactionSchema.index({ transactionID: 1 });
transactionSchema.index({ agreement: 1, type: 1 });
transactionSchema.index({ network: 1, createdAt: -1 });
transactionSchema.index({ transactionHash: 1 });

// Pre-save middleware to generate transactionID
transactionSchema.pre("save", async function (next) {
  if (!this.transactionID) {
    try {
      const lastTransaction = await this.constructor.findOne(
        {},
        {},
        { sort: { transactionID: -1 } }
      );
      if (lastTransaction && lastTransaction.transactionID) {
        const lastNumber = parseInt(lastTransaction.transactionID);
        this.transactionID = String(lastNumber + 1);
      } else {
        this.transactionID = "1";
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get transactions by agreement
transactionSchema.statics.getByAgreement = function (agreementId) {
  return this.find({ agreement: agreementId }).sort({ createdAt: -1 });
};

// Static method to get transactions by type
transactionSchema.statics.getByType = function (type) {
  return this.find({ type }).sort({ createdAt: -1 });
};

// Static method to get transactions by network
transactionSchema.statics.getByNetwork = function (network) {
  return this.find({ network }).sort({ createdAt: -1 });
};

// Virtual to check if transaction is on testnet
transactionSchema.virtual("isTestnet").get(function () {
  return ["sepolia", "goerli", "mumbai"].includes(this.network);
});

// Ensure virtuals are included in JSON
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
