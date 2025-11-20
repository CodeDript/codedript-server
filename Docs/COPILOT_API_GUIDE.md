# API Development Guide for GitHub Copilot

> **One-Line Command**: `Create [feature] following COPILOT_API_GUIDE`

**Example:** `Create login feature following COPILOT_API_GUIDE`

---

## 🎯 Architecture Rules

When you see "following COPILOT_API_GUIDE", build the feature using:

✅ **Controller** in `controllers/` with:
- `catchAsync` wrapper for all async handlers
- Response handlers from `utils/responseHandler` (sendSuccessResponse, sendCreatedResponse, etc.)
- `AppError` from `middlewares/errorHandler` for errors
- Service delegation for complex logic

✅ **Route** in `routes/` with:
- Express router setup
- Middleware chain: auth (`protect`), validation (`validateRequest`), upload (`upload`)
- Proper HTTP methods (GET, POST, PUT, DELETE)

✅ **Registration** in `server.js`:
- Import route: `const featureRoutes = require('./routes/feature.routes');`
- Mount route: `app.use('/api/features', featureRoutes);`

✅ **Model** (if needed) in `models/` with:
- Mongoose schema with validation
- Timestamps, indexes, and defaults
- Virtual fields and methods if needed

---

## 📁 Project Structure

```
codedript-server/
├── config/           # Database, Supabase, environment config
├── controllers/      # Route handlers (business logic)
├── routes/           # Express route definitions
├── models/           # Mongoose schemas
├── middlewares/      # Auth, validation, upload, error handling
├── services/         # Reusable business logic (email, PDF, Supabase)
├── utils/            # Helper functions, response handlers, validators
└── server.js         # Application entry point
```

---

## 🚀 Creating a New API Feature

### Step 1: Create the Controller

```javascript
// controllers/feature.controller.js
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { sendSuccessResponse, sendCreatedResponse } = require('../utils/responseHandler');
const Model = require('../models/Model');

// GET all
exports.getAll = catchAsync(async (req, res, next) => {
  const items = await Model.find();
  sendSuccessResponse(res, 200, 'Items retrieved', items);
});

// GET by ID
exports.getById = catchAsync(async (req, res, next) => {
  const item = await Model.findById(req.params.id);
  if (!item) return next(new AppError('Not found', 404));
  sendSuccessResponse(res, 200, 'Item retrieved', item);
});

// POST create
exports.create = catchAsync(async (req, res, next) => {
  const item = await Model.create(req.body);
  sendCreatedResponse(res, 'Item created', item);
});
```

### Step 2: Create the Route

```javascript
// routes/feature.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/feature.controller');
const { protect } = require('../middlewares/auth');

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', protect, controller.create);

module.exports = router;
```

### Step 3: Register in Server

```javascript
// server.js
const featureRoutes = require('./routes/feature.routes');
app.use('/api/features', featureRoutes);
```

---

## 📦 Available Utilities

### Response Handlers (`utils/responseHandler`)

```javascript
const {
  sendSuccessResponse,      // 200 OK
  sendCreatedResponse,       // 201 Created
  sendPaginatedResponse,     // 200 with pagination
  sendNoContentResponse,     // 204 No Content
  sendBadRequestResponse,    // 400 Bad Request
  sendUnauthorizedResponse,  // 401 Unauthorized
  sendForbiddenResponse,     // 403 Forbidden
  sendNotFoundResponse,      // 404 Not Found
  sendConflictResponse,      // 409 Conflict
  sendServerErrorResponse    // 500 Server Error
} = require('../utils/responseHandler');

// Usage
sendSuccessResponse(res, 200, 'Message', data);
sendPaginatedResponse(res, 200, 'Message', items, { page, limit, total });
```

### Error Handling (`middlewares/errorHandler`)

```javascript
const { catchAsync, AppError } = require('../middlewares/errorHandler');

// Wrap async functions
exports.handler = catchAsync(async (req, res, next) => {
  // Your code
});

// Throw operational errors
throw new AppError('Error message', 404);
throw new AppError('Validation failed', 400, [{ field: 'email', message: 'Invalid' }]);
```

### Authentication (`middlewares/auth`)

```javascript
const { protect, restrictTo } = require('../middlewares/auth');

// Protect routes (requires JWT)
router.get('/profile', protect, controller.getProfile);

// Restrict to specific roles
router.delete('/:id', protect, restrictTo('admin'), controller.delete);
```

### File Upload (`middlewares/upload`)

```javascript
const { upload } = require('../middlewares/upload');

// Single file
router.post('/avatar', upload.single('avatar'), controller.uploadAvatar);

// Multiple files
router.post('/images', upload.array('images', 5), controller.uploadImages);

// Mixed fields
router.post('/profile', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), controller.updateProfile);
```

### Validation (`middlewares/validation`)

```javascript
const { validateRequest } = require('../middlewares/validation');

router.post('/', validateRequest('createUser'), controller.create);
```

### Supabase Service (`services/supabaseService`)

```javascript
const { uploadToSupabase, deleteFromSupabase, getSignedUrl } = require('../services/supabaseService');

// Upload file
const url = await uploadToSupabase(file, 'folder-name');

// Delete file
await deleteFromSupabase(fileUrl);

// Get temporary URL
const signedUrl = await getSignedUrl(filePath, 3600);
```

