const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["client", "developer"],
      required: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    firstLogin: {
      type: Boolean,
      default: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    OTP: {
      code: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },
    avatar: {
      type: String,
      default: "",
    },
    statistics: {
      totalGigs: {
        type: Number,
        default: 0,
        min: 0,
      },
      completedAgreements: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalSpent: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full statistics
userSchema.virtual("profileCompleteness").get(function () {
  let completeness = 0;
  if (this.fullname) completeness += 20;
  if (this.email) completeness += 20;
  if (this.bio) completeness += 20;
  if (this.avatar) completeness += 20;
  if (this.skills && this.skills.length > 0) completeness += 20;
  return completeness;
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);

module.exports = User;
