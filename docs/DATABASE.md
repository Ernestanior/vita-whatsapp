# Database Documentation

This document describes the Vita AI database schema, its design decisions, and how to work with it.

## Overview

The database uses PostgreSQL (via Supabase) with the following key features:
- UUID primary keys for scalability
- JSONB columns for flexible data storage
- Row Level Security (RLS) for data protection
- Automatic timestamp management with triggers
- Stored procedures for common operations

## Schema Design

### Entity Relationship Diagram

```
users (1) ──── (1) health_profiles
  │
  ├── (1:N) food_records
  ├── (1:N) subscriptions
  ├── (1:N) usage_quotas
  ├── (1:N) user_feedback
  └── (1:N) achievements
```

## Tables

### users
Stores user account information and preferences.

**Columns:**
- `id` (UUID, PK) - Unique user identifier
- `phone_number` (VARCHAR, UNIQUE) - WhatsApp phone number
- `whatsapp_name` (VARCHAR, NULL) - User's WhatsApp display name
- `language` (VARCHAR) - Preferred language (en, zh-CN, zh-TW)
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- Primary key on `id`
- Unique constraint on `phone_number`

### health_profiles
Stores user health information for personalized recommendations.

**Columns:**
- `user_id` (UUID, PK, FK) - References users.id
- `height` (INTEGER) - Height in cm (100-250)
- `weight` (DECIMAL) - Weight in kg (30-300)
- `age` (INTEGER, NULL) - Age in years (10-120)
- `gender` (VARCHAR, NULL) - Gender (male, female)
- `goal` (VARCHAR) - Health goal (lose-weight, gain-muscle, control-sugar, maintain)
- `activity_level` (VARCHAR) - Activity level (sedentary, light, moderate, active)
- `digest_time` (TIME) - Preferred time for daily digest (default: 21:00)
- `quick_mode` (BOOLEAN) - Enable quick mode (default: false)
- `created_at` (TIMESTAMP) - Profile creation time
- `updated_at` (TIMESTAMP) - Last update time

**Constraints:**
- Height: 100-250 cm
- Weight: 30-300 kg
- Age: 10-120 years
- Goal: Must be one of the valid goal types
- Activity level: Must be one of the valid activity levels

### food_records
Stores food recognition results and health ratings.

**Columns:**
- `id` (UUID, PK) - Unique record identifier
- `user_id` (UUID, FK) - References users.id
- `image_url` (TEXT) - URL to stored food image
- `image_hash` (VARCHAR) - SHA256 hash of image (for caching)
- `recognition_result` (JSONB) - AI recognition result
- `health_rating` (JSONB) - Health evaluation result
- `meal_context` (VARCHAR, NULL) - Meal type (breakfast, lunch, dinner, snack)
- `created_at` (TIMESTAMP) - Record creation time

**Indexes:**
- Primary key on `id`
- Composite index on `(user_id, created_at DESC)` for efficient user history queries
- Index on `image_hash` for cache lookups

**JSONB Structure:**

`recognition_result`:
```json
{
  "foods": [
    {
      "name": "Chicken Rice",
      "nameLocal": "海南鸡饭",
      "confidence": 85,
      "portion": "1 plate",
      "nutrition": {
        "calories": { "min": 500, "max": 600 },
        "protein": { "min": 25, "max": 30 },
        "carbs": { "min": 60, "max": 70 },
        "fat": { "min": 15, "max": 20 },
        "sodium": { "min": 800, "max": 1000 }
      }
    }
  ],
  "totalNutrition": { /* same structure as nutrition */ },
  "mealContext": "lunch"
}
```

`health_rating`:
```json
{
  "overall": "yellow",
  "score": 65,
  "factors": [
    {
      "name": "Sodium",
      "status": "moderate",
      "message": "Sodium content is slightly high"
    }
  ],
  "suggestions": [
    "Drink less soup to reduce sodium intake",
    "Add more vegetables for fiber"
  ]
}
```

### subscriptions
Manages user subscription tiers and payment status.

