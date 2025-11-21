const mongoose = require('mongoose');

const contractVersionSchema = new mongoose.Schema({
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: [true, 'Agreement reference is required'],
    index: true
  },
  versionNumber: {
    type: Number,
    required: [true, 'Version number is required'],
    min: [1, 'Version number must be at least 1']
  },
  ipfsHash: {
    type: String,
    required: [true, 'IPFS hash is required']
  },
  metadataHash: {
    type: String
  },
  changes: [{
    field: {
      type: String,
      required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    description: String
  }],
  modifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Modified by user is required']
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Reason cannot exceed 1000 characters']
  },
  blockchain: {
    updateTxHash: String,
    blockNumber: Number,
    network: {
      type: String,
      enum: ['mainnet', 'sepolia', 'goerli', 'polygon', 'mumbai', 'local'],
      default: 'sepolia'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'pending_approval', 'approved', 'rejected', 'active'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft'
  },
  approvals: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    signature: String,
    transactionHash: String
  }],
  metadata: {
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
contractVersionSchema.index({ agreement: 1, versionNumber: 1 }, { unique: true });
contractVersionSchema.index({ status: 1, createdAt: -1 });
contractVersionSchema.index({ 'blockchain.updateTxHash': 1 });

// Virtual for is fully approved
contractVersionSchema.virtual('isFullyApproved').get(function() {
  if (this.approvals.length === 0) return false;
  return this.approvals.every(approval => approval.approved === true);
});

// Pre-save middleware
contractVersionSchema.pre('save', async function(next) {
  // Auto-increment version number if not set
  if (this.isNew && !this.versionNumber) {
    const latestVersion = await this.constructor
      .findOne({ agreement: this.agreement })
      .sort({ versionNumber: -1 });
    
    this.versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
  }
  
  next();
});

// Method to approve version
contractVersionSchema.methods.approve = async function(userId, signature, txHash) {
  const approval = this.approvals.find(a => a.user.toString() === userId.toString());
  
  if (approval) {
    approval.approved = true;
    approval.approvedAt = new Date();
    approval.signature = signature;
    approval.transactionHash = txHash;
  } else {
    this.approvals.push({
      user: userId,
      approved: true,
      approvedAt: new Date(),
      signature,
      transactionHash: txHash
    });
  }
  
  // Check if fully approved
  const requiredApprovals = 2; // Client and Developer
  const approvedCount = this.approvals.filter(a => a.approved).length;
  
  if (approvedCount >= requiredApprovals) {
    this.status = 'approved';
  }
  
  return this.save();
};

// Method to reject version
contractVersionSchema.methods.reject = async function(userId) {
  this.status = 'rejected';
  return this.save();
};

// Static method to find by agreement
contractVersionSchema.statics.findByAgreement = function(agreementId) {
  return this.find({ agreement: agreementId })
    .sort({ versionNumber: -1 })
    .populate('modifiedBy approvals.user', 'profile.name email walletAddress');
};

// Static method to get latest version
contractVersionSchema.statics.getLatestVersion = function(agreementId) {
  return this.findOne({ agreement: agreementId })
    .sort({ versionNumber: -1 })
    .populate('modifiedBy approvals.user', 'profile.name email walletAddress');
};

module.exports = mongoose.model('ContractVersion', contractVersionSchema);
