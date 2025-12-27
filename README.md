# CodeDript Server

Backend API server for the CodeDript platform. This Node.js/Express application handles user authentication, agreement management, blockchain interactions, and IPFS file storage.

## Features

- User authentication with MetaMask wallet integration
- Agreement and gig management
- Blockchain transaction handling with ethers.js
- IPFS file storage via Pinata
- PostgreSQL database with Supabase
- RESTful API endpoints

## Project Structure

```
src/
├── config/              # Configuration files
├── controllers/         # Request handlers
├── middlewares/         # Express middlewares
├── models/              # Data models
├── routes/              # API routes
├── services/            # External service integrations
├── utils/               # Helper functions
├── app.js              # Express app configuration
└── server.js           # Server entry point
```

## Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` file:

   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:

   - Database credentials (Supabase)
   - JWT secret
   - Pinata API keys
   - Ethereum RPC URL
   - Contract addresses

4. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:5000`

## API Endpoints

- `POST /api/auth/login` - User authentication
- `GET /api/gigs` - List all gigs
- `POST /api/agreements` - Create agreement
- `GET /api/transactions` - Get transactions

See `docs/` folder for complete API documentation.

## Environment Variables

Required environment variables:

```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
PINATA_JWT=your_pinata_jwt
ETHEREUM_RPC_URL=your_rpc_url
CONTRACT_ADDRESS=deployed_contract_address
```

## Development

```bash
npm run dev     # Start with nodemon
npm start       # Production start
npm test        # Run tests
```

## License

MIT
