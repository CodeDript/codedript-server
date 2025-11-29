const mongoose = require("mongoose");

const testUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["developer", "client"],
      required: true,
      default: "client",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    profileData: {
      bio: {
        type: String,
        maxlength: 500,
        default: "",
      },
      skills: [
        {
          type: String,
          trim: true,
        },
      ],
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
    },
    metadata: {
      loginCount: {
        type: Number,
        default: 0,
      },
      lastLogin: {
        type: Date,
        default: null,
      },
      ipfsData: {
        type: String,
        default: "",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
testUserSchema.index({ email: 1 });
testUserSchema.index({ walletAddress: 1 });
testUserSchema.index({ status: 1, isActive: 1 });

// Virtual for profile completeness percentage
testUserSchema.virtual("profileCompleteness").get(function () {
  let completeness = 0;
  if (this.username) completeness += 25;
  if (this.email) completeness += 25;
  if (this.profileData.bio) completeness += 25;
  if (this.profileData.skills && this.profileData.skills.length > 0)
    completeness += 25;
  return completeness;
});

// Ensure virtuals are included in JSON
testUserSchema.set("toJSON", { virtuals: true });
testUserSchema.set("toObject", { virtuals: true });

// Pre-save middleware to increment login count
testUserSchema.pre("save", function (next) {
  if (this.isModified("metadata.lastLogin")) {
    this.metadata.loginCount += 1;
  }
  next();
});

const TestUser = mongoose.model("TestUser", testUserSchema);

module.exports = TestUser;
