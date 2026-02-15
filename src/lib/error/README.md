# Error Handling

Comprehensive error handling and retry logic for Vita AI.

## Features

- Error classification and categorization
- Multi-language error messages
- User-friendly suggestions
- Error logging and alerting
- Exponential backoff retry strategy
- Configurable retry options

## Components

### ErrorHandler

Handles error classification, logging, and user-friendly messaging.

#### Handle Error

```typescript
import { errorHandler } from '@/lib/error';

try {
  await someOperation();
} catch (error) {
  const response = await errorHandler.handleError(
    error,
    {
      userId: 'user-123',
      operation: 'food-recognition',
      metadata: { imageHash: 'abc123' },
    },
    'en' // language
  );

  console.log(`Error ID: ${response.errorId}`);
  console.log(`Message: ${response.message}`);
  console.log(`Suggestion: ${response.suggestion}`);
  console.log(`Retryable: ${response.retryable}`);
}
```

#### Error Types

- `INVALID_INPUT` - User provided invalid data
- `QUOTA_EXCEEDED` - User exceeded usage quota
- `UNSUPPORTED_CONTENT` - Content type not supported
- `AI_API_ERROR` - AI service error
- `DATABASE_ERROR` - Database operation failed
- `STORAGE_ERROR` - File storage error
- `WHATSAPP_API_ERROR` - WhatsApp API error
- `STRIPE_ERROR` - Payment service error
- `TIMEOUT_ERROR` - Operation timed out
- `UNKNOWN_ERROR` - Unclassified error

#### Multi-Language Support

Error messages are available in:
- English (`en`)
- Simplified Chinese (`zh-CN`)
- Traditional Chinese (`zh-TW`)

### RetryManager

Implements exponential backoff retry strategy.

#### Basic Retry

```typescript
import { retryManager } from '@/lib/error';

const result = await retryManager.executeWithRetry(
  async () => {
    return await apiCall();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  }
);
```

#### Retry with Context

```typescript
const result = await retryManager.executeWithRetryAndContext(
  async (context) => {
    console.log(`Attempt ${context.attempt} of ${context.totalAttempts}`);
    return await apiCall();
  },
  {
    maxRetries: 3,
  },
  (context) => {
    console.log(`Retry after ${context.nextDelay}ms`);
  }
);
```

#### Preset Retry Options

```typescript
// Quick retry (2 attempts, short delays)
await retryManager.executeWithRetry(
  operation,
  RetryManager.quickRetry()
);

// Aggressive retry (5 attempts, longer delays)
await retryManager.executeWithRetry(
  operation,
  RetryManager.aggressiveRetry()
);
```

## Error Response Structure

```typescript
interface ErrorResponse {
  errorId: string;        // Unique error identifier
  type: ErrorType;        // Error classification
  message: string;        // User-friendly message
  suggestion?: string;    // Resolution suggestion
  retryable: boolean;     // Whether operation can be retried
}
```

## Retry Options

```typescript
interface RetryOptions {
  maxRetries: number;           // Maximum retry attempts (default: 3)
  initialDelay: number;         // Initial delay in ms (default: 1000)
  maxDelay: number;             // Maximum delay in ms (default: 10000)
  backoffMultiplier: number;    // Backoff multiplier (default: 2)
  retryableErrors?: ErrorType[]; // Specific errors to retry
}
```

## Exponential Backoff

Delays between retries increase exponentially:

- Attempt 1: 1000ms
- Attempt 2: 2000ms
- Attempt 3: 4000ms
- Attempt 4: 8000ms
- Attempt 5: 10000ms (capped at maxDelay)

## Error Logging

All errors are logged with:
- Unique error ID
- User ID (if available)
- Operation name
- Error details
- Stack trace
- Timestamp

## Critical Error Alerts

Critical errors trigger alerts to operations team:
- Database errors
- Storage errors

Alerts are logged and can be integrated with:
- Sentry
- PagerDuty
- Slack
- Email

## Usage Examples

### API Call with Retry

```typescript
import { retryManager, errorHandler } from '@/lib/error';

async function callExternalAPI(userId: string) {
  try {
    return await retryManager.executeWithRetry(
      async () => {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) throw new Error('API request failed');
        return await response.json();
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
      }
    );
  } catch (error) {
    const errorResponse = await errorHandler.handleError(
      error,
      { userId, operation: 'external-api-call' },
      'en'
    );
    
    throw new Error(errorResponse.message);
  }
}
```

### Database Operation with Retry

```typescript
async function saveRecord(data: any) {
  return await retryManager.executeWithRetry(
    async () => {
      return await database.insert(data);
    },
    {
      maxRetries: 3,
      retryableErrors: [ErrorType.DATABASE_ERROR],
    }
  );
}
```

### Image Upload with Retry

```typescript
async function uploadImage(buffer: Buffer) {
  return await retryManager.executeWithRetryAndContext(
    async (context) => {
      logger.info(`Upload attempt ${context.attempt}`);
      return await storage.upload(buffer);
    },
    RetryManager.aggressiveRetry(),
    (context) => {
      logger.warn(`Upload failed, retrying in ${context.nextDelay}ms`);
    }
  );
}
```

## Error Handling Best Practices

1. **Always provide context**: Include userId, operation name, and relevant metadata
2. **Use appropriate language**: Match user's language preference
3. **Log before throwing**: Log errors before re-throwing them
4. **Retry transient errors**: Use retry logic for network and service errors
5. **Don't retry user errors**: Invalid input should not be retried
6. **Set reasonable limits**: Don't retry indefinitely
7. **Provide suggestions**: Help users resolve issues
8. **Monitor critical errors**: Set up alerts for critical failures

## Requirements

- Requirements: 19.1, 19.2, 19.3, 19.6, 19.7, 12.7
- Logging: Uses Pino logger
- Alerting: Integrates with monitoring services

## Testing

See `__tests__/error-handler.test.ts` and `__tests__/retry-manager.test.ts` for unit tests.
