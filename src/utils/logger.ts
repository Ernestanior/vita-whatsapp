/**
 * Logger Utility
 * Centralized logging with Pino
 * Simplified version without pino-pretty to avoid Edge Runtime issues
 */

import pino from 'pino';

// Create logger instance without transport (works in all environments)
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Log levels:
 * - trace: Very detailed logs
 * - debug: Debug information
 * - info: General information
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors
 */

export default logger;
