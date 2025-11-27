# CodeDript API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Health Check

### GET /health
Check the health status of the API and its services.

**Response:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "environment": "development",
    "timestamp": "2025-11-28T03:00:00.000Z",
    "uptime": 123.456,
    "services": {
      "api": "operational",
      "database": "healthy"
    }
  }
}
```

## API Information

### GET /api
Get information about the API.

**Response:**
```json
{
  "success": true,
  "message": "CodeDript API",
  "data": {
    "version": "v1",
    "documentation": "http://localhost:5000/api/docs",
    "endpoints": {
      "health": "/health",
      "api": "/api"
    }
  }
}
```

## Response Format

All API responses follow a standard format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Resources retrieved",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Authentication

Protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

- Window: 15 minutes
- Max Requests: 100 per window

## File Upload

- Max File Size: 50MB
- Allowed Types: PDF, Images (JPEG, PNG, GIF, WebP), Documents

## Development

This API is built with:
- Node.js & Express
- MongoDB
- Supabase
- Pinata (IPFS)
