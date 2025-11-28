# Routes Module

This directory contains all API route definitions for the CodeDript server application.

## Overview

Routes define the API endpoints and map HTTP requests to controller functions. They also apply middleware for authentication, validation, and other request processing.

## Structure

Routes are organized by resource/feature:

```
routes/
├── index.js              # Main router that combines all routes
├── authRoutes.js         # Authentication endpoints
├── userRoutes.js         # User management endpoints
├── gigRoutes.js          # Gig/project listing endpoints
├── agreementRoutes.js    # Agreement/contract endpoints
├── reviewRoutes.js       # Review and rating endpoints
├── transactionRoutes.js  # Payment and transaction endpoints
└── ...
```

## Route Pattern

Each route file typically follows this structure:

```javascript
const express = require("express");
const router = express.Router();
const controller = require("../controllers/resourceController");
const { protect, restrictTo } = require("../middlewares/auth");
const { validate } = require("../middlewares/validation");

// Public routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Protected routes (authentication required)
router.use(protect); // All routes below require authentication

router.post("/", validate(createSchema), controller.create);
router.put("/:id", validate(updateSchema), controller.update);
router.delete("/:id", controller.delete);

// Admin-only routes
router.delete("/:id/force", restrictTo("admin"), controller.forceDelete);

module.exports = router;
```

## Common Route Patterns

### RESTful API Endpoints

| Method | Endpoint            | Description         | Auth Required |
| ------ | ------------------- | ------------------- | ------------- |
| GET    | `/api/resource`     | Get all resources   | Optional      |
| GET    | `/api/resource/:id` | Get single resource | Optional      |
| POST   | `/api/resource`     | Create new resource | Yes           |
| PUT    | `/api/resource/:id` | Update resource     | Yes           |
| PATCH  | `/api/resource/:id` | Partial update      | Yes           |
| DELETE | `/api/resource/:id` | Delete resource     | Yes           |

### Authentication Routes

```javascript
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login user
POST   /api/auth/logout        # Logout user
POST   /api/auth/refresh       # Refresh access token
POST   /api/auth/forgot-password  # Request password reset
POST   /api/auth/reset-password   # Reset password
GET    /api/auth/verify-email     # Verify email address
```

### Nested Routes

```javascript
// Agreement milestones
GET    /api/agreements/:agreementId/milestones
POST   /api/agreements/:agreementId/milestones
PUT    /api/agreements/:agreementId/milestones/:milestoneId
DELETE /api/agreements/:agreementId/milestones/:milestoneId

// User reviews
GET    /api/users/:userId/reviews
POST   /api/users/:userId/reviews
```

## Middleware Application

### Route-Level Middleware

```javascript
// Apply to specific route
router.get("/profile", protect, getProfile);
```

### Router-Level Middleware

```javascript
// Apply to all routes below
router.use(protect);
router.get("/profile", getProfile); // Protected
router.get("/settings", getSettings); // Protected
```

### Multiple Middleware

```javascript
router.post(
  "/create",
  protect, // 1. Check authentication
  restrictTo("admin"), // 2. Check authorization
  validate(createSchema), // 3. Validate input
  controller.create // 4. Execute controller
);
```

## API Versioning

Routes can be versioned for backward compatibility:

```javascript
// v1 routes
app.use("/api/v1", require("./routes/v1"));

// v2 routes
app.use("/api/v2", require("./routes/v2"));
```

## Best Practices

1. **RESTful conventions** - Follow REST principles for endpoint design
2. **Consistent naming** - Use plural nouns for resources (`/users`, not `/user`)
3. **Middleware order** - Apply middleware in logical order (auth → validation → controller)
4. **Route grouping** - Group related routes together
5. **Documentation** - Document all endpoints with comments or API docs
6. **Validation** - Always validate input before processing
7. **Error handling** - Let errors bubble up to global error handler
8. **Rate limiting** - Apply rate limiting to prevent abuse

## Example Route File

```javascript
const express = require("express");
const router = express.Router();
const gigController = require("../controllers/gigController");
const { protect, restrictTo } = require("../middlewares/auth");
const { validate } = require("../middlewares/validation");
const { gigSchema } = require("../validators/gigValidator");

// Public routes
router.get("/", gigController.getAllGigs);
router.get("/:id", gigController.getGigById);
router.get("/category/:category", gigController.getGigsByCategory);

// Protected routes (developer only)
router.use(protect);
router.post(
  "/",
  restrictTo("developer"),
  validate(gigSchema),
  gigController.createGig
);
router.put("/:id", restrictTo("developer"), gigController.updateGig);
router.delete("/:id", restrictTo("developer"), gigController.deleteGig);

module.exports = router;
```

## Related Modules

- **Controllers** (`../controllers`) - Handle the business logic for each route
- **Middlewares** (`../middlewares`) - Process requests before controllers
- **Validators** - Define validation schemas for request data
