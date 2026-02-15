/**
 * Retry Manager
 * Implements exponential backoff retry strategy
 * Requirements: 12.7
 */

import { logger } from '@/utils/logger';
import { ErrorType } from '@/types';

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorType[];
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError?: Error;
  nextDelay?: number;
}

export class RetryManager {
  private readonly DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    retryableErrors: [
      ErrorType.AI_API_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.STORAGE_ERROR,
      ErrorType.WHATSAPP_API_ERROR,
      ErrorType.STRIPE_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.UNKNOWN_ERROR,
    ],
  };

  /**
   * Execute operation with retry logic
   * Requirements: 12.7
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        logger.info({ attempt, maxRetries: opts.maxRetries }, 'Executing operation');
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(lastError, opts.retryableErrors)) {
          logger.warn({ error: lastError.message, attempt }, 'Non-retryable error, aborting');
          throw lastError;
        }

        // Last attempt failed
        if (attempt === opts.maxRetries) {
          logger.error(
            { error: lastError.message, attempts: attempt + 1 },
            'All retry attempts failed'
          );
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, opts);

        logger.warn(
          {
            error: lastError.message,
            attempt: attempt + 1,
            maxRetries: opts.maxRetries,
            nextDelay: delay,
          },
          'Operation failed, retrying'
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation with retry and context callback
   * Requirements: 12.7
   */
  async executeWithRetryAndContext<T>(
    operation: (context: RetryContext) => Promise<T>,
    options?: Partial<RetryOptions>,
    onRetry?: (context: RetryContext) => void
  ): Promise<T> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      const context: RetryContext = {
        attempt: attempt + 1,
        totalAttempts: opts.maxRetries + 1,
        lastError,
      };

      try {
        return await operation(context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!this.isRetryableError(lastError, opts.retryableErrors)) {
          throw lastError;
        }

        if (attempt === opts.maxRetries) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, opts);
        context.lastError = lastError;
        context.nextDelay = delay;

        // Call retry callback
        if (onRetry) {
          onRetry(context);
        }

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Check if error is retryable
   * Requirements: 12.7
   */
  private isRetryableError(error: Error, retryableErrors?: ErrorType[]): boolean {
    if (!retryableErrors || retryableErrors.length === 0) {
      return true; // Retry all errors if no specific list provided
    }

    const message = error.message.toLowerCase();

    // Check if error message matches any retryable error type
    for (const errorType of retryableErrors) {
      const typeStr = errorType.toLowerCase().replace(/_/g, ' ');
      if (message.includes(typeStr)) {
        return true;
      }
    }

    // Check for common retryable patterns
    const retryablePatterns = [
      'timeout',
      'timed out',
      'rate limit',
      'too many requests',
      'service unavailable',
      'temporarily unavailable',
      'connection',
      'network',
      'econnrefused',
      'enotfound',
      'etimedout',
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calculate delay with exponential backoff
   * Requirements: 12.7
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
    return Math.min(delay, options.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create retry options with custom settings
   */
  static createOptions(overrides: Partial<RetryOptions>): RetryOptions {
    return {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...overrides,
    };
  }

  /**
   * Quick retry (for fast operations)
   */
  static quickRetry(): RetryOptions {
    return {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 2000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Aggressive retry (for critical operations)
   */
  static aggressiveRetry(): RetryOptions {
    return {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };
  }
}

export const retryManager = new RetryManager();
