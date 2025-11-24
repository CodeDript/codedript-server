# CodeDript API Routes Documentation

## Base URL
All routes are prefixed with `/api/v1`

---

## 🔐 Authentication Routes (`/api/v1/auth`)

### Register New User
- **POST** `/auth/register`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "walletAddress": "0x1234...",
    "role": "client|developer|both",
    "profile": {
      "name": "John Doe",
      "bio": "Software developer",
      "skills": ["JavaScript", "React"]
    }
  }
  ```

### Login
- **POST** `/auth/login`
- **Access**: Public
- **Body**:
  ```json
  {
    "walletAddress": "0x1234...",
    "signature": "optional_signature"
  }
  ```

### Refresh Token
- **POST** `/auth/refresh`
- **Access**: Public
- **Body**:
  ```json
  {
    "refreshToken": "your_refresh_token"
  }
  ```

### Logout
- **POST** `/auth/logout`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`

### Get Current User
- **GET** `/auth/me`
- **Access**: Private
- **Headers**: `Authorization: Bearer <token>`

### Verify Wallet
- **POST** `/auth/verify-wallet`
- **Access**: Private
- **Body**:
  ```json
  {
    "walletAddress": "0x1234...",
    "signature": "signature",
    "message": "verification_message"
  }
  ```

### Check Availability
- **POST** `/auth/check-availability`
- **Access**: Public
- **Body**:
  ```json
  {
    "email": "test@example.com",
    "walletAddress": "0x1234..."
  }
  ```

---

## 👤 User Routes (`/api/v1/users`)

### Get All Users
- **GET** `/users?page=1&limit=10&role=developer&skills=JavaScript,React&verified=true`
- **Access**: Public

### Search Users
- **GET** `/users/search?q=john&role=developer&skills=React`
- **Access**: Public

### Get User by ID
- **GET** `/users/:id`
- **Access**: Public

### Update Profile
- **PUT** `/users/:id`
- **Access**: Private (Owner only)
- **Body**:
  ```json
  {
    "profile": {
      "name": "Updated Name",
      "bio": "Updated bio",
      "skills": ["New", "Skills"],
      "hourlyRate": 50
    }
  }
  ```

### Upload Avatar
- **POST** `/users/:id/avatar`
- **Access**: Private (Owner only)
- **Body**: FormData with `avatar` file

### Get User Statistics
- **GET** `/users/:id/statistics`
- **Access**: Public

### Get User Agreements
- **GET** `/users/:id/agreements?status=active&role=client`
- **Access**: Private (Owner only)

### Get User Gigs
- **GET** `/users/:id/gigs?status=active`
- **Access**: Public

### Deactivate Account
- **DELETE** `/users/:id`
- **Access**: Private (Owner only)

---

## 💼 Gig Routes (`/api/v1/gigs`)

### Get All Gigs
- **GET** `/gigs?page=1&limit=10&category=web-development&minPrice=100&maxPrice=1000&skills=React&deliveryTime=30&status=active`
- **Access**: Public

### Search Gigs
- **GET** `/gigs/search?q=react&category=web-development&skills=TypeScript`
- **Access**: Public

### Get Gigs by Category
- **GET** `/gigs/category/:category`
- **Access**: Public

### Create Gig
- **POST** `/gigs`
- **Access**: Private (Developer only)
- **Body**:
  ```json
  {
    "title": "Build a React Application",
    "description": "I will build a modern React application...",
    "category": "web-development",
    "skills": ["React", "TypeScript", "Node.js"],
    "pricing": {
      "type": "fixed",
      "amount": 500,
      "currency": "ETH"
    },
    "deliveryTime": 14,
    "revisions": 2,
    "tags": ["react", "frontend"]
  }
  ```

### Get Gig by ID
- **GET** `/gigs/:id`
- **Access**: Public

### Update Gig
- **PUT** `/gigs/:id`
- **Access**: Private (Owner only)

### Delete Gig
- **DELETE** `/gigs/:id`
- **Access**: Private (Owner only)

### Upload Gig Images
- **POST** `/gigs/:id/images`
- **Access**: Private (Owner only)
- **Body**: FormData with `images` files (max 5)

