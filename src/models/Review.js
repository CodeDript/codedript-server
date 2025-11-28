const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdOn: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate reviews
reviewSchema.index({ gig: 1, reviewer: 1 }, { unique: true });

// Indexes for better query performance
reviewSchema.index({ reviewee: 1, rating: -1 });
reviewSchema.index({ createdOn: -1 });

// Validation to ensure reviewer and reviewee are different
reviewSchema.pre("save", function (next) {
  if (this.reviewer.equals(this.reviewee)) {
    next(new Error("Reviewer and reviewee cannot be the same user"));
  } else {
    next();
  }
});

// Static method to calculate average rating for a gig
reviewSchema.statics.getAverageRating = async function (gigId) {
  const result = await this.aggregate([
    { $match: { gig: gigId } },
    {
      $group: {
        _id: "$gig",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { averageRating: 0, totalReviews: 0 };
};

// Static method to calculate average rating for a user (reviewee)
reviewSchema.statics.getUserAverageRating = async function (userId) {
  const result = await this.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: "$reviewee",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { averageRating: 0, totalReviews: 0 };
};

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
