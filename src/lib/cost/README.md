# Cost Management Module

This module provides cost optimization and monitoring for AI API usage in Vita AI.

## Components

### CostOptimizer

Optimizes AI API costs through intelligent strategies:

- **Model Selection**: Chooses appropriate AI model based on user tier
- **Image Optimization**: Compresses images before API calls to reduce token usage
- **Caching**: Checks cache before making API calls
- **Cost Tracking**: Records API usage and costs

**Usage:**

```typescript
import { costOptimizer } from '@/lib/cost';

// Optimize an API call
const { result, metrics } = await costOptimizer.optimizeAPICall(
  async () => {
    // Your API call here
    return await recognizeFood(imageBuffer);
  },
  {
    userId: 'user-123',
    userTier: 'premium',
    imageBuffer: imageBuffer,
    cacheKey: imageHash,
  }
);

// Calculate cost
const cost = costOptimizer.calculateCost('gpt-4o-mini', 1500, 300);

// Optimize image
const optimizedImage = await costOptimizer.optimizeImage(imageBuffer);
```

### CostMonitor

Monitors and tracks AI API costs:

- **Daily Cost Tracking**: Calculates daily cost metrics
- **Abnormal Usage Detection**: Identifies users with unusual API usage
- **Budget Alerts**: Sends alerts when budget is exceeded
- **Cost Reports**: Generates cost reports and analytics

**Usage:**

```typescript
import { costMonitor } from '@/lib/cost';

// Track an API call
await costMonitor.trackAPICall({
  userId: 'user-123',
  model: 'gpt-4o-mini',
  inputTokens: 1500,
  outputTokens: 300,
  cached: false,
  duration: 2500,
});

// Get daily metrics
const metrics = await costMonitor.calculateDailyMetrics('2024-01-15');

// Check budget status
const status = await costMonitor.getBudgetStatus();
console.log(`Budget: $${status.dailyBudget}, Spent: $${status.currentSpend}`);

// Get user cost summary
const summary = await costMonitor.getUserCostSummary('user-123', 30);
```

## Database Schema

The cost monitoring system requires the following database tables:

### api_usage

Tracks individual API calls:

```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  model VARCHAR(50) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  duration INTEGER NOT NULL, -- milliseconds
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_api_usage_user_date (user_id, date),
  INDEX idx_api_usage_date (date)
);
```

### cost_metrics

Stores daily aggregated metrics:

```sql
CREATE TABLE cost_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_api_calls INTEGER NOT NULL,
  total_input_tokens BIGINT NOT NULL,
  total_output_tokens BIGINT NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  cost_per_user DECIMAL(10, 4) NOT NULL,
  cache_hit_rate DECIMAL(5, 4) NOT NULL,
  unique_users INTEGER NOT NULL,
  model_breakdown JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_cost_metrics_date (date)
);
```

### cost_alerts

Stores budget alerts and warnings:

```sql
CREATE TABLE cost_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_cost_alerts_created (created_at DESC)
);
```

## Configuration

Set the following environment variables:

```env
# Maximum daily cost in USD
MAX_DAILY_COST=100

# Enable cost optimization
ENABLE_COST_OPTIMIZATION=true

# Enable caching
ENABLE_CACHING=true
```

## Cost Estimation

### GPT-4o-mini Pricing

- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

### Single Food Recognition Cost

- Image tokens: ~1000 tokens
- Prompt tokens: ~500 tokens
- Output tokens: ~300 tokens
- **Total cost: ~$0.0004 per recognition**

### Monthly Cost Estimation (1000 active users)

- Assumptions:
  - 3 recognitions per user per day
  - 30% cache hit rate
  - 70% actual API calls

- API calls: 1000 × 3 × 0.7 × 30 = 63,000 calls/month
- AI API cost: 63,000 × $0.0004 = **$25.20/month**
- Other costs (Supabase, Vercel, WhatsApp): ~$50/month
- **Total: ~$75/month**

## Monitoring

### Daily Cost Tracking

The system automatically tracks daily costs and sends alerts when:

1. Daily budget is exceeded
2. Abnormal user usage is detected (>$10/day per user)
3. High error rate is detected (>5%)

### Metrics Dashboard

Access cost metrics through:

```typescript
// Get metrics for date range
const metrics = await costMonitor.getMetricsForRange('2024-01-01', '2024-01-31');

// Get user cost summary
const userSummary = await costMonitor.getUserCostSummary('user-123', 30);
```

## Best Practices

1. **Always use caching**: Check cache before making API calls
2. **Optimize images**: Compress images to reduce token usage
3. **Choose appropriate models**: Use GPT-4o-mini for most cases
4. **Monitor costs**: Set up alerts for budget overruns
5. **Track metrics**: Regularly review cost metrics and optimize

## Troubleshooting

### High costs

1. Check cache hit rate - should be >30%
2. Review image optimization - images should be <1MB
3. Identify abnormal users with high API usage
4. Consider implementing rate limiting

### Low cache hit rate

1. Verify Redis is properly configured
2. Check cache TTL settings
3. Ensure image hashing is working correctly
4. Review cache invalidation logic

## Future Improvements

1. Implement predictive cost modeling
2. Add per-user cost limits
3. Implement dynamic model selection based on cost
4. Add cost optimization recommendations
5. Create cost analytics dashboard
