const mongoose = require('mongoose');

/**
 * Database Configuration
 * Handles MongoDB connection with retry logic and event listeners
 */

class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.retryCount = 0;
    this.maxRetries = 10;
    this.baseRetryDelay = 2000; // 2 seconds base delay
    this.maxRetryDelay = 30000; // 30 seconds max delay
    this.connectionAttempts = 0;
    this.lastConnectionError = null;
  }

  /**
   * Calculate exponential backoff delay
   */
  getRetryDelay() {
    const exponentialDelay = Math.min(
      this.baseRetryDelay * Math.pow(2, this.retryCount),
      this.maxRetryDelay
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  /**
   * Connect to MongoDB with enhanced retry logic and exponential backoff
   */
  async connect() {
    if (this.isConnected && mongoose.connection.readyState === 1) {
      // already connected and healthy
      return;
    }

    const options = {
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      retryReads: true,
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
      autoIndex: process.env.NODE_ENV === 'development',
      heartbeatFrequencyMS: 10000
    };

    try {
      this.connectionAttempts++;
      await mongoose.connect(process.env.MONGODB_URI, options);
      this.isConnected = true;
      this.retryCount = 0;
      this.lastConnectionError = null;
      this.connectionAttempts = 0;
      // connected successfully (logging handled by environment/status checker)
    } catch (error) {
      this.lastConnectionError = error.message;
      // connection error (handled by retry logic)
      await this.handleConnectionError(error);
    }
  }

  /**
   * Handle connection errors with exponential backoff retry logic
   */
  async handleConnectionError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.getRetryDelay();
      
      console.log(`⚠️  MongoDB connection attempt ${this.connectionAttempts} failed. Retrying in ${Math.round(delay/1000)}s... (${this.retryCount}/${this.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.connect();
    } else {
      // Max retries reached — mark as not connected and stop retrying.
      // Do NOT call process.exit here so the server can continue running and
      // the environment status checker can report the failure.
      console.error(`❌ MongoDB connection failed after ${this.maxRetries} attempts. Last error: ${error.message}`);
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
   * Attempt to reconnect if connection is lost
   */
  async attemptReconnect() {
    if (!this.isConnected && !this.reconnecting) {
      this.reconnecting = true;
      console.log('🔄 Attempting to reconnect to MongoDB...');
      this.retryCount = 0;
      await this.connect();
      this.reconnecting = false;
    }
  }

  /**
   * Setup event listeners for connection monitoring
   */
  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
      this.lastConnectionError = err.message;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      this.isConnected = false;
      // Attempt to reconnect after 5 seconds
      setTimeout(() => this.attemptReconnect(), 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
      this.isConnected = true;
      this.retryCount = 0;
    });

    mongoose.connection.on('reconnectFailed', () => {
      console.error('❌ MongoDB reconnection failed');
      this.isConnected = false;
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
   * Check if database is healthy with detailed diagnostics
   */
  async healthCheck() {
    try {
      const readyState = mongoose.connection.readyState;
      const stateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (readyState !== 1) {
        return { 
          status: 'disconnected', 
          message: `Database ${stateMap[readyState]}`,
          readyState: stateMap[readyState],
          lastError: this.lastConnectionError
        };
      }

      // Ping the database with timeout
      const pingPromise = mongoose.connection.db.admin().ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        details: {
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          readyState: stateMap[readyState],
          poolSize: mongoose.connection.db?.serverConfig?.s?.poolSize || 'N/A',
          uptime: process.uptime()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        lastError: this.lastConnectionError
      };
    }
  }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();
databaseConfig.setupEventListeners();

module.exports = databaseConfig;