**Columns:**
- `id` (UUID, PK) - Unique subscription identifier
- `user_id` (UUID, FK) - References users.id
- `tier` (VARCHAR) - Subscription tier (free, premium, pro)
- `status` (VARCHAR) - Subscription status (active, cancelled, expired)
- `current_period_start` (TIMESTAMP) - Current billing period start
- `current_period_end` (TIMESTAMP) - Current billing period end
- `stripe_subscription_id` (VARCHAR, UNIQUE, NULL) - Stripe subscription ID
- `stripe_customer_id` (VARCHAR, NULL) - Stripe customer ID
- `created_at` (TIMESTAMP) - Subscription creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- Primary key on `id`
- Composite index on `(user_id, status)` for active subscription queries
- Unique constraint on `stripe_subscription_id`

**Subscription Tiers:**
- **Free**: 3 recognitions per day
- **Premium**: Unlimited recognitions + daily digest
- **Pro**: All Premium features + advanced analytics

### usage_quotas
Tracks daily usage limits for free tier users.

**Columns:**
- `user_id` (UUID, FK) - References users.id
- `date` (DATE) - Date of usage
- `recognitions_used` (INTEGER) - Number of recognitions used
- `recognitions_limit` (INTEGER) - Daily limit (default: 3)
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- Composite primary key on `(user_id, date)`
- Index on `(user_id, date)` for efficient daily quota checks

### user_feedback
Collects user feedback on recognition accuracy.

**Columns:**
- `id` (UUID, PK) - Unique feedback identifier
- `user_id` (UUID, FK) - References users.id
- `food_record_id` (UUID, FK, NULL) - References food_records.id
- `feedback_type` (VARCHAR) - Type (accurate, inaccurate, suggestion)
- `correct_food_name` (TEXT, NULL) - User-provided correct food name
- `comment` (TEXT, NULL) - Additional comments
- `created_at` (TIMESTAMP) - Feedback creation time

**Indexes:**
- Primary key on `id`
- Index on `user_id` for user feedback history
- Index on `food_record_id` for record-specific feedback

### achievements
Tracks user achievements and milestones.

**Columns:**
- `id` (UUID, PK) - Unique achievement identifier
- `user_id` (UUID, FK) - References users.id
- `achievement_type` (VARCHAR) - Type of achievement
- `achieved_at` (TIMESTAMP) - Achievement unlock time

**Constraints:**
- Unique constraint on `(user_id, achievement_type)` to prevent duplicates

## Database Functions

### increment_usage(p_user_id UUID, p_date DATE)
Increments the daily recognition usage count for a user.

**Usage:**
```sql
SELECT increment_usage('user-uuid-here', '2024-01-15');
```

**TypeScript:**
```typescript
import { incrementUsage } from '@/lib/database';
await incrementUsage(userId, '2024-01-15');
```

### get_user_stats(p_user_id UUID, p_start_date DATE, p_end_date DATE)
Retrieves aggregated statistics for a user within a date range.

**Returns:**
- `total_meals` - Total number of meals recorded
- `avg_calories` - Average calories per meal
- `green_count` - Number of green (healthy) ratings
- `yellow_count` - Number of yellow (moderate) ratings
- `red_count` - Number of red (unhealthy) ratings

**Usage:**
```sql
SELECT * FROM get_user_stats('user-uuid-here', '2024-01-01', '2024-01-31');
```

**TypeScript:**
```typescript
import { getUserStats } from '@/lib/database';
const stats = await getUserStats(userId, '2024-01-01', '2024-01-31');
```

## TypeScript Usage

### Import Types and Functions

```typescript
import {
  User,
  HealthProfile,
  FoodRecord,
  incrementUsage,
  getUserStats,
  checkDailyQuota,
  calculateBMI,
  calculateDailyCalories,
} from '@/lib/database';
```

### Check Daily Quota

```typescript
const quota = await checkDailyQuota(userId);
if (!quota.hasQuota) {
  console.log('User has exceeded daily quota');
  console.log(`Remaining: ${quota.remaining}/${quota.limit}`);
}
```

### Calculate Health Metrics

```typescript
const bmi = calculateBMI(170, 70); // height: 170cm, weight: 70kg
console.log(`BMI: ${bmi.toFixed(1)}`); // BMI: 24.2

const dailyCalories = calculateDailyCalories({
  height: 170,
  weight: 70,
  age: 30,
  gender: 'male',
  activity_level: 'moderate',
  goal: 'maintain',
});
console.log(`Daily calories: ${dailyCalories}`); // Daily calories: 2403
```

