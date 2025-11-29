const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");

// Configuration
const environmentConfig = require("./config/environment");
const { CORS_CONFIG } = require("./config/constants");

// Utilities
const logger = require("./utils/logger");
const { sendSuccessResponse } = require("./utils/responseHandler");
const { notFound, errorHandler } = require("./utils/errorHandler");

// Import routes
const routes = require("./routes");

/**
 * Initialize Express Application
 */
const app = express();

/**
 * Get Configuration
 */
const config = environmentConfig.getConfig();

/**
 * Security Middleware
 */
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * CORS Configuration
 */
app.use(
  cors(
    config.cors || {
      origin: CORS_CONFIG.ALLOWED_ORIGINS,
      credentials: CORS_CONFIG.CREDENTIALS,
      optionsSuccessStatus: CORS_CONFIG.OPTIONS_SUCCESS_STATUS,
    }
  )
);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Data Sanitization - Prevent MongoDB injection
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
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
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
app.get("/health", async (req, res) => {
  const databaseConfig = require("./config/database");
  const dbStatus = await databaseConfig.healthCheck();

  sendSuccessResponse(res, 200, "Server is healthy", {
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      api: "operational",
      database: dbStatus.status,
    },
  });
});

/**
 * Root Route
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CodeDript API Server",
    version: config.server?.apiVersion || "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      testUsers: "/api/test-users",
    },
  });
});


/**
 * Mount API Routes
 */
app.use("/", routes);

/**
 * 404 Handler - Route Not Found
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorHandler);

module.exports = app;
