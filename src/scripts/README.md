# Scripts Module

This directory contains utility scripts for database management, data migration, seeding, and other administrative tasks.

## Overview

Scripts are standalone Node.js programs that can be run independently from the main application. They are typically used for:

- Database seeding and initialization
- Data migration and transformation
- Batch processing operations
- Database cleanup and maintenance
- Development utilities
- Production deployment tasks

## Common Script Types

### Database Seeding

Scripts to populate the database with initial or test data:

```javascript
// seedUsers.js - Create initial user accounts
// seedGigs.js - Populate sample gigs
// seedAll.js - Run all seed scripts
```

### Data Migration

Scripts to transform or migrate data between schema versions:

```javascript
// migrateAgreements.js - Update agreement schema
// migrateUsers.js - Transform user data structure
```

### Maintenance

Scripts for database cleanup and maintenance:

```javascript
// cleanupExpiredTokens.js - Remove expired tokens
// archiveOldData.js - Archive old records
// rebuildIndexes.js - Rebuild database indexes
```

### Development Utilities

Helper scripts for development:

```javascript
// resetDatabase.js - Reset database to initial state
// generateTestData.js - Create test data
// validateData.js - Check data integrity
```

## Script Structure

A typical script follows this pattern:

```javascript
const mongoose = require("mongoose");
const { connectDB } = require("../config/database");
const logger = require("../utils/logger");

// Import required models
const User = require("../models/User");

async function runScript() {
  try {
    // Connect to database
    await connectDB();
    logger.info("Database connected");

    // Script logic here
    const result = await User.create({
      name: "Admin User",
      email: "admin@codedript.com",
      role: "admin",
    });

    logger.info("Script completed successfully", { result });
  } catch (error) {
    logger.error("Script failed", { error: error.message });
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logger.info("Database connection closed");
    process.exit(0);
  }
}

// Run the script
runScript();
```

## Running Scripts

### From Command Line

```bash
# Run a specific script
node src/scripts/seedUsers.js

# With environment variables
NODE_ENV=development node src/scripts/seedAll.js

# Using npm scripts (if defined in package.json)
npm run seed
npm run migrate
```

### With Arguments

```javascript
// Script with command-line arguments
const args = process.argv.slice(2);
const environment = args[0] || "development";

console.log(`Running in ${environment} mode`);
```

```bash
node src/scripts/script.js production
```

## Best Practices

1. **Database Connection** - Always connect to database at start and close at end
2. **Error Handling** - Wrap script logic in try-catch blocks
3. **Logging** - Use logger utility for consistent logging
4. **Exit Codes** - Use `process.exit(0)` for success, `process.exit(1)` for failure
5. **Idempotency** - Make scripts safe to run multiple times
6. **Confirmation** - Prompt for confirmation on destructive operations
7. **Dry Run** - Support dry-run mode for testing
8. **Documentation** - Document what each script does and how to use it
9. **Environment** - Respect environment variables and configurations
10. **Transactions** - Use database transactions for data integrity

## Example Scripts

### Seed Admin User

```javascript
// seedAdmin.js
const User = require("../models/User");

async function seedAdmin() {
  const adminExists = await User.findOne({ email: "admin@codedript.com" });

  if (adminExists) {
    console.log("Admin user already exists");
    return;
  }

  await User.create({
    name: "Admin",
    email: "admin@codedript.com",
    password: "securePassword123",
    role: "admin",
    isVerified: true,
  });

  console.log("Admin user created successfully");
}
```

### Clean Expired Data

```javascript
// cleanupExpired.js
const Agreement = require("../models/Agreement");

async function cleanupExpired() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await Agreement.deleteMany({
    status: "draft",
    createdAt: { $lt: thirtyDaysAgo },
  });

  console.log(`Deleted ${result.deletedCount} expired draft agreements`);
}
```

## Safety Considerations

⚠️ **Warning**: Scripts can modify or delete data. Always:

- Test scripts in development environment first
- Backup production data before running scripts
- Review script code before execution
- Use confirmation prompts for destructive operations
- Log all operations for audit trail

## Related Modules

- **Models** (`../models`) - Database models used in scripts
- **Config** (`../config`) - Configuration and database connection
- **Utils** (`../utils`) - Utility functions for logging and helpers
