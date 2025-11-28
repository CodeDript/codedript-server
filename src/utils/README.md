# Utils Module

This directory contains utility functions and helper modules used throughout the CodeDript server application.

## Overview

Utilities provide reusable, generic functionality that doesn't fit into specific business logic. They help keep code DRY (Don't Repeat Yourself) and maintainable.

## Files

### `errorHandler.js`

Centralized error handling utilities:

**Custom Error Classes:**

- `AppError` - Base application error class
- `ValidationError` - Input validation errors (400)
- `AuthenticationError` - Authentication failures (401)
- `AuthorizationError` - Permission denied (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflicts (409)
- `DatabaseError` - Database operation failures (500)

**Helper Functions:**

- `catchAsync(fn)` - Wrapper for async route handlers
- `handleUncaughtException()` - Global uncaught exception handler
- `handleUnhandledRejection()` - Global unhandled promise rejection handler
- `notFound(req, res, next)` - 404 middleware
- `errorHandler(err, req, res, next)` - Global error handling middleware

**Usage:**

```javascript
const { catchAsync, NotFoundError } = require("../utils/errorHandler");

exports.getUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError("User");
  res.json(user);
});
```

### `responseHandler.js`

Standardized API response formatting:

**Functions:**

- `sendSuccess(res, data, message, statusCode)` - Send success response
- `sendError(res, message, statusCode, errors)` - Send error response
- `sendPaginated(res, data, pagination, message)` - Send paginated response

**Response Format:**

```javascript
// Success
{
  success: true,
  message: "Operation successful",
  data: { ... }
}

// Error
{
  success: false,
  error: {
    message: "Error message",
    statusCode: 400
  }
}

// Paginated
{
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    pages: 10
  }
}
```

### `logger.js`

Application logging utility:

**Features:**

- Structured logging with Winston
- Multiple log levels (error, warn, info, debug)
- File and console transports
- Log rotation and archiving
- Request/response logging
- Error stack traces in development

**Usage:**

```javascript
const logger = require("../utils/logger");

logger.info("User created", { userId: user.id });
logger.error("Database error", { error: error.message });
logger.debug("Processing request", { requestId: req.id });
```

### `helpers.js`

General-purpose helper functions:

**Common Helpers:**

- `generateRandomString(length)` - Generate random strings
- `slugify(text)` - Create URL-friendly slugs
- `formatDate(date, format)` - Date formatting
- `calculatePercentage(value, total)` - Percentage calculations
- `retry(fn, maxAttempts, delay)` - Retry failed operations
- `sleep(ms)` - Async delay utility
- `sanitizeObject(obj)` - Remove undefined/null values
- `deepClone(obj)` - Deep object cloning

**Usage:**

```javascript
const { retry, slugify } = require("../utils/helpers");

// Retry failed operation
const result = await retry(() => externalAPI.call(), 3, 1000);

// Create slug
const slug = slugify("My Awesome Gig Title"); // 'my-awesome-gig-title'
```

## Utility Categories

### 1. Error Handling

- Custom error classes
- Error middleware
- Error logging
- Stack trace formatting

### 2. Response Formatting

- Success responses
- Error responses
- Pagination
- Data transformation

### 3. Logging

- Application logs
- Request logs
- Error logs
- Performance logs

### 4. Data Manipulation

- String formatting
- Date/time utilities
- Number formatting
- Object manipulation

### 5. Validation

- Input sanitization
- Data type checking
- Format validation
- Business rule validation

### 6. Async Utilities

- Promise wrappers
- Retry logic
- Rate limiting
- Debouncing/throttling

## Best Practices

1. **Pure Functions** - Keep utilities stateless and pure when possible
2. **Single Responsibility** - Each utility should do one thing well
3. **Documentation** - Document parameters, return values, and examples
4. **Error Handling** - Handle errors gracefully with meaningful messages
5. **Testing** - Write unit tests for all utility functions
6. **Performance** - Optimize frequently used utilities
7. **Reusability** - Make utilities generic and reusable
8. **Type Safety** - Validate input parameters
9. **Naming** - Use clear, descriptive function names
10. **Modularity** - Group related utilities together

## Usage Examples

### Error Handling

```javascript
const { catchAsync, ValidationError } = require("../utils/errorHandler");

exports.createUser = catchAsync(async (req, res) => {
  if (!req.body.email) {
    throw new ValidationError("Email is required");
  }
  // ... rest of logic
});
```

### Response Formatting

```javascript
const { sendSuccess, sendPaginated } = require("../utils/responseHandler");

// Simple success
sendSuccess(res, user, "User created successfully", 201);

// Paginated response
sendPaginated(
  res,
  users,
  {
    page: 1,
    limit: 10,
    total: 100,
  },
  "Users retrieved successfully"
);
```

### Logging

```javascript
const logger = require("../utils/logger");

logger.info("Starting server", { port: 3000 });
logger.warn("Deprecated API used", { endpoint: req.path });
logger.error("Database connection failed", { error: err.message });
```

### Helpers

```javascript
const { retry, slugify, sanitizeObject } = require("../utils/helpers");

// Retry operation
const data = await retry(() => fetchFromAPI(), 3, 2000);

// Create slug
const slug = slugify(title);

// Clean object
const clean = sanitizeObject({ a: 1, b: null, c: undefined }); // { a: 1 }
```

## Testing Utilities

```javascript
// Example utility test
const { slugify } = require("../utils/helpers");

describe("Helpers", () => {
  describe("slugify", () => {
    it("should convert text to slug", () => {
      expect(slugify("Hello World")).toBe("hello-world");
      expect(slugify("Test & Example")).toBe("test-example");
    });
  });
});
```

## Related Modules

- **All Modules** - Utilities are used throughout the application
- **Middlewares** (`../middlewares`) - Use error handling utilities
- **Controllers** (`../controllers`) - Use response formatting and error handling
- **Services** (`../services`) - Use helpers and logging utilities
