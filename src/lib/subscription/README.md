# Subscription Manager

Manages user subscriptions, usage quotas, and upgrade prompts for Vita AI.

## Features

- **Quota Management**: Check and enforce daily recognition limits for free users
- **Subscription Tiers**: Support for Free, Premium, and Pro tiers
- **Usage Tracking**: Track daily usage and provide statistics
- **Upgrade Prompts**: Generate localized upgrade messages

## Usage

### Check Quota

```typescript
import { SubscriptionManager } from '@/lib/subscription';

const manager = new SubscriptionManager();

// Check if user can perform recognition
const result = await manager.checkQuota(userId);

if (!result.allowed) {
  // Show upgrade prompt
  const prompt = await manager.getUpgradePrompt(userId, 'en');
  console.log(prompt);
} else {
  // Proceed with recognition
  console.log(`Remaining: ${result.remaining}/${result.limit}`);
}
```

### Increment Usage

```typescript
// After successful recognition
await manager.incrementUsage(userId);
```

### Get Subscription

```typescript
const subscription = await manager.getSubscription(userId);
console.log(`Tier: ${subscription.tier}`);
console.log(`Status: ${subscription.status}`);
```

### Get Usage Statistics

```typescript
// Get last 7 days of usage
const stats = await manager.getUsageStats(userId, 7);
stats.forEach((day) => {
  console.log(`${day.date}: ${day.recognitionsUsed}/${day.recognitionsLimit}`);
});
```

## Subscription Tiers

### Free
- 3 recognitions per day
- Basic food recognition
- Nutrition info
- Health rating

### Premium
- Unlimited recognitions
- Daily health summaries
- History tracking
- Advanced analytics

### Pro
- All Premium features
- Priority support
- Advanced insights
- Custom reports

## Requirements

- Requirements: 7.1, 7.2, 7.8
- Database tables: `subscriptions`, `usage_quotas`
- Database function: `increment_usage`

## Error Handling

All methods throw errors with descriptive messages:

```typescript
try {
  await manager.checkQuota(userId);
} catch (error) {
  console.error('Quota check failed:', error.message);
}
```

## Testing

See `__tests__/subscription-manager.test.ts` for unit tests.
