/**
 * Logger Utility
 * Centralized logging with Pino
 * Wrapper supports both calling conventions:
 *   logger.info({obj}, 'message')  — standard pino
 *   logger.info('message', {obj})  — convenience (used throughout codebase)
 */

import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

type LogFn = {
  (msg: string, ...args: unknown[]): void;
  (obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
};

function wrapLogFn(fn: pino.LogFn): LogFn {
  return function (this: pino.Logger, first: unknown, ...rest: unknown[]) {
    if (typeof first === 'string' && rest.length > 0 && typeof rest[0] === 'object' && rest[0] !== null) {
      // logger.info('message', {obj}) → logger.info({obj}, 'message')
      fn.call(this, rest[0] as Record<string, unknown>, first);
    } else {
      fn.call(this, first as string, ...rest);
    }
  } as LogFn;
}

export const logger = {
  trace: wrapLogFn(pinoLogger.trace.bind(pinoLogger)),
  debug: wrapLogFn(pinoLogger.debug.bind(pinoLogger)),
  info: wrapLogFn(pinoLogger.info.bind(pinoLogger)),
  warn: wrapLogFn(pinoLogger.warn.bind(pinoLogger)),
  error: wrapLogFn(pinoLogger.error.bind(pinoLogger)),
  fatal: wrapLogFn(pinoLogger.fatal.bind(pinoLogger)),
  child: pinoLogger.child.bind(pinoLogger),
  level: pinoLogger.level,
} as const;

export default logger;