### Get User Statistics

```typescript
import { getUserStats, getDateRange } from '@/lib/database';

// Get stats for the last week
const { startDate, endDate } = getDateRange('week');
const stats = await getUserStats(userId, startDate, endDate);

console.log(`Total meals: ${stats.total_meals}`);
console.log(`Average calories: ${stats.avg_calories}`);
console.log(`Green ratings: ${stats.green_count}`);
```

## Triggers

### update_updated_at_column()
Automatically updates the `updated_at` timestamp when a row is modified.

**Applied to:**
- users
- health_profiles
- subscriptions
- usage_quotas

## Best Practices

### 1. Always Use Type-Safe Functions

```typescript
// ✅ Good - Type-safe
import { incrementUsage } from '@/lib/database';
await incrementUsage(userId);

// ❌ Bad - Direct RPC call without types
await supabase.rpc('increment_usage', { p_user_id: userId });
```

### 2. Validate Data Before Insert

```typescript
import { validateHealthProfile } from '@/lib/database';

const validation = validateHealthProfile({ height: 170, weight: 70, age: 30 });
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}
```

### 3. Use Date Helpers for Consistency

```typescript
import { getDateRange, getSingaporeTime } from '@/lib/database';

// Get current Singapore time
const now = getSingaporeTime();

// Get date ranges
const { startDate, endDate } = getDateRange('month');
```

### 4. Handle JSONB Data Properly

```typescript
// When inserting food records
const foodRecord: FoodRecordInsert = {
  user_id: userId,
  image_url: imageUrl,
  image_hash: hash,
  recognition_result: {
    foods: [...],
    totalNutrition: {...},
    mealContext: 'lunch',
  },
  health_rating: {
    overall: 'green',
    score: 85,
    factors: [...],
    suggestions: [...],
  },
};
```

## Migration Guide

### Applying Migrations

See [migrations/README.md](../migrations/README.md) for detailed instructions.

### Verifying Schema

After applying migrations, run the verification script:

```bash
psql "your-connection-string" -f migrations/verify_schema.sql
```

## Performance Considerations

### Indexes
All frequently queried columns have indexes:
- User lookups by phone number
- Food records by user and date
- Subscription status checks
- Image hash lookups for caching

### JSONB Queries
When querying JSONB columns, use the appropriate operators:

```sql
-- Get records with green rating
SELECT * FROM food_records 
WHERE health_rating->>'overall' = 'green';

-- Get records with high calories
SELECT * FROM food_records 
WHERE (recognition_result->'totalNutrition'->'calories'->>'min')::INTEGER > 1000;
```

### Pagination
Always use pagination for large result sets:

```typescript
const { data, count } = await supabase
  .from('food_records')
  .select('*', { count: 'exact' })
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 9); // First 10 records
```

## Security

### Row Level Security (RLS)
RLS policies ensure users can only access their own data. See task 2.2 for RLS implementation details.

### Data Encryption
Sensitive data is encrypted at rest using AES-256 encryption (handled by Supabase).

### API Security
- All database access goes through Supabase's secure API
- Service role key is only used in server-side code
- Client-side code uses anon key with RLS protection

## Troubleshooting

### Common Issues

**Issue: Function not found**
```
ERROR: function increment_usage(uuid, date) does not exist
```
**Solution:** Run the migration script to create the function.

**Issue: RLS policy blocking query**
```
ERROR: new row violates row-level security policy
```
**Solution:** Ensure you're using the correct authentication context or service role key.

**Issue: JSONB query not working**
```
ERROR: operator does not exist: jsonb = text
```
**Solution:** Use the correct JSONB operators (`->`, `->>`, `@>`, etc.)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)


## Row Level Security (RLS)

### Overview

Row Level Security (RLS) is enabled on all tables to ensure data privacy and security. RLS policies restrict which rows users can access based on their authentication status.

**Requirements:** 11.1, 11.2

### RLS Status

All 7 tables have RLS enabled:
- ✅ users
- ✅ health_profiles
- ✅ food_records
- ✅ subscriptions
- ✅ usage_quotas
- ✅ user_feedback
- ✅ achievements

