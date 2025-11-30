const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema(
  {
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    gigID: {
      type: String,
      unique: true,
      match: /^\d{3,}$/,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],

    packages: {
      type: [
        {
          name: {
            type: String,
            enum: ["basic", "standard", "premium"],
            required: true,
          },
          price: {
            type: Number,
            required: true,
            min: 0,
          },
          deliveryTime: {
            type: Number,
            required: true,
            min: 1,
          },
          features: [
            {
              type: String,
              trim: true,
            },
          ],
          description: {
            type: String,
            required: true,
            trim: true,
          },
        },
      ],
      validate: {
        validator: function (packages) {
          return packages.length > 0 && packages.length <= 3;
        },
        message: "A gig must have at least 1 and at most 3 packages",
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
gigSchema.index({ developer: 1, isActive: 1 });
gigSchema.index({ gigID: 1 });
gigSchema.index({ createdAt: -1 });

// Pre-save middleware to generate gigID
gigSchema.pre("save", async function (next) {
  if (!this.gigID) {
    try {
      const lastGig = await this.constructor.findOne(
        {},
        {},
        { sort: { gigID: -1 } }
      );
      if (lastGig && lastGig.gigID) {
        const lastNumber = parseInt(lastGig.gigID);
        this.gigID = String(lastNumber + 1).padStart(3, "0");
      } else {
        this.gigID = "001";
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Virtual for package count
gigSchema.virtual("packageCount").get(function () {
  return this.packages ? this.packages.length : 0;
});

// Virtual for price range
gigSchema.virtual("priceRange").get(function () {
  if (!this.packages || this.packages.length === 0) return { min: 0, max: 0 };
  const prices = this.packages.map((pkg) => pkg.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
});

// Ensure virtuals are included in JSON
gigSchema.set("toJSON", { virtuals: true });
gigSchema.set("toObject", { virtuals: true });

const Gig = mongoose.model("Gig", gigSchema);

module.exports = Gig;
