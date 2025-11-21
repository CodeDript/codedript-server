const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  agreementId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client reference is required'],
    index: true
  },
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Developer reference is required'],
    index: true
  },
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    index: true
  },
  project: {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    requirements: {
      type: String,
      trim: true
    },
    deliverables: [{
      type: String,
      trim: true
    }],
    startDate: {
      type: Date,
      default: Date.now
    },
    expectedEndDate: {
      type: Date,
      required: [true, 'Expected end date is required']
    },
    actualEndDate: {
      type: Date
    }
  },
  financials: {
    totalValue: {
      type: Number,
      required: [true, 'Total value is required'],
      min: [0, 'Total value cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETH',
      enum: ['ETH', 'USD']
    },
    releasedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingAmount: {
      type: Number,
      default: function() {
        return this.financials.totalValue;
      }
    },
    platformFee: {
      percentage: {
        type: Number,
        default: 2.5,
        min: 0,
        max: 100
      },
      amount: {
        type: Number,
        default: 0
      }
    }
  },
  milestones: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone'
  }],
  milestoneStats: {
    total: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    },
    approved: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    }
  },
  documents: {
    contractPdf: {
      url: {
        type: String
      },
      ipfsHash: {
        type: String
      },
      supabaseId: {
        type: String
      },
      uploadedAt: {
        type: Date
      }
    },
    projectFiles: [{
      name: String,
      url: String,
      ipfsHash: String,
      supabaseId: String,
      description: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    additionalFiles: [{
      name: String,
      url: String,
      supabaseId: String,
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  modifications: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modificationType: {
      type: String,
      enum: ['scope_change', 'timeline_change', 'payment_change', 'milestone_change', 'other']
    },
    description: {
      type: String,
      required: true
    },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    additionalCost: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalTxHash: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: {
      values: [
        'draft',                  // Client created, uploading project files
        'pending_developer',      // Waiting for developer to review & add milestones
        'pending_client',         // Waiting for client to approve milestones
        'pending_signatures',     // Both agreed, waiting for wallet signatures
        'escrow_deposit',         // Client signing & depositing funds to escrow
        'active',                 // Both signed, funds in escrow, work in progress
        'in_progress',            // Project work ongoing
        'awaiting_final_approval',// All milestones done, awaiting final client approval
        'completed',              // Final delivery approved, ownership transferred
        'cancelled',              // Contract cancelled
        'disputed'                // Dispute raised
      ],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft',
    index: true
  },
  terms: {
    paymentTerms: {
      type: String,
      trim: true
    },
    cancellationPolicy: {
      type: String,
      trim: true
    },
    revisionPolicy: {
      type: String,
      trim: true
    },
    communicationGuidelines: {
      type: String,
      trim: true
    }
  },
  signatures: {
    client: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      walletAddress: String,
      transactionHash: String,
      message: String
    },
    developer: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      walletAddress: String,
      transactionHash: String,
      message: String
    }
  },
  blockchain: {
    isRecorded: {
      type: Boolean,
      default: false
    },
    transactionHash: String,
    blockNumber: Number,
    ipfsHash: String,
    metadataHash: String,
    contractAddress: String,
    recordedAt: Date,
    network: {
      type: String,
      enum: ['mainnet', 'sepolia', 'goerli', 'polygon', 'mumbai', 'local'],
      default: 'sepolia'
    }
  },
  escrow: {
    totalAmount: {
      type: Number,
      default: 0
    },
    heldAmount: {
      type: Number,
      default: 0
    },
    releasedAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'locked', 'releasing', 'completed'],
      default: 'pending'
    },
    depositTxHash: String,
    smartContractAddress: String
  },
  finalDelivery: {
    ipfsHash: String,
    deliveredAt: Date,
    clientApproved: {
      type: Boolean,
      default: false
    },
    approvedAt: Date,
    ownershipTransferTxHash: String,
    finalPaymentTxHash: String
  },
  metadata: {
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
agreementSchema.index({ client: 1, status: 1 });
agreementSchema.index({ developer: 1, status: 1 });
agreementSchema.index({ status: 1, createdAt: -1 });
agreementSchema.index({ 'blockchain.isRecorded': 1 });
agreementSchema.index({ 'metadata.lastActivityAt': -1 });

// Virtual for progress percentage
agreementSchema.virtual('progressPercentage').get(function() {
  if (this.milestoneStats.total === 0) return 0;
  return Math.round((this.milestoneStats.approved / this.milestoneStats.total) * 100);
});

// Virtual for is fully signed
agreementSchema.virtual('isFullySigned').get(function() {
  return this.signatures.client.signed && this.signatures.developer.signed;
});

// Pre-save middleware to generate agreement ID
agreementSchema.pre('save', async function(next) {
  if (this.isNew && !this.agreementId) {
    const count = await this.constructor.countDocuments();
    this.agreementId = `AGR-${Date.now()}-${String(count + 1).padStart(5, '0')}`;
  }
  
  // Update remaining amount
  if (this.isModified('financials.releasedAmount') || this.isModified('financials.totalValue')) {
    this.financials.remainingAmount = this.financials.totalValue - this.financials.releasedAmount;
  }
  
  // Calculate platform fee
  if (this.isModified('financials.totalValue') || this.isModified('financials.platformFee.percentage')) {
    this.financials.platformFee.amount = 
      (this.financials.totalValue * this.financials.platformFee.percentage) / 100;
  }
  
  // Update last activity
  this.metadata.lastActivityAt = new Date();
  
  next();
});

// Method to sign agreement
agreementSchema.methods.signAgreement = async function(userId, walletAddress, userRole) {
  if (userRole === 'client') {
    this.signatures.client.signed = true;
    this.signatures.client.signedAt = new Date();
    this.signatures.client.walletAddress = walletAddress;
  } else if (userRole === 'developer') {
    this.signatures.developer.signed = true;
    this.signatures.developer.signedAt = new Date();
    this.signatures.developer.walletAddress = walletAddress;
  }
  
  // If both signed, activate agreement
  if (this.signatures.client.signed && this.signatures.developer.signed) {
    this.status = 'active';
  }
  
  return this.save();
};

// Method to update milestone stats
agreementSchema.methods.updateMilestoneStats = async function() {
  const Milestone = mongoose.model('Milestone');
  const milestones = await Milestone.find({ agreement: this._id });
  
  this.milestoneStats.total = milestones.length;
  this.milestoneStats.completed = milestones.filter(m => m.status === 'completed').length;
  this.milestoneStats.approved = milestones.filter(m => m.status === 'approved').length;
  this.milestoneStats.pending = milestones.filter(m => m.status === 'pending').length;
  
  // Update agreement status based on milestones
  if (this.milestoneStats.approved === this.milestoneStats.total && this.milestoneStats.total > 0) {
    this.status = 'completed';
    this.project.actualEndDate = new Date();
  }
  
  return this.save({ validateBeforeSave: false });
};

// Method to release payment
agreementSchema.methods.releasePayment = async function(amount) {
  if (amount > this.financials.remainingAmount) {
    throw new Error('Release amount exceeds remaining amount');
  }
  
  this.financials.releasedAmount += amount;
  this.financials.remainingAmount -= amount;
  
  return this.save();
};

// Static method to find agreements by status
agreementSchema.statics.findByStatus = function(status, userId, role) {
  const query = { status };
  if (role === 'client') query.client = userId;
  if (role === 'developer') query.developer = userId;
  
  return this.find(query)
    .populate('client developer gig')
    .populate('milestones')
    .sort({ 'metadata.lastActivityAt': -1 });
};

module.exports = mongoose.model('Agreement', agreementSchema);
