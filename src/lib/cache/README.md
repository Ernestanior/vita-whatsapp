# Cache Manager

The Cache Manager provides a centralized caching layer using Upstash Redis to reduce AI API calls and improve performance.

## Features

- **Food Recognition Caching**: Cache food recognition results using image SHA256 hash (7 days TTL)
- **User Profile Caching**: Cache user health profiles (1 hour TTL)
- **Common Food Data Caching**: Cache frequently accessed nutrition data (30 days TTL)
- **Metrics Tracking**: Track cache hits, misses, and errors for monitoring
- **Error Handling**: Graceful fallback when cache operations fail

## Usage

### Basic Usage

```typescript
import { cacheManager } from '@/lib/cache';

// Check cache before calling AI API
const imageHash = calculateSHA256(imageBuffer);
const cached = await cacheManager.getFoodRecognition(imageHash);

if (cached) {
  // Use cached result
  return cached;
}

// Call AI API and cache result
const result = await recognizeFood(imageBuffer);
await cacheManager.setFoodRecognition(imageHash, result);
```

### User Profile Caching

```typescript
// Get cached profile
const profile = await cacheManager.getUserProfile(userId);

if (!profile) {
  // Fetch from database
  const profile = await fetchProfileFromDB(userId);
  await cacheManager.setUserProfile(userId, profile);
}

// Invalidate cache after update
await updateProfile(userId, updates);
await cacheManager.invalidateUserProfile(userId);
```

### Common Food Data

```typescript
// Cache frequently accessed food data
const nutrition = await cacheManager.getCommonFood('chicken_rice');

if (!nutrition) {
  const nutrition = await fetchNutritionData('chicken_rice');
  await cacheManager.setCommonFood('chicken_rice', nutrition);
}
```

### Monitoring

```typescript
// Get cache metrics
const metrics = await cacheManager.getMetrics();
console.log(`Cache hit rate: ${metrics.hits / (metrics.hits + metrics.misses) * 100}%`);
```

## Cache Keys

The cache uses the following key prefixes:

- `food:recognition:{imageHash}` - Food recognition results
- `user:profile:{userId}` - User health profiles
- `nutrition:common:{foodName}` - Common food nutrition data
- `metrics:cache:` - Cache performance metrics

## TTL (Time To Live)

- Food Recognition: 7 days
- User Profile: 1 hour
- Common Food: 30 days
- Metrics: 24 hours

## Configuration

Caching can be disabled via environment variable:

```env
ENABLE_CACHING=false
```

## Error Handling

The cache manager is designed to fail gracefully:

- Cache read failures return `null` (fallback to source)
- Cache write failures are logged but don't throw errors
- Metrics failures are silently ignored

This ensures that cache issues never break the application.

## Cost Optimization

By caching food recognition results, we can significantly reduce AI API costs:

- **Without cache**: Every image requires an AI API call (~$0.0004 per call)
- **With cache**: Duplicate images are served from cache (free)
- **Expected savings**: 30-50% reduction in AI API costs

## Monitoring

Track cache performance using the metrics endpoint:

```typescript
const metrics = await cacheManager.getMetrics();

// Calculate hit rate
const hitRate = metrics.hits / (metrics.hits + metrics.misses);

// Alert if hit rate is too low
if (hitRate < 0.2) {
  console.warn('Cache hit rate is below 20%');
}
```

## Best Practices

1. **Always check cache first** before making expensive operations
2. **Invalidate cache** when underlying data changes
3. **Monitor metrics** to ensure cache is effective
4. **Use appropriate TTLs** based on data volatility
5. **Handle errors gracefully** - cache failures shouldn't break the app

## Related

- [Redis Client](../redis/client.ts) - Upstash Redis connection
- [Food Recognition](../food-recognition/recognizer.ts) - Uses cache for results
- [Profile Manager](../profile/profile-manager.ts) - Uses cache for profiles