### Delete Gig Image
- **DELETE** `/gigs/:id/images/:imageIndex`
- **Access**: Private (Owner only)

### Record Gig Inquiry
- **POST** `/gigs/:id/inquire`
- **Access**: Private

---

## 📋 Agreement Routes (`/api/v1/agreements`)

### Get All Agreements
- **GET** `/agreements?page=1&limit=10&status=active&role=client`
- **Access**: Private

### Get Agreement Statistics
- **GET** `/agreements/statistics`
- **Access**: Private

### Create Agreement
- **POST** `/agreements`
- **Access**: Private
- **Body**:
  ```json
  {
    "developerId": "developer_user_id",
    "gigId": "optional_gig_id",
    "project": {
      "name": "E-commerce Platform",
      "description": "Build a full-featured e-commerce platform",
      "requirements": "React, Node.js, PostgreSQL",
      "deliverables": ["Frontend", "Backend", "Database"],
      "expectedEndDate": "2025-12-31"
    },
    "financials": {
      "totalValue": 5000,
      "currency": "ETH"
    },
    "milestones": [
      {
        "title": "Frontend Development",
        "description": "Complete frontend",
        "financials": { "value": 2000, "currency": "ETH" },
        "timeline": { "dueDate": "2025-06-30" }
      }
    ],
    "terms": {
      "paymentTerms": "Payment upon milestone approval",
      "cancellationPolicy": "7 days notice required"
    }
  }
  ```

### Get Agreement by ID
- **GET** `/agreements/:id`
- **Access**: Private

### Update Agreement
- **PUT** `/agreements/:id`
- **Access**: Private (Draft only)

### Submit Agreement
- **POST** `/agreements/:id/submit`
- **Access**: Private (Client only)

### Respond to Agreement
- **POST** `/agreements/:id/respond`
- **Access**: Private (Developer only)
- **Body**: `{ "action": "accept|reject" }`

### Sign Agreement
- **POST** `/agreements/:id/sign`
- **Access**: Private
- **Body**:
  ```json
  {
    "walletAddress": "0x1234...",
    "signature": "wallet_signature"
  }
  ```

### Request Modification
- **POST** `/agreements/:id/modifications`
- **Access**: Private
- **Body**:
  ```json
  {
    "modificationType": "payment_change|timeline_change|scope_change",
    "description": "Reason for modification",
    "previousValue": {},
    "newValue": {}
  }
  ```

### Respond to Modification
- **PUT** `/agreements/:id/modifications/:modificationId`
- **Access**: Private
- **Body**: `{ "action": "approve|reject" }`

### Cancel Agreement
- **POST** `/agreements/:id/cancel`
- **Access**: Private
- **Body**: `{ "reason": "Cancellation reason" }`

### Complete Agreement
- **POST** `/agreements/:id/complete`
- **Access**: Private (Client only)

### Upload Document
- **POST** `/agreements/:id/documents`
- **Access**: Private
- **Body**: FormData with `document` file

### Generate PDF
- **POST** `/agreements/:id/generate-pdf`
- **Access**: Private

---

## 🎯 Milestone Routes (`/api/v1/milestones`)

### Get Milestones by Agreement
- **GET** `/milestones/agreement/:agreementId`
- **Access**: Private

### Get Overdue Milestones
- **GET** `/milestones/overdue`
- **Access**: Private

### Get Milestone Statistics
- **GET** `/milestones/statistics`
- **Access**: Private

### Create Milestone
- **POST** `/milestones`
- **Access**: Private
- **Body**:
  ```json
  {
    "agreementId": "agreement_id",
    "title": "Phase 1 Development",
    "description": "Complete phase 1",
    "deliverables": ["Feature A", "Feature B"],
    "financials": {
      "value": 1000,
      "currency": "ETH"
    },
    "timeline": {
      "dueDate": "2025-07-31"
    }
  }
  ```

### Get Milestone by ID
- **GET** `/milestones/:id`
- **Access**: Private

### Update Milestone
- **PUT** `/milestones/:id`
- **Access**: Private

