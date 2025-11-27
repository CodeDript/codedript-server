# CodeDript Server - Clean Foundation

This is a clean, minimal foundation for the CodeDript API server with only essential configurations.

## What's Included

- ✅ MongoDB configuration and connection
- ✅ Supabase configuration and client
- ✅ Pinata file upload service
- ✅ Basic Express server setup with security middleware
- ✅ Environment configuration

## Structure

```
src/
├── config/
│   ├── database.js       # MongoDB configuration
│   ├── supabase.js       # Supabase client setup
│   └── environment.js    # Environment variables
├── services/
│   └── pinataService.js  # Pinata IPFS file upload
├── models/               # Empty - ready for your models
├── controllers/          # Empty - ready for your controllers
├── routes/               # Empty - ready for your routes
├── middlewares/          # Empty - ready for your middleware
├── utils/                # Empty - ready for your utilities
└── server.js             # Main server file
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your `.env` file with:
   - MongoDB connection string
   - Supabase credentials
   - Pinata JWT token

3. Start the server:
   ```bash
   npm run dev
   ```

## Next Steps

You can now start building your API from scratch with a clean, organized structure!

- Create models in `src/models/`
- Create controllers in `src/controllers/`
- Create routes in `src/routes/`
- Add middleware in `src/middlewares/`
- Add utilities in `src/utils/`
