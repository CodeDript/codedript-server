# Services Module

This directory contains business logic services that encapsulate complex operations and third-party integrations.

## Overview

Services provide a layer of abstraction between controllers and models, handling:

- Complex business logic
- Third-party API integrations
- Data processing and transformation
- Multi-model operations
- External service communication
- Reusable business operations

## Files

### `pinataService.js`

IPFS file storage service using Pinata:

**Features:**

- File upload to IPFS via Pinata
- JSON metadata upload
- File URL generation with multiple gateways
- List pinned files
- Unpin files from IPFS
- Connection testing and health checks
- Retry logic for failed uploads
- Comprehensive error handling and logging

**Methods:**

- `uploadFile(file, filename, metadata)` - Upload file to IPFS
- `uploadJSON(jsonData, name)` - Upload JSON metadata to IPFS
- `getFileUrl(cid, usePublicGateway)` - Get file URL from CID
- `getGatewayUrls(cid)` - Get multiple gateway URLs
- `listFiles(filters)` - List all pinned files
- `unpinFile(ipfsHash)` - Remove file from IPFS
- `testConnection()` - Test Pinata connection

**Usage:**

```javascript
const pinataService = require("../services/pinataService");

// Upload file
const result = await pinataService.uploadFile(fileBuffer, "document.pdf", {
  mimeType: "application/pdf",
});

// Get file URL
const url = pinataService.getFileUrl(result.cid);
```

## Service Pattern

Services typically follow this structure:

```javascript
class ServiceName {
  constructor() {
    // Initialize service dependencies
  }

  /**
   * Service method
   * @param {Object} params - Method parameters
   * @returns {Promise<Object>} - Operation result
   */
  async methodName(params) {
    try {
      // Business logic
      // Data validation
      // External API calls
      // Database operations

      return result;
    } catch (error) {
      logger.error("Operation failed", { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ServiceName();
```

## Common Service Types

### 1. Integration Services

External API and service integrations:

- **Payment Services** - Stripe, PayPal integration
- **Storage Services** - IPFS, AWS S3, Cloudinary
- **Email Services** - SendGrid, Mailgun
- **SMS Services** - Twilio, Vonage
- **Blockchain Services** - Web3, smart contract interactions

### 2. Business Logic Services

Complex business operations:

- **Agreement Service** - Agreement creation and management
- **Escrow Service** - Payment escrow handling
- **Notification Service** - Multi-channel notifications
- **Analytics Service** - Data analytics and reporting
- **Search Service** - Advanced search functionality

### 3. Data Processing Services

Data transformation and processing:

- **File Processing** - Image resizing, PDF generation
- **Data Export** - CSV, Excel export
- **Report Generation** - PDF reports, analytics
- **Data Validation** - Complex validation logic

## Best Practices

1. **Single Responsibility** - Each service should have a focused purpose
2. **Error Handling** - Comprehensive error handling with meaningful messages
3. **Logging** - Log all important operations and errors
4. **Retry Logic** - Implement retry for transient failures
5. **Configuration** - Use environment configuration for service settings
6. **Testing** - Write unit tests for service methods
7. **Documentation** - Document all public methods with JSDoc
8. **Singleton Pattern** - Export singleton instances for stateful services
9. **Dependency Injection** - Make services testable with dependency injection
10. **Async/Await** - Use async/await for asynchronous operations

## Service vs Controller vs Model

| Layer          | Responsibility                   | Example                                                   |
| -------------- | -------------------------------- | --------------------------------------------------------- |
| **Controller** | HTTP request/response handling   | Parse request, call service, send response                |
| **Service**    | Business logic and orchestration | Complex operations, external APIs, multi-model operations |
| **Model**      | Data layer and simple CRUD       | Database schema, basic queries, data validation           |

## Usage Example

```javascript
// In controller
const pinataService = require("../services/pinataService");
const { catchAsync } = require("../utils/errorHandler");

exports.uploadDocument = catchAsync(async (req, res) => {
  // Controller handles HTTP
  const file = req.file.buffer;
  const filename = req.file.originalname;

  // Service handles business logic
  const result = await pinataService.uploadFile(file, filename, {
    mimeType: req.file.mimetype,
    keyvalues: {
      userId: req.user.id,
      documentType: req.body.type,
    },
  });

  // Controller sends response
  res.status(200).json({
    success: true,
    data: result,
  });
});
```

## Testing Services

```javascript
// Example service test
const pinataService = require("../services/pinataService");

describe("PinataService", () => {
  it("should upload file successfully", async () => {
    const buffer = Buffer.from("test content");
    const result = await pinataService.uploadFile(buffer, "test.txt");

    expect(result.success).toBe(true);
    expect(result.ipfsHash).toBeDefined();
    expect(result.url).toContain("ipfs");
  });
});
```

## Related Modules

- **Controllers** (`../controllers`) - Call services to perform operations
- **Models** (`../models`) - Services use models for database operations
- **Utils** (`../utils`) - Helper functions used by services
- **Config** (`../config`) - Service configuration and credentials
