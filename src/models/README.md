# CodeDript Models Documentation

This directory contains all Mongoose models for the CodeDript agreement manager system.

## Models Overview

### 1. User Model (`User.js`)

Manages user accounts for both clients and developers with Web3 wallet integration.

**Key Features:**

- Wallet address authentication (MetaMask)
- Email-based login with OTP verification
- Role-based access (client/developer)
- User statistics tracking (gigs, earnings, spending)
- Profile completeness virtual field

**Fields:**

- `walletAddress` - Ethereum wallet address (unique, indexed)
- `email` - User email (unique, validated)
- `fullname` - User's full name
- `role` - Either 'client' or 'developer'
- `bio` - User biography (max 500 chars)
- `firstLogin` - Boolean flag for first-time users
- `skills` - Array of skill strings
- `OTP` - Object containing OTP code and expiration
- `avatar` - Profile picture URL
- `statistics` - Object with totalGigs, completedAgreements, totalEarned, totalSpent
- `isActive` - Account status
- `lastLogin` - Last login timestamp

---

### 2. Gig Model (`Gig.js`)

Represents services offered by developers.

**Key Features:**

- Auto-incrementing gigID (001, 002, etc.)
- Multiple package tiers (basic, standard, premium)
- Portfolio showcase with completed projects
- Price range virtual field

**Fields:**

- `developer` - Reference to User model
- `title` - Gig title (max 100 chars)
- `description` - Detailed description (max 2000 chars)
- `gigID` - Auto-generated unique ID (e.g., "001")
- `images` - Array of image URLs
- `completedProjects` - Array of portfolio links
- `packages` - Array of package objects (1-3 packages)
  - `name` - 'basic', 'standard', or 'premium'
  - `price` - Package price
  - `deliveryTime` - Delivery time in days
  - `features` - Array of feature strings
  - `description` - Package description
- `isActive` - Gig visibility status

---

### 3. Review Model (`Review.js`)

Manages reviews and ratings for gigs and users.

**Key Features:**

- 1-5 star rating system
- Prevents duplicate reviews (one review per gig per user)
- Helper methods for calculating average ratings
- Validation to prevent self-reviews

**Fields:**

- `gig` - Reference to Gig model
- `reviewer` - Reference to User who wrote the review
- `reviewee` - Reference to User being reviewed
- `rating` - Number between 1-5
- `comment` - Review text (max 1000 chars)
- `createdOn` - Review creation date

**Static Methods:**

- `getAverageRating(gigId)` - Calculate average rating for a gig
- `getUserAverageRating(userId)` - Calculate average rating for a user

---

### 4. Agreement Model (`Agreement.js`)

Core model for managing contracts between clients and developers.

**Key Features:**

- Auto-incrementing agreementID
- Milestone-based project tracking
- Blockchain integration (Ethereum/Polygon)
- IPFS document storage
- Digital signatures from both parties
- Change request management
- Financial tracking with escrow support

**Fields:**

- `agreementID` - Auto-generated unique ID (e.g., "001")
- `client` - Reference to client User
- `clientInfo` - Snapshot of client info (name, email, walletAddress)
- `developer` - Reference to developer User
- `gig` - Reference to associated Gig
- `title` - Agreement title
- `description` - Project description
- `status` - Current status (pending, active, in-progress, completed, etc.)
- `deliverables` - Array of final deliverable files
- `startDate` - Project start date
- `endDate` - Project end date
- `financials` - Object containing:
  - `totalValue` - Total project cost
  - `releasedAmount` - Amount released to developer
  - `remainingAmount` - Amount still in escrow
  - `currency` - Payment currency (default: ETH)
- `documents` - Array of IPFS documents
- `milestones` - Array of milestone objects:
  - `name` - Milestone name
  - `description` - Milestone description
  - `price` - Milestone payment amount
  - `status` - pending, inProgress, completed, approved
  - `previews` - Array of preview files with IPFS hashes
  - `completedAt` - Completion timestamp
  - `approvedAt` - Approval timestamp
- `signatures` - Object containing signature data for both parties
- `blockchain` - Object containing:
  - `contractAddress` - Smart contract address
  - `transactionHash` - Transaction hash
  - `blockNumber` - Block number
  - `network` - Blockchain network (ethereum, polygon, etc.)
- `changeRequests` - Array of change request objects

**Virtual Fields:**

- `progressPercentage` - Calculated project completion percentage
- `isFullySigned` - Boolean indicating if both parties signed
- `totalMilestoneValue` - Sum of all milestone prices

**Static Methods:**

- `getByStatus(status, userId)` - Get agreements by status, optionally filtered by user

---

## Usage Example

```javascript
// Import models
const { User, Gig, Review, Agreement } = require("./models");

// Create a new user
const user = await User.create({
  walletAddress: "0x1234...",
  email: "developer@example.com",
  fullname: "John Doe",
  role: "developer",
});

// Create a gig
const gig = await Gig.create({
  developer: user._id,
  title: "Full Stack Web Development",
  description: "I will build your web application",
  packages: [
    {
      name: "basic",
      price: 500,
      deliveryTime: 7,
      features: ["Responsive Design", "5 Pages"],
      description: "Basic package",
    },
  ],
});

// Create an agreement
const agreement = await Agreement.create({
  client: clientUser._id,
  clientInfo: {
    name: clientUser.fullname,
    email: clientUser.email,
    walletAddress: clientUser.walletAddress,
  },
  developer: user._id,
  gig: gig._id,
  title: "E-commerce Website",
  description: "Build a complete e-commerce platform",
  financials: {
    totalValue: 1500,
  },
});
```

## Indexes

All models include optimized indexes for:

- Unique constraints (walletAddress, email, gigID, agreementID)
- Query performance (role, status, dates)
- Relationship lookups (foreign keys)

## Timestamps

All models automatically include `createdAt` and `updatedAt` timestamps via Mongoose timestamps option.
