const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: [true, 'Agreement reference is required'],
    index: true
  },
  milestoneNumber: {
    type: Number,
    required: [true, 'Milestone number is required'],
    min: [1, 'Milestone number must be at least 1']
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Milestone description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  deliverables: [{
    type: String,
    trim: true
  }],
  financials: {
    value: {
      type: Number,
      required: [true, 'Milestone value is required'],
      min: [0, 'Value cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETH',
      enum: ['ETH', 'USD']
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: {
      type: Date
    },
    transactionHash: {
      type: String
    }
  },
  timeline: {
    startDate: {
      type: Date
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    completedDate: {
      type: Date
    },
    approvedDate: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: {
      values: [
        'pending',              // Not started
        'in_progress',          // Developer working on it
        'submitted',            // Developer submitted demo for review
        'in_review',            // Client reviewing submission
        'revision_requested',   // Client requested changes
        'completed',            // Developer marked as complete
        'approved',             // Client approved
        'paid',                 // Payment released to developer
        'rejected'              // Client rejected
      ],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
    index: true
  },
  submission: {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    demoFiles: [{
      name: String,
      url: String,
      ipfsHash: String,
      supabaseId: String,
      description: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    files: [{
      name: String,
      url: String,
      supabaseId: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  review: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters']
    },
    revisionNotes: {
      type: String,
      trim: true
    }
  },
  revisions: [{
    revisionNumber: {
      type: Number,
      required: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    submittedAt: {
      type: Date
    },
    files: [{
      name: String,
      url: String,
      supabaseId: String
    }]
  }],
  blockchain: {
    isRecorded: {
      type: Boolean,
      default: false
    },
    completionTxHash: String,    // Transaction when developer marks complete
    approvalTxHash: String,       // Transaction when client approves
    paymentTxHash: String,        // Transaction when payment released
    network: {
      type: String,
      enum: ['mainnet', 'sepolia', 'goerli', 'polygon', 'mumbai', 'local'],
      default: 'sepolia'
    }
  },
  payment: {
    released: {
      type: Boolean,
      default: false
    },
    releasedAt: Date,
    releasedAmount: Number,
    releaseTxHash: String
  },
  metadata: {
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
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

// Compound indexes
milestoneSchema.index({ agreement: 1, milestoneNumber: 1 }, { unique: true });
milestoneSchema.index({ agreement: 1, status: 1 });
milestoneSchema.index({ 'timeline.dueDate': 1 });
milestoneSchema.index({ status: 1, 'timeline.dueDate': 1 });

// Virtual for revision count
milestoneSchema.virtual('revisionCount').get(function() {
  return this.revisions.length;
});

// Virtual for is overdue
milestoneSchema.virtual('isOverdue').get(function() {
  if (this.status === 'approved' || this.status === 'completed') {
    return false;
  }
  return new Date() > this.timeline.dueDate;
});

// Virtual for days remaining
milestoneSchema.virtual('daysRemaining').get(function() {
  if (this.status === 'approved' || this.status === 'completed') {
    return 0;
  }
  const now = new Date();
  const due = this.timeline.dueDate;
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware
milestoneSchema.pre('save', function(next) {
  // Update last activity timestamp
  this.metadata.lastActivityAt = new Date();
  
  // Auto-set completion date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.timeline.completedDate) {
    this.timeline.completedDate = new Date();
  }
  
  // Auto-set approval date when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.timeline.approvedDate) {
    this.timeline.approvedDate = new Date();
  }
  
  next();
});

// Post-save middleware to update agreement milestone stats
milestoneSchema.post('save', async function(doc) {
  const Agreement = mongoose.model('Agreement');
  const agreement = await Agreement.findById(doc.agreement);
  if (agreement) {
    await agreement.updateMilestoneStats();
  }
});

// Method to submit milestone
milestoneSchema.methods.submit = async function(userId, notes, files = []) {
  this.status = 'submitted';
  this.submission.submittedBy = userId;
  this.submission.submittedAt = new Date();
  this.submission.notes = notes;
  this.submission.files = files;
  
  return this.save();
};

// Method to approve milestone
milestoneSchema.methods.approve = async function(userId, rating, feedback) {
  this.status = 'approved';
  this.review.reviewedBy = userId;
  this.review.reviewedAt = new Date();
  this.review.rating = rating;
  this.review.feedback = feedback;
  this.timeline.approvedDate = new Date();
  
  return this.save();
};

// Method to request revision
milestoneSchema.methods.requestRevision = async function(userId, reason) {
  this.status = 'revision_requested';
  
  const revisionNumber = this.revisions.length + 1;
  this.revisions.push({
    revisionNumber,
    requestedBy: userId,
    requestedAt: new Date(),
    reason
  });
  
  return this.save();
};

// Method to mark as in progress
milestoneSchema.methods.startProgress = async function() {
  this.status = 'in_progress';
  if (!this.timeline.startDate) {
    this.timeline.startDate = new Date();
  }
  return this.save();
};

// Static method to find overdue milestones
milestoneSchema.statics.findOverdue = function() {
  return this.find({
    'timeline.dueDate': { $lt: new Date() },
    status: { $nin: ['completed', 'approved'] },
    'metadata.isActive': true
  }).populate('agreement');
};

// Static method to find milestones by agreement
milestoneSchema.statics.findByAgreement = function(agreementId) {
  return this.find({ agreement: agreementId })
    .sort({ milestoneNumber: 1 })
    .populate('submission.submittedBy review.reviewedBy', 'profile.name email');
};

module.exports = mongoose.model('Milestone', milestoneSchema);