### Policy Structure

Each table has policies for different operations (SELECT, INSERT, UPDATE, DELETE). All policies use `auth.uid()` to ensure users can only access their own data.

**Example Policy:**
```sql
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);
```

This policy ensures:
- Users can only SELECT rows where their authenticated user ID matches the row's ID
- Unauthenticated users cannot access any data
- Service role bypasses RLS for system operations

### Policy Count by Table

| Table | Policies | Operations |
|-------|----------|------------|
| users | 3 | SELECT, UPDATE, INSERT |
| health_profiles | 4 | SELECT, UPDATE, INSERT, DELETE |
| food_records | 4 | SELECT, UPDATE, INSERT, DELETE |
| subscriptions | 3 | SELECT, UPDATE, INSERT |
| usage_quotas | 3 | SELECT, UPDATE, INSERT |
| user_feedback | 4 | SELECT, UPDATE, INSERT, DELETE |
| achievements | 3 | SELECT, INSERT, DELETE |

**Total:** 24 policies

### Using RLS in Code

#### Client-Side (with Authentication)

```typescript
import { createClient } from '@supabase/supabase-js';

// Create client with anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Authenticate user
await supabase.auth.signInWithOtp({ phone: '+6591234567' });

// Now queries are restricted by RLS
const { data: myRecords } = await supabase
  .from('food_records')
  .select('*');
// Returns only the authenticated user's records
```

#### Server-Side (Service Role)

```typescript
import { createClient } from '@supabase/supabase-js';

// Create client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Can access all data for system operations
const { data: allUsers } = await supabase
  .from('users')
  .select('*');
// Returns all users (RLS bypassed)
```

### Testing RLS

#### Verify RLS is Enabled

```bash
# Run verification script
npx tsx scripts/verify-rls.ts
```

#### Manual Verification

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- List all policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

### RLS Migration

The RLS policies are defined in `migrations/002_enable_rls.sql`.

**To apply:**
1. Go to Supabase Dashboard > SQL Editor
2. Open `migrations/002_enable_rls.sql`
3. Execute the migration
4. Run `migrations/verify_rls.sql` to verify

**To verify:**
```bash
npx tsx scripts/verify-rls.ts
```

### Security Benefits

1. **Defense in Depth**: Even if authentication is bypassed, RLS prevents unauthorized data access
2. **Data Isolation**: Users cannot see or modify other users' data
3. **PDPA Compliance**: Helps meet Singapore's Personal Data Protection Act requirements
4. **Audit Trail**: All access is logged by Supabase

### Common RLS Issues

#### Issue: Empty Results Despite Data Existing

**Cause:** Not authenticated or wrong user

**Solution:**
```typescript
// Check authentication
const { data: { user } } = await supabase.auth.getUser();
console.log('Authenticated as:', user?.id);

// Ensure user_id matches
const { data } = await supabase
  .from('food_records')
  .select('*')
  .eq('user_id', user.id); // Explicitly filter by user_id
```

#### Issue: "new row violates row-level security policy"

**Cause:** Trying to insert data for another user

**Solution:**
```typescript
// ❌ Bad - user_id doesn't match auth.uid()
await supabase.from('food_records').insert({
  user_id: 'some-other-user-id',
  image_url: '...',
});

// ✅ Good - user_id matches authenticated user
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('food_records').insert({
  user_id: user.id,
  image_url: '...',
});
```

#### Issue: Service Role Queries Failing

**Cause:** Using anon key instead of service role key

**Solution:**
```typescript
// ❌ Bad - anon key with RLS
const supabase = createClient(url, anonKey);

// ✅ Good - service role key (bypasses RLS)
const supabase = createClient(url, serviceKey);
```

### RLS Best Practices

1. **Always authenticate before queries**: Ensure `auth.uid()` is set
2. **Use service role for backend**: System operations should use service role key
3. **Never expose service key**: Keep service role key server-side only
4. **Test with different users**: Verify users can't access each other's data
5. **Monitor RLS violations**: Check Supabase logs for policy violations

### Additional Resources

- [RLS Setup Guide](./RLS_SETUP.md) - Detailed RLS documentation
- [Migration README](../migrations/README.md) - How to apply migrations
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
