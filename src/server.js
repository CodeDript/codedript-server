require("dotenv").config();
const app = require("./app");
const databaseConfig = require("./config/database");
const environmentConfig = require("./config/environment");
const logger = require("./utils/logger");
const {
  handleUncaughtException,
  handleUnhandledRejection,
} = require("./utils/errorHandler");

/**
 * Handle Uncaught Exceptions and Unhandled Rejections
 */
handleUncaughtException();

/**
 * Get Configuration
 */
const config = environmentConfig.getConfig();

/**
 * Start Server
 */
const startServer = async () => {
  try {
    const PORT = config.server?.port || process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      // Print startup info
      (async () => {
        try {
          const url = config.server?.baseUrl || `http://localhost:${PORT}`;
          await environmentConfig.printStartupMinimal({ url });
        } catch (e) {
          logger.info(`✓ Server running on port ${PORT}`);
          logger.info(`✓ API available at http://localhost:${PORT}/api`);
        }
      })();
    });

    // Handle unhandled promise rejections
    handleUnhandledRejection(server);

    // Connect to database in background
    databaseConfig.connect().catch(() => {
      logger.warn(
        "Database connection failed during startup. Will retry automatically."
      );
    });

    /**
     * Graceful Shutdown Handler
     */
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await databaseConfig.disconnect();
          logger.info("Database connection closed");
          logger.info("Goodbye!");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown", { error: error.message });
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2 (nodemon restart)"));
  } catch (error) {
    logger.error("Failed to start server", { error: error.message });
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
