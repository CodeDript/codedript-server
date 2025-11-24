const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewId: {
    type: String,
    // not required here; we generate a default id for new reviews
    default: function() {
      // REV-YYYYMMDDHHMMSS-XXXX (timestamp + random)
      const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14);
      const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
      return `REV-${ts}-${rnd}`;
    }
  },
  agreement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: true,
    index: true
  },
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    index: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  categories: {
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    timeline: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  helpful: {
    count: {
      type: Number,
      default: 0
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  response: {
    text: String,
    respondedAt: Date
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
// Ensure reviewId uniqueness but avoid duplicate-key on null/missing values
reviewSchema.index(
  { reviewId: 1 },
  { unique: true, partialFilterExpression: { reviewId: { $exists: true } } }
);

// Ensure uniqueness for (agreement, reviewer) only when agreement exists
reviewSchema.index(
  { agreement: 1, reviewer: 1 },
  { unique: true, partialFilterExpression: { agreement: { $exists: true, $ne: null } } }
);
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ gig: 1, createdAt: -1 });
reviewSchema.index({ createdAt: -1 });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
});

// Method to mark review as helpful
reviewSchema.methods.markHelpful = async function(userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count = this.helpful.users.length;
    await this.save();
  }
  return this;
};

// Static method to get average rating for a user
reviewSchema.statics.getAverageRating = async function(userId) {
  const result = await this.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
        avgCommunication: { $avg: '$categories.communication' },
        avgQuality: { $avg: '$categories.quality' },
        avgTimeline: { $avg: '$categories.timeline' },
        avgProfessionalism: { $avg: '$categories.professionalism' }
      }
    }
  ]);

  return result.length > 0 ? result[0] : { avgRating: 0, count: 0 };
};

// Update reviewee's reputation when review is created/updated
reviewSchema.post('save', async function() {
  const User = mongoose.model('User');
  const stats = await this.constructor.getAverageRating(this.reviewee);
  
  await User.findByIdAndUpdate(this.reviewee, {
    'reputation.rating': Math.round(stats.avgRating * 10) / 10,
    'reputation.reviewCount': stats.count
  });
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
