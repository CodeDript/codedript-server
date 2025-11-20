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
      supabaseId: {
        type: String
      },
      uploadedAt: {
        type: Date
      }
    },
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
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
        'draft',
        'pending_acceptance',
        'active',
        'in_progress',
        'awaiting_approval',
        'completed',
        'cancelled',
        'disputed'
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
      walletAddress: String
    },
    developer: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      walletAddress: String
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
    contractAddress: String,
    recordedAt: Date
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
