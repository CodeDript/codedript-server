const mongoose = require('mongoose');

/**
 * Database Configuration
 * Handles MongoDB connection with retry logic and event listeners
 */

class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB with retry logic
   */
  async connect() {
    if (this.isConnected) {
      // already connected (silent to avoid duplicate logging)
      return;
    }

    const options = {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority'
    };

    try {
      await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      this.retryCount = 0;
      // connected successfully (logging handled by environment/status checker)
    } catch (error) {
      // connection error (handled by retry logic)
      await this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      // retrying (silent)
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      await this.connect();
    } else {
      // Max retries reached — mark as not connected and stop retrying.
      // Do NOT call process.exit here so the server can continue running and
      // the environment status checker can report the failure.
      this.isConnected = false;
      this.failed = true;
      return;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      // disconnected (silent)
    } catch (error) {
      // error during disconnect (rethrow for caller)
      throw error;
    }
  }

  /**
   * Setup event listeners for connection monitoring
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      // connected (silent)
    });

    mongoose.connection.on('error', (err) => {
      // connection error (silent)
    });

    mongoose.connection.on('disconnected', () => {
      // disconnected (silent)
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      // reconnected (silent)
      this.isConnected = true;
    });

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      await this.gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
      await this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGUSR2', async () => {
      await this.gracefulShutdown('SIGUSR2 (nodemon restart)');
    });
  }

  /**
   * Graceful shutdown of database connection
   */
  async gracefulShutdown(signal) {
    try {
      await mongoose.connection.close();
      // closed gracefully (silent)
      process.exit(0);
    } catch (error) {
      // error during shutdown (silent)
      process.exit(1);
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      models: Object.keys(mongoose.connection.models)
    };
  }

  /**
   * Check if database is healthy
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: {
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          readyState: mongoose.connection.readyState
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message
      };
    }
  }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();
databaseConfig.setupEventListeners();

module.exports = databaseConfig;
