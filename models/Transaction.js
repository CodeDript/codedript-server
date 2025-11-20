const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: [
        'escrow_deposit',
        'milestone_payment',
        'refund',
        'platform_fee',
        'withdrawal',
        'other'
      ],
      message: '{VALUE} is not a valid transaction type'
    },
    index: true
  },
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    index: true
  },
  milestone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  },
  from: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'From user is required']
    },
    walletAddress: {
      type: String,
      required: [true, 'From wallet address is required']
    }
  },
  to: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'To user is required']
    },
    walletAddress: {
      type: String,
      required: [true, 'To wallet address is required']
    }
  },
  amount: {
    value: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETH',
      enum: ['ETH', 'USD']
    },
    usdValue: {
      type: Number
    }
  },
  fees: {
    platformFee: {
      type: Number,
      default: 0
    },
    networkFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: [
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'refunded'
      ],
      message: '{VALUE} is not a valid transaction status'
    },
    default: 'pending',
    index: true
  },
  blockchain: {
    isOnChain: {
      type: Boolean,
      default: false
    },
    network: {
      type: String,
      enum: ['mainnet', 'sepolia', 'goerli', 'polygon', 'local']
    },
    transactionHash: {
      type: String,
      index: true
    },
    blockNumber: {
      type: Number
    },
    blockHash: {
      type: String
    },
    contractAddress: {
      type: String
    },
    gasUsed: {
      type: String
    },
    gasPrice: {
      type: String
    },
    confirmations: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    notes: {
      type: String,
      trim: true
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  timestamps: {
    initiated: {
      type: Date,
      default: Date.now
    },
    processed: {
      type: Date
    },
    completed: {
      type: Date
    },
    failed: {
      type: Date
    }
  },
  error: {
    code: {
      type: String
    },
    message: {
      type: String
    },
    stack: {
      type: String
    }
  },
  receipt: {
    receiptId: {
      type: String
    },
    receiptUrl: {
      type: String
    },
    generatedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
transactionSchema.index({ 'from.user': 1, status: 1 });
transactionSchema.index({ 'to.user': 1, status: 1 });
transactionSchema.index({ agreement: 1, type: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ 'blockchain.transactionHash': 1 });
transactionSchema.index({ type: 1, createdAt: -1 });

// Virtual for net amount (amount - fees)
transactionSchema.virtual('netAmount').get(function() {
  return this.amount.value - this.fees.totalFees;
});

// Virtual for is completed
transactionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for is pending
transactionSchema.virtual('isPending').get(function() {
  return this.status === 'pending' || this.status === 'processing';
});

// Pre-save middleware to generate transaction ID
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const count = await this.constructor.countDocuments();
    const typePrefix = this.type.split('_').map(word => word[0].toUpperCase()).join('');
    this.transactionId = `TXN-${typePrefix}-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Calculate total fees
  if (this.isModified('fees.platformFee') || this.isModified('fees.networkFee')) {
    this.fees.totalFees = (this.fees.platformFee || 0) + (this.fees.networkFee || 0);
  }
  
  // Update timestamp based on status
  if (this.isModified('status')) {
    switch (this.status) {
      case 'processing':
        this.timestamps.processed = new Date();
        break;
      case 'completed':
        this.timestamps.completed = new Date();
        break;
      case 'failed':
        this.timestamps.failed = new Date();
        break;
    }
  }
  
  next();
});

// Method to mark as completed
transactionSchema.methods.markCompleted = async function(blockchainData = {}) {
  this.status = 'completed';
  this.timestamps.completed = new Date();
  
  if (blockchainData.transactionHash) {
    this.blockchain.isOnChain = true;
    this.blockchain.transactionHash = blockchainData.transactionHash;
    this.blockchain.blockNumber = blockchainData.blockNumber;
    this.blockchain.blockHash = blockchainData.blockHash;
    this.blockchain.gasUsed = blockchainData.gasUsed;
    this.blockchain.gasPrice = blockchainData.gasPrice;
  }
  
  return this.save();
};

// Method to mark as failed
transactionSchema.methods.markFailed = async function(errorCode, errorMessage) {
  this.status = 'failed';
  this.timestamps.failed = new Date();
  this.error.code = errorCode;
  this.error.message = errorMessage;
  
  return this.save();
};

// Method to update confirmations
transactionSchema.methods.updateConfirmations = async function(confirmations) {
  this.blockchain.confirmations = confirmations;
  return this.save({ validateBeforeSave: false });
};

// Static method to find by user
transactionSchema.statics.findByUser = function(userId, role = 'both') {
  const query = { status: { $ne: 'cancelled' } };
  
  if (role === 'sender' || role === 'both') {
    query['from.user'] = userId;
  }
  if (role === 'receiver' || role === 'both') {
    query['to.user'] = userId;
  }
  
  return this.find(query)
    .populate('from.user to.user agreement milestone')
    .sort({ createdAt: -1 });
};

// Static method to find by agreement
transactionSchema.statics.findByAgreement = function(agreementId) {
  return this.find({ agreement: agreementId })
    .populate('from.user to.user milestone')
    .sort({ createdAt: -1 });
};

// Static method to get user transaction summary
transactionSchema.statics.getUserSummary = async function(userId) {
  const sent = await this.aggregate([
    { $match: { 'from.user': new mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount.value' }, count: { $sum: 1 } } }
  ]);
  
  const received = await this.aggregate([
    { $match: { 'to.user': new mongoose.Types.ObjectId(userId), status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount.value' }, count: { $sum: 1 } } }
  ]);
  
  return {
    sent: sent[0] || { total: 0, count: 0 },
    received: received[0] || { total: 0, count: 0 }
  };
};

module.exports = mongoose.model('Transaction', transactionSchema);
