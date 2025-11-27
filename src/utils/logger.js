/**
 * Logger Utility
 * Console-based logger with different levels and source location tracking
 */

const path = require('path');

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const COLORS = {
  ERROR: '\x1b[31m',    // Red
  WARN: '\x1b[33m',     // Yellow
  INFO: '\x1b[36m',     // Cyan
  DEBUG: '\x1b[35m',    // Magenta
  GRAY: '\x1b[90m',     // Gray for source location
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
    this.showLocation = process.env.LOG_SHOW_LOCATION !== 'false'; // true by default
  }

  /**
   * Get caller information from stack trace
   */
  getCallerInfo() {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack;
    Error.prepareStackTrace = originalPrepareStackTrace;

    // Stack: [0] = this function, [1] = log method, [2] = actual caller
    const caller = stack[3];
    
    if (caller) {
      const fileName = caller.getFileName();
      const lineNumber = caller.getLineNumber();
      const functionName = caller.getFunctionName() || '<anonymous>';
      
      // Get relative path from project root
      const relativePath = fileName ? path.relative(process.cwd(), fileName) : 'unknown';
      
      return {
        file: relativePath,
        line: lineNumber,
        function: functionName
      };
    }
    
    return null;
  }

  formatMessage(level, message, meta = {}) {
    const color = COLORS[level] || COLORS.RESET;
    const reset = COLORS.RESET;
    const gray = COLORS.GRAY;
    
    // Get caller information
    let locationStr = '';
    if (this.showLocation) {
      const callerInfo = this.getCallerInfo();
      if (callerInfo) {
        locationStr = `${gray}[${callerInfo.file}:${callerInfo.line}]${reset} `;
      }
    }
    
    let logMessage = `${locationStr}${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  }

  shouldLog(level) {
    const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  error(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      console.error(this.formatMessage(LOG_LEVELS.ERROR, message, meta));
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }

  http(message, meta = {}) {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(this.formatMessage(LOG_LEVELS.INFO, `HTTP: ${message}`, meta));
    }
  }
}

// Export singleton instance
module.exports = new Logger();