### Start Milestone
- **POST** `/milestones/:id/start`
- **Access**: Private (Developer only)

### Submit Milestone
- **POST** `/milestones/:id/submit`
- **Access**: Private (Developer only)
- **Body**: FormData with optional `files` and `notes`

### Approve Milestone
- **POST** `/milestones/:id/approve`
- **Access**: Private (Client only)
- **Body**:
  ```json
  {
    "rating": 5,
    "feedback": "Excellent work!"
  }
  ```

### Request Revision
- **POST** `/milestones/:id/request-revision`
- **Access**: Private (Client only)
- **Body**: `{ "reason": "Please update X, Y, Z" }`

### Upload Milestone Files
- **POST** `/milestones/:id/files`
- **Access**: Private (Developer only)
- **Body**: FormData with `files` (max 10)

### Delete Milestone
- **DELETE** `/milestones/:id`
- **Access**: Private (Client only)

---

## 💰 Transaction Routes (`/api/v1/transactions`)

### Get All Transactions
- **GET** `/transactions?page=1&limit=10&type=milestone_payment&status=completed&role=sender`
- **Access**: Private

### Get Transaction Summary
- **GET** `/transactions/summary`
- **Access**: Private

### Get Transaction Statistics
- **GET** `/transactions/statistics`
- **Access**: Private

### Get Transactions by Agreement
- **GET** `/transactions/agreement/:agreementId`
- **Access**: Private

### Create Transaction
- **POST** `/transactions`
- **Access**: Private
- **Body**:
  ```json
  {
    "type": "escrow_deposit|milestone_payment|refund",
    "agreementId": "agreement_id",
    "milestoneId": "optional_milestone_id",
    "toUserId": "recipient_user_id",
    "amount": {
      "value": 1000,
      "currency": "ETH",
      "usdValue": 3500
    },
    "description": "Payment description"
  }
  ```

### Create Escrow Deposit
- **POST** `/transactions/escrow-deposit`
- **Access**: Private (Client only)
- **Body**:
  ```json
  {
    "agreementId": "agreement_id",
    "amount": 5000
  }
  ```

### Create Milestone Payment
- **POST** `/transactions/milestone-payment`
- **Access**: Private (Client only)
- **Body**: `{ "milestoneId": "milestone_id" }`

### Get Transaction by ID
- **GET** `/transactions/:id`
- **Access**: Private

### Update Transaction Status
- **PUT** `/transactions/:id/status`
- **Access**: Private
- **Body**:
  ```json
  {
    "status": "completed|failed",
    "blockchainData": {
      "transactionHash": "0xabc...",
      "blockNumber": 12345,
      "gasUsed": "21000"
    }
  }
  ```

### Record Blockchain Transaction
- **POST** `/transactions/:id/blockchain`
- **Access**: Private
- **Body**:
  ```json
  {
    "transactionHash": "0xabc...",
    "blockNumber": 12345,
    "blockHash": "0xdef...",
    "gasUsed": "21000",
    "gasPrice": "20",
    "network": "mainnet|sepolia"
  }
  ```

---

## 🔑 Authentication Header

For all private routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { },
  "timestamp": "2025-11-20T10:33:07.536Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Items retrieved",
  "data": [ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2025-11-20T10:33:07.536Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2025-11-20T10:33:07.536Z"
}
```

---

## 🚀 Quick Start

1. **Register a user**:
   ```bash
   POST /api/v1/auth/register
   ```

2. **Login**:
   ```bash
   POST /api/v1/auth/login
   ```

3. **Use the access token for authenticated requests**

4. **Create a gig** (if you're a developer):
   ```bash
   POST /api/v1/gigs
   ```

5. **Create an agreement** (if you're a client):
   ```bash
   POST /api/v1/agreements
   ```

---

## 📝 Notes

- All dates should be in ISO 8601 format
- Wallet addresses must be valid Ethereum addresses (0x + 40 hex characters)
- File uploads use multipart/form-data
- Maximum file size: 10MB (configurable)
- Platform fee: 2.5% of transaction value
- JWT tokens expire in 7 days (configurable)
- Refresh tokens expire in 30 days (configurable)
