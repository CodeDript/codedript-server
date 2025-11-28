# Middlewares Module

This directory contains Express middleware functions that process requests before they reach controllers.

## Overview

Middlewares are functions that have access to the request object (`req`), response object (`res`), and the next middleware function in the application's request-response cycle.

## Files

### `auth.js`

Authentication and authorization middleware:

- **`generateToken(payload, expiresIn)`** - Create JWT access tokens
- **`generateRefreshToken(payload)`** - Create JWT refresh tokens
- **`verifyToken(token)`** - Verify and decode JWT tokens
- **`protect`** - Middleware to require authentication for routes
- **`restrictTo(...roles)`** - Middleware to restrict access by user role
- **`optionalAuth`** - Middleware for optional authentication (attach user if token exists)

**Usage:**

```javascript
// Protect a route (requires authentication)
router.get("/profile", protect, getUserProfile);

// Restrict to specific roles
router.delete("/user/:id", protect, restrictTo("admin"), deleteUser);

// Optional authentication
router.get("/gigs", optionalAuth, getAllGigs);
```

### `validation.js`

Request validation middleware:

- Input validation using validation schemas
- Request body, params, and query validation
- Sanitization of user input
- Custom validation rules

**Usage:**

```javascript
router.post("/register", validate(registerSchema), register);
```

## Middleware Execution Flow

```
Request → Middleware 1 → Middleware 2 → ... → Controller → Response
           ↓ next()       ↓ next()              ↓
           Error Handler ←←←←←←←←←←←←←←←←←←←←←←←←
```

## Common Middleware Patterns

### 1. Authentication Check

```javascript
const protect = async (req, res, next) => {
  // Extract token
  // Verify token
  // Attach user to req.user
  next();
};
```

### 2. Validation

```javascript
const validate = (schema) => {
  return (req, res, next) => {
    // Validate request against schema
    // If valid: next()
    // If invalid: throw ValidationError
  };
};
```

### 3. Authorization

```javascript
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if req.user.role is in allowed roles
    // If yes: next()
    // If no: throw AuthorizationError
  };
};
```

## Best Practices

1. **Call next()** - Always call `next()` to pass control to the next middleware
2. **Error handling** - Pass errors to `next(error)` for centralized error handling
3. **Order matters** - Middleware executes in the order it's defined
4. **Keep it focused** - Each middleware should have a single responsibility
5. **Reusability** - Write generic, reusable middleware when possible
6. **Documentation** - Document middleware parameters and behavior

## Global Middlewares

Some middlewares are applied globally in the main application file:

- Body parser (express.json())
- CORS
- Rate limiting
- Request logging
- Error handling

## Related Modules

- **Controllers** (`../controllers`) - Receive requests after middleware processing
- **Utils/errorHandler** (`../utils/errorHandler`) - Custom error classes and handlers
- **Config/constants** (`../config/constants`) - Configuration values used in middleware
