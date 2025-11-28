# Configuration Module

This directory contains all configuration-related files for the CodeDript server application.

## Files

### `constants.js`

Centralized application constants and configuration values including:

- **HTTP Status Codes**: Standard HTTP response codes
- **Error Messages**: Predefined error messages for consistency
- **Success Messages**: Standard success response messages
- **Pagination Defaults**: Default page size and limits
- **File Upload**: File size limits and allowed MIME types
- **User Roles**: Application user role definitions (admin, user, developer, client)
- **Agreement Status**: Status values for agreements (draft, pending, active, completed, etc.)
- **Transaction Types & Status**: Transaction-related enumerations
- **Milestone Status**: Milestone workflow states
- **Rate Limiting**: API rate limit configuration
- **JWT Configuration**: JWT token settings
- **Database Configuration**: MongoDB connection pool settings
- **CORS Configuration**: Cross-origin resource sharing settings

### `database.js`

Database connection and management:

- MongoDB connection initialization
- Connection pooling configuration
- Database health checks
- Connection error handling
- Graceful shutdown procedures

### `environment.js`

Environment variable management:

- Centralized environment variable access
- Configuration validation
- Environment-specific settings
- Default value fallbacks

### `supabase.js`

Supabase integration configuration:

- Supabase client initialization
- Authentication setup
- Storage bucket configuration
- Real-time subscription settings

## Usage

```javascript
// Import constants
const {
  HTTP_STATUS,
  USER_ROLES,
  AGREEMENT_STATUS,
} = require("./config/constants");

// Get environment configuration
const { getConfig } = require("./config/environment");

// Access database connection
const { connectDB } = require("./config/database");
```

## Best Practices

1. **Never hardcode values** - Always use constants from this module
2. **Environment variables** - Store sensitive data in `.env` file
3. **Validation** - Validate all configuration on application startup
4. **Documentation** - Keep this README updated when adding new configuration
