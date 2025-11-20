const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Developer reference is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Gig title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Gig description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: [
        'web-development',
        'mobile-development',
        'blockchain-development',
        'ai-ml',
        'data-science',
        'devops',
        'ui-ux-design',
        'smart-contracts',
        'backend',
        'frontend',
        'full-stack',
        'other'
      ],
      message: '{VALUE} is not a valid category'
    }
  },
  subcategory: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    required: true,
    trim: true
  }],
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly'],
      default: 'fixed'
    },
    amount: {
      type: Number,
      required: [true, 'Pricing amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETH',
      enum: ['ETH', 'USD']
    }
  },
  deliveryTime: {
    type: Number,
    required: [true, 'Delivery time is required'],
    min: [1, 'Delivery time must be at least 1 day'],
    max: [365, 'Delivery time cannot exceed 365 days']
  },
  revisions: {
    type: Number,
    default: 2,
    min: [0, 'Revisions cannot be negative']
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: String
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'paused', 'inactive'],
      message: '{VALUE} is not a valid status'
    },
    default: 'draft'
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    inquiries: {
      type: Number,
      default: 0
    },
    ordersInProgress: {
      type: Number,
      default: 0
    },
    ordersCompleted: {
      type: Number,
      default: 0
    }
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
gigSchema.index({ developer: 1, status: 1 });
gigSchema.index({ category: 1, status: 1 });
gigSchema.index({ skills: 1, status: 1 });
gigSchema.index({ 'pricing.amount': 1 });
gigSchema.index({ 'rating.average': -1 });
gigSchema.index({ createdAt: -1 });
gigSchema.index({ tags: 1 });

// Text index for search functionality
gigSchema.index({ 
  title: 'text', 
  description: 'text', 
  skills: 'text',
  tags: 'text'
});

// Virtual for agreements created from this gig
gigSchema.virtual('agreements', {
  ref: 'Agreement',
  localField: '_id',
  foreignField: 'gig'
});

// Pre-save middleware
gigSchema.pre('save', function(next) {
  // Ensure skills array has unique values
  if (this.isModified('skills')) {
    this.skills = [...new Set(this.skills)];
  }
  
  // Ensure tags are unique and lowercase
  if (this.isModified('tags')) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase()))];
  }
  
  next();
});

// Method to increment view count
gigSchema.methods.incrementViews = async function() {
  this.statistics.views += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to increment inquiries
gigSchema.methods.incrementInquiries = async function() {
  this.statistics.inquiries += 1;
  return this.save({ validateBeforeSave: false });
};

// Method to update statistics
gigSchema.methods.updateStats = async function(field, value = 1) {
  if (this.statistics[field] !== undefined) {
    this.statistics[field] += value;
    return this.save({ validateBeforeSave: false });
  }
  throw new Error(`Invalid statistics field: ${field}`);
};

// Static method to find active gigs by category
gigSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category, 
    status: 'active',
    isActive: true 
  }).populate('developer', 'profile email reputation');
};

// Static method to search gigs
gigSchema.statics.searchGigs = function(searchTerm, filters = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'active',
    isActive: true,
    ...filters
  };
  
  return this.find(query)
    .sort({ score: { $meta: 'textScore' } })
    .populate('developer', 'profile email reputation');
};

module.exports = mongoose.model('Gig', gigSchema);
