const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Configuration
const environmentConfig = require('./config/environment');
const databaseConfig = require('./config/database');

// Utilities
const { sendSuccessResponse } = require('./utils/responseHandler');

// Middlewares
const { errorHandler, notFound, handleUnhandledRejection, handleUncaughtException } = require('./middlewares/errorHandler');
const { sanitizeInput } = require('./middlewares/validation');

// Routes (will be uncommented as you create them)
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const gigRoutes = require('./routes/gigRoutes');
// const agreementRoutes = require('./routes/agreementRoutes');
// const milestoneRoutes = require('./routes/milestoneRoutes');
// const transactionRoutes = require('./routes/transactionRoutes');

/**
 * Initialize Express Application
 */
const app = express();

/**
 * Get Configuration
 */
const config = environmentConfig.getConfig();

/**
 * Handle Uncaught Exceptions
 */
handleUncaughtException();

/**
 * Security Middleware
 */
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors(config.cors));

/**
 * Rate Limiting
 */
if (config.features.enableRateLimiting) {
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });

  app.use('/api/', limiter);
}

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Data Sanitization
 */
// Sanitize data against NoSQL query injection
app.use(mongoSanitize());

// Custom sanitization
app.use(sanitizeInput);

/**
 * Compression Middleware
 */
app.use(compression());

/**
 * Logging Middleware
 */
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  const dbStatus = await databaseConfig.healthCheck();
  
  sendSuccessResponse(
    res,
    200,
    'Server is healthy',
    {
      environment: config.env,
      services: {
        api: 'operational',
        database: dbStatus.status
      }
    }
  );
});

/**
 * API Information Endpoint
 */
app.get('/api', (req, res) => {
  sendSuccessResponse(
    res,
    200,
    'CodeDript API',
    {
      version: config.server.apiVersion,
      documentation: `${config.server.baseUrl}/api/docs`,
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        users: '/api/users',
        gigs: '/api/gigs',
        agreements: '/api/agreements',
        milestones: '/api/milestones',
        transactions: '/api/transactions'
      }
    }
  );
});

/**
 * API Routes
 * Uncomment as you create route files
 */
const API_PREFIX = `/api/${config.server.apiVersion}`;

// app.use(`${API_PREFIX}/auth`, authRoutes);
// app.use(`${API_PREFIX}/users`, userRoutes);
// app.use(`${API_PREFIX}/gigs`, gigRoutes);
// app.use(`${API_PREFIX}/agreements`, agreementRoutes);
// app.use(`${API_PREFIX}/milestones`, milestoneRoutes);
// app.use(`${API_PREFIX}/transactions`, transactionRoutes);

/**
 * 404 Handler - Route Not Found
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Handle Unhandled Promise Rejections
 */
handleUnhandledRejection();

/**
 * Start Server
 */
const startServer = async () => {
  try {
    // Start listening first so we can print startup status immediately
    const PORT = config.server.port;
    const server = app.listen(PORT, () => {
      // Print only minimal startup info (server + connections)
      (async () => {
        try {
          const url = config.server.baseUrl || `http://localhost:${PORT}`;
          await environmentConfig.printStartupMinimal({ url });
        } catch (e) {
          // If status printing fails, fall back to a single line
          console.log(`Server started on port ${PORT}`);
        }
      })();
    });

    // Connect to the database in background (do not block server startup)
    databaseConfig.connect().catch(() => {
      // silent: connection errors are reported by the environment status checker
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          await databaseConfig.disconnect();
          console.log('✅ Database connection closed');
          console.log('👋 Goodbye!');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