---

## 🎨 Common Patterns

### Pagination

```javascript
exports.getAll = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Model.find().skip(skip).limit(limit),
    Model.countDocuments()
  ]);

  sendPaginatedResponse(res, 200, 'Items retrieved', items, { page, limit, total });
});
```

### Search & Filtering

```javascript
exports.search = catchAsync(async (req, res, next) => {
  const { q, category, minPrice, maxPrice } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = minPrice;
    if (maxPrice) filter.price.$lte = maxPrice;
  }
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } }
    ];
  }

  const items = await Model.find(filter);
  sendSuccessResponse(res, 200, 'Search results', items);
});
```

### File Upload with Validation

```javascript
exports.uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  // Upload to Supabase
  const imageUrl = await uploadToSupabase(req.file, 'images');

  // Update model
  const item = await Model.findByIdAndUpdate(
    req.params.id,
    { image: imageUrl },
    { new: true }
  );

  sendSuccessResponse(res, 200, 'Image uploaded', item);
});
```

### Ownership Check

```javascript
exports.update = catchAsync(async (req, res, next) => {
  const item = await Model.findById(req.params.id);

  if (!item) {
    return next(new AppError('Item not found', 404));
  }

  if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You can only update your own items', 403));
  }

  // Proceed with update
  Object.assign(item, req.body);
  await item.save();

  sendSuccessResponse(res, 200, 'Item updated', item);
});
```

---

## 🤖 One-Line Copilot Commands

**Format:** `Create [feature] following COPILOT_API_GUIDE`

**Examples:**
```
Create login feature following COPILOT_API_GUIDE
Create user profile update following COPILOT_API_GUIDE
Create gig listing with pagination following COPILOT_API_GUIDE
Create file upload for avatar following COPILOT_API_GUIDE
Create order creation with payment following COPILOT_API_GUIDE
Create admin dashboard analytics following COPILOT_API_GUIDE
```

**Copilot will automatically:**
- Generate controller with catchAsync, response handlers, and AppError
- Create routes with proper middleware (protect, validate, upload)
- Include pagination, filtering, and search if needed
- Add ownership checks for update/delete operations
- Handle file uploads with Supabase integration
- Follow all patterns from reference examples

---

## ✅ Best Practices

### DO ✓
- Use `catchAsync` for all async route handlers
- Use response handlers from `utils/responseHandler`
- Throw `AppError` for operational errors
- Validate user input with middleware
- Check ownership before update/delete
- Use services for complex business logic
- Add JSDoc comments to functions
- Handle file cleanup on errors

### DON'T ✗
- Use `res.json()` directly - use response handlers
- Use `try/catch` - use `catchAsync` instead
- Import `AppError` from `responseHandler` - use `errorHandler`
- Put business logic in routes - use controllers
- Expose sensitive data (passwords, tokens) in responses
- Skip error handling
- Use `console.log()` in production code

---

## 📚 Reference Examples

See complete working examples:
- **controllers/user.controller.js** - Basic CRUD with authentication
- **controllers/gig.controller.js** - Advanced filtering, search, file uploads
- **routes/user.routes.js** - Route organization with middleware
- **routes/gig.routes.js** - File upload routes

---

## 🔗 Import Quick Reference

```javascript
// Error handling
const { catchAsync, AppError } = require('../middlewares/errorHandler');

// Response handlers
const { sendSuccessResponse, sendCreatedResponse } = require('../utils/responseHandler');

// Authentication
const { protect, restrictTo } = require('../middlewares/auth');

// Validation
const { validateRequest } = require('../middlewares/validation');

// File upload
const { upload } = require('../middlewares/upload');

// Supabase
const { uploadToSupabase, deleteFromSupabase } = require('../services/supabaseService');

// Models
const Model = require('../models/ModelName');
```

---

## 🎯 Response Structure

All responses follow this consistent structure:

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { },
  "timestamp": "2025-11-20T10:33:07.536Z"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ ],
  "timestamp": "2025-11-20T10:33:07.536Z"
}
```

---

## 💡 Usage Workflow

1. **Open a new file** in `controllers/` or `routes/`
2. **Type the command:** `Create [feature] following COPILOT_API_GUIDE`
3. **Let Copilot generate** the complete implementation
4. **Register the route** in `server.js`
5. **Test the endpoint** with Postman/Thunder Client

**That's it!** Copilot will handle all the boilerplate following this architecture. 🚀

---

## 🎯 What "Following COPILOT_API_GUIDE" Means

When Copilot sees this instruction, it will:

✅ Use **ONLY** response handlers (never `res.json()` directly)
✅ Wrap all async functions with `catchAsync`
✅ Import `AppError` from `middlewares/errorHandler` (NOT responseHandler)
✅ Apply middleware in correct order: protect → validate → upload → controller
✅ Include error handling, ownership checks, and validation
✅ Follow patterns from `user.controller.js` and `gig.controller.js`
✅ Use services for Supabase uploads, emails, PDFs
✅ Return consistent response structure with timestamp
