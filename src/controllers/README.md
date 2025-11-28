# Controllers Module

This directory contains all controller files that handle HTTP request/response logic for the CodeDript server application.

## Overview

Controllers are responsible for:

- Receiving HTTP requests from routes
- Validating request data
- Calling appropriate service/model methods
- Formatting and sending responses
- Error handling and logging

## Structure

Controllers follow a RESTful pattern and are organized by resource:

```
controllers/
├── authController.js       # Authentication & authorization
├── userController.js       # User management
├── gigController.js        # Gig/project listings
├── agreementController.js  # Agreement/contract management
├── reviewController.js     # Review and rating system
├── transactionController.js # Payment and transaction handling
└── ...
```

## Controller Pattern

Each controller typically exports methods for standard CRUD operations:

```javascript
// Example controller structure
module.exports = {
  create,      // POST   - Create new resource
  getAll,      // GET    - Retrieve all resources (with pagination)
  getById,     // GET    - Retrieve single resource by ID
  update,      // PUT    - Update existing resource
  delete,      // DELETE - Remove resource
  // ... additional custom methods
};
```

## Best Practices

1. **Keep controllers thin** - Business logic should be in services/models
2. **Use async/await** - Wrap async functions with `catchAsync` helper
3. **Validate input** - Use validation middleware before controller logic
4. **Consistent responses** - Use `responseHandler` utility for all responses
5. **Error handling** - Let errors bubble up to global error handler
6. **Logging** - Log important operations using the logger utility

## Usage Example

```javascript
const { catchAsync } = require("../utils/errorHandler");
const { sendSuccess } = require("../utils/responseHandler");
const UserService = require("../services/userService");

exports.getUser = catchAsync(async (req, res) => {
  const user = await UserService.findById(req.params.id);
  sendSuccess(res, user, "User retrieved successfully");
});
```

## Related Modules

- **Routes** (`../routes`) - Define endpoints that call these controllers
- **Middlewares** (`../middlewares`) - Validate and process requests before controllers
- **Services** (`../services`) - Business logic layer
- **Models** (`../models`) - Data layer and database schemas
