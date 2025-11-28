# Models Module

This directory contains Mongoose schemas and models that define the data structure and business logic for the CodeDript application.

## Overview

Models represent the data layer of the application and are responsible for:

- Defining database schemas
- Data validation
- Business logic related to data
- Database operations (CRUD)
- Virtual properties and methods
- Pre/post hooks for lifecycle events

## Core Models

### `User.js`

User account management:

- User profile information
- Authentication credentials
- Role-based access control (admin, developer, client)
- Profile settings and preferences
- Account status and verification

### `Gig.js`

Project/service listings:

- Gig details and descriptions
- Pricing and delivery time
- Categories and tags
- Developer portfolio items
- Status tracking

### `Agreement.js`

Contract and agreement management:

- Agreement terms and conditions
- Milestone definitions
- Payment schedules
- Status workflow (draft, pending, active, completed, cancelled)
- Party signatures and acceptance
- Dispute handling

### `Review.js`

Rating and review system:

- User reviews and ratings
- Review content and timestamps
- Rating calculations
- Review moderation

### Additional Models

- **Transaction** - Payment and escrow transactions
- **Milestone** - Agreement milestone tracking
- **Message** - Communication between users
- **Notification** - User notifications
- **Dispute** - Dispute resolution

## Schema Pattern

```javascript
const mongoose = require("mongoose");

const exampleSchema = new mongoose.Schema(
  {
    // Field definitions
    fieldName: {
      type: String,
      required: [true, "Error message"],
      unique: true,
      trim: true,
      maxlength: [100, "Max length error"],
      validate: {
        validator: function (v) {
          /* validation logic */
        },
        message: "Validation error message",
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
exampleSchema.index({ fieldName: 1 });

// Virtual properties
exampleSchema.virtual("virtualField").get(function () {
  return this.field1 + this.field2;
});

// Instance methods
exampleSchema.methods.instanceMethod = function () {
  // Method logic
};

// Static methods
exampleSchema.statics.staticMethod = function () {
  // Static method logic
};

// Middleware hooks
exampleSchema.pre("save", function (next) {
  // Pre-save logic
  next();
});

module.exports = mongoose.model("Example", exampleSchema);
```

## Common Schema Features

### 1. Timestamps

```javascript
{
  timestamps: true;
} // Automatically adds createdAt and updatedAt
```

### 2. References

```javascript
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
}
```

### 3. Enums

```javascript
status: {
  type: String,
  enum: ['pending', 'active', 'completed'],
  default: 'pending'
}
```

### 4. Subdocuments

```javascript
milestones: [
  {
    title: String,
    amount: Number,
    dueDate: Date,
  },
];
```

## Best Practices

1. **Validation** - Define validation rules at the schema level
2. **Indexes** - Add indexes for frequently queried fields
3. **Virtuals** - Use virtual properties for computed fields
4. **Methods** - Put business logic in instance/static methods
5. **Hooks** - Use pre/post hooks for lifecycle events
6. **References** - Use references for relationships between models
7. **Lean queries** - Use `.lean()` for read-only operations (better performance)
8. **Select fields** - Only select needed fields to reduce data transfer

## Usage Example

```javascript
const User = require("../models/User");

// Create
const user = await User.create({
  name: "John Doe",
  email: "john@example.com",
  role: "developer",
});

// Read
const users = await User.find({ role: "developer" })
  .select("name email")
  .limit(10)
  .sort("-createdAt");

// Update
await User.findByIdAndUpdate(userId, { name: "Jane Doe" }, { new: true });

// Delete
await User.findByIdAndDelete(userId);
```

## Related Modules

- **Controllers** (`../controllers`) - Use models to perform database operations
- **Services** (`../services`) - Business logic layer that uses models
- **Config/database** (`../config/database`) - Database connection setup
