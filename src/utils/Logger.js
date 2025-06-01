/**
 * @fileoverview Logging utility
 */

import chalk from 'chalk';

/**
 * Log levels
 */
export const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

/**
 * Simple logger utility with colored output
 */
export class Logger {
    constructor(level = LogLevel.INFO) {
        this.level = level;
        this.startTime = Date.now();
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error} [error] - Error object
     */
    error(message, error = null) {
        if (this.level >= LogLevel.ERROR) {
            console.error(chalk.red(`❌ ERROR: ${message}`));
            if (error && error.stack) {
                console.error(chalk.red(error.stack));
            }
        }
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     */
    warn(message) {
        if (this.level >= LogLevel.WARN) {
            console.warn(chalk.yellow(`⚠️  WARN: ${message}`));
        }
    }

    /**
     * Log info message
     * @param {string} message - Info message
     */
    info(message) {
        if (this.level >= LogLevel.INFO) {
            console.log(chalk.blue(`ℹ️  INFO: ${message}`));
        }
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     */
    debug(message) {
        if (this.level >= LogLevel.DEBUG) {
            const timestamp = this.getTimestamp();
            console.log(chalk.gray(`🔍 DEBUG [${timestamp}]: ${message}`));
        }
    }

    /**
     * Log success message
     * @param {string} message - Success message
     */
    success(message) {
        console.log(chalk.green(`✅ ${message}`));
    }

    /**
     * Get timestamp string
     * @returns {string} Timestamp
     */
    getTimestamp() {
        const elapsed = Date.now() - this.startTime;
        return `+${elapsed}ms`;
    }

    /**
     * Set log level
     * @param {number} level - Log level
     */
    setLevel(level) {
        this.level = level;
    }
}

// Export default logger instance
export const logger = new Logger();