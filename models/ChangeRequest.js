const mongoose = require('mongoose');

const changeRequestSchema = new mongoose.Schema({
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: [true, 'Agreement reference is required'],
    index: true
  },
  requestId: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  createdBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['client', 'developer'],
      required: true
    }
  },
  attachedFiles: [{
    name: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    ipfsHash: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'approved', 'rejected', 'ignored'],
    default: 'pending',
    index: true
  },
  // Developer confirmation details
  confirmation: {
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    confirmedAt: {
      type: Date
    },
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'ETH'
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters']
    }
  },
  // Client approval/rejection
  clientResponse: {
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date
    },
    approved: {
      type: Boolean
    },
    reason: {
      type: String,
      trim: true
    }
  },
  // Blockchain transaction if approved
  blockchain: {
    transactionHash: String,
    recordedAt: Date
  },
  metadata: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
changeRequestSchema.index({ agreement: 1, status: 1 });
changeRequestSchema.index({ 'createdBy.user': 1 });
changeRequestSchema.index({ createdAt: -1 });

// Auto-generate requestId
changeRequestSchema.pre('save', async function(next) {
  if (this.isNew && !this.requestId) {
    const count = await this.constructor.countDocuments();
    this.requestId = `REQ${String(count + 1).padStart(3, '0')}`;
  }
  
  this.metadata.lastActivityAt = new Date();
  next();
});

// Static method to find by agreement
changeRequestSchema.statics.findByAgreement = function(agreementId, status = null) {
  const query = { agreement: agreementId, 'metadata.isActive': true };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('createdBy.user', 'profile email walletAddress')
    .populate('confirmation.confirmedBy', 'profile email walletAddress')
    .populate('clientResponse.respondedBy', 'profile email walletAddress')
    .sort({ createdAt: -1 });
};

// Instance method to confirm request (developer)
changeRequestSchema.methods.confirmRequest = async function(developerId, amount, currency, details) {
  if (this.status !== 'pending') {
    throw new Error('Only pending requests can be confirmed');
  }
  
  this.status = 'confirmed';
  this.confirmation = {
    confirmedBy: developerId,
    confirmedAt: new Date(),
    amount,
    currency,
    details
  };
  
  return await this.save();
};

// Instance method to approve request (client)
changeRequestSchema.methods.approveRequest = async function(clientId, reason = '') {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed requests can be approved');
  }
  
  this.status = 'approved';
  this.clientResponse = {
    respondedBy: clientId,
    respondedAt: new Date(),
    approved: true,
    reason
  };
  
  return await this.save();
};

// Instance method to reject request (client)
changeRequestSchema.methods.rejectRequest = async function(clientId, reason = '') {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed requests can be rejected');
  }
  
  this.status = 'rejected';
  this.clientResponse = {
    respondedBy: clientId,
    respondedAt: new Date(),
    approved: false,
    reason
  };
  
  return await this.save();
};

// Instance method to ignore request (developer)
changeRequestSchema.methods.ignoreRequest = async function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending requests can be ignored');
  }
  
  this.status = 'ignored';
  this.metadata.isActive = false;
  
  return await this.save();
};

module.exports = mongoose.model('ChangeRequest', changeRequestSchema);
