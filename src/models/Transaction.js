const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionID: {
      type: String,
      unique: true,
      index: true,
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
    from: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    transactionFee: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
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
      // Retry up to 5 times to handle race conditions
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          // Find the highest transactionID by sorting numerically
          const lastTransaction = await this.constructor.findOne(
            { transactionID: { $ne: null, $exists: true, $regex: /^\d+$/ } },
            { transactionID: 1 }
          ).sort({ transactionID: -1 }).limit(1);
          
          let newID;
          if (lastTransaction && lastTransaction.transactionID) {
            const lastNumber = parseInt(lastTransaction.transactionID, 10);
            if (!isNaN(lastNumber)) {
              newID = String(lastNumber + 1).padStart(3, '0');
            } else {
              // Fallback to count
              const count = await this.constructor.countDocuments();
              newID = String(count + 1).padStart(3, '0');
            }
          } else {
            // First transaction
            newID = "001";
          }
          
          // Check if this ID already exists (race condition check)
          const existing = await this.constructor.findOne({ transactionID: newID });
          if (!existing) {
            this.transactionID = newID;
            break;
          }
          
          // ID collision detected, increment attempt and try again
          attempts++;
          if (attempts >= maxAttempts) {
            // Last resort: use timestamp-based unique ID
            this.transactionID = `TX${Date.now()}`;
            console.warn(`TransactionID generation collision, using timestamp-based ID: ${this.transactionID}`);
          }
        } catch (innerError) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw innerError;
          }
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error generating transactionID:', error);
      // Fallback: use timestamp-based ID
      this.transactionID = `TX${Date.now()}`;
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

// Virtual to calculate time ago
transactionSchema.virtual("timeAgo").get(function () {
  if (!this.timestampDate) return null;
  
  const now = new Date();
  const txTime = new Date(this.timestampDate);
  const diffMs = now - txTime;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return `${diffSecs} sec${diffSecs !== 1 ? 's' : ''} ago`;
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
});

// Ensure virtuals are included in JSON
transactionSchema.set("toJSON", { virtuals: true });
transactionSchema.set("toObject", { virtuals: true });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
