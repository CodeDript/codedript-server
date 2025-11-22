const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined for unique index
    lowercase: true,
    trim: true,
    match: [/^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  walletAddress: {
    type: String,
    required: [true, 'Wallet address is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^0[xX][a-fA-F0-9]{40}$/, 'Please enter a valid Ethereum wallet address']
  },
  role: {
    type: String,
    enum: {
      values: ['client', 'developer',],
      message: '{VALUE} is not a valid role'
    },
  },
  profile: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    skills: [{
      type: String,
      trim: true
    }],
    portfolio: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL']
    },
    avatar: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative']
    }
  },
  reputation: {
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  statistics: {
    gigsPosted: {
      type: Number,
      default: 0
    },
    agreementsCreated: {
      type: Number,
      default: 0
    },
    agreementsCompleted: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  firstLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'profile.skills': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full gigs
userSchema.virtual('gigs', {
  ref: 'Gig',
  localField: '_id',
  foreignField: 'developer'
});

// Virtual for agreements as client
userSchema.virtual('clientAgreements', {
  ref: 'Agreement',
  localField: '_id',
  foreignField: 'client'
});

// Virtual for agreements as developer
userSchema.virtual('developerAgreements', {
  ref: 'Agreement',
  localField: '_id',
  foreignField: 'developer'
});

// Pre-save middleware to hash password and update timestamps
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Method to update last login
userSchema.methods.updateLastLogin = async function() {
  const now = new Date();
  if (!this.firstLogin) {
    this.firstLogin = now;
  }
  this.lastLogin = now;
  this.loginCount = (this.loginCount || 0) + 1;
  return this.save({ validateBeforeSave: false });
};

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment statistics
userSchema.methods.incrementStats = async function(field, value = 1) {
  if (this.statistics[field] !== undefined) {
    this.statistics[field] += value;
    return this.save({ validateBeforeSave: false });
  }
  throw new Error(`Invalid statistics field: ${field}`);
};

// Static method to find by wallet address
userSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toUpperCase() });
};

// Static method to find developers with skills
userSchema.statics.findDevelopersBySkills = function(skills) {
  return this.find({
    role: { $in: ['developer', 'both'] },
    'profile.skills': { $in: skills },
    isActive: true
  });
};

module.exports = mongoose.model('User', userSchema);
