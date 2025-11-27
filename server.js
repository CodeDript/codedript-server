const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

// Configuration
const environmentConfig = require('./src/config/environment');
const databaseConfig = require('./src/config/database');

// Utilities
const logger = require('./src/utils/logger');
const { sendSuccessResponse } = require('./src/utils/responseHandler');

// Middleware
const { 
  errorHandler, 
  notFound, 
  handleUnhandledRejection, 
  handleUncaughtException 
} = require('./src/utils/errorHandler');

/**
 * Initialize Express Application
 */
const app = express();

/**
 * Get Configuration
 */
const config = environmentConfig.getConfig();

/**
 * Handle Uncaught Exceptions and Unhandled Rejections
 */
handleUncaughtException();
handleUnhandledRejection();

/**
 * Security Middleware
 */
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors(config.cors));

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Data Sanitization
 */
app.use(mongoSanitize());

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
 * Request ID Middleware
 */
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substring(7);
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', async (req, res) => {
  const dbStatus = await databaseConfig.healthCheck();
  
  sendSuccessResponse(res, 200, 'Server is healthy', {
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: 'operational',
      database: dbStatus.status
    }
  });
});

/**
 * API Information Endpoint
 */
app.get('/api', (req, res) => {
  sendSuccessResponse(res, 200, 'CodeDript API', {
    version: config.server.apiVersion,
    documentation: `${config.server.baseUrl}/api/docs`,
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

/**
 * API Routes Prefix
 */
const API_PREFIX = `/api/${config.server.apiVersion}`;

// Add your routes here
// Example: app.use(`${API_PREFIX}/users`, userRoutes);

/**
 * 404 Handler - Route Not Found
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

/**
 * Start Server
 */
const startServer = async () => {
  try {
    const PORT = config.server.port;
    const server = app.listen(PORT, () => {
      (async () => {
        try {
          const url = config.server.baseUrl || `http://localhost:${PORT}`;
          await environmentConfig.printStartupMinimal({ url });
        } catch (e) {
          logger.info(`Server started on port ${PORT}`);
        }
      })();
    });

    // Connect to the database in background
    databaseConfig.connect().catch(() => {
      logger.warn('Database connection failed during startup');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await databaseConfig.disconnect();
          logger.info('Database connection closed');
          logger.info('Goodbye!');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
