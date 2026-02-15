# Row Level Security (RLS) Setup Guide

## Overview

Row Level Security (RLS) is a PostgreSQL feature that allows you to control which rows users can access in database tables. This document explains how RLS is configured in the Vita AI project to ensure data privacy and security.

## Requirements

- **Requirement 11.1**: The system SHALL use AES-256 encryption to store all user health data
- **Requirement 11.2**: The system SHALL comply with Singapore's Personal Data Protection Act (PDPA)

## What is RLS?

RLS adds an additional layer of security by restricting which rows a user can see or modify based on policies. Even if someone gains access to the database, they can only see data they're authorized to access.

## Tables with RLS Enabled

All 7 main tables have RLS enabled:

1. `users` - User account information
2. `health_profiles` - User health data
3. `food_records` - Food recognition history
4. `subscriptions` - Subscription information
5. `usage_quotas` - Daily usage limits
6. `user_feedback` - User feedback submissions
7. `achievements` - User achievements

## Policy Structure

Each table has policies for different operations:

### Users Table (3 policies)
- **SELECT**: Users can view their own data
- **UPDATE**: Users can update their own data
- **INSERT**: Users can insert their own data (registration)

### Health Profiles Table (4 policies)
- **SELECT**: Users can view their own profile
- **UPDATE**: Users can update their own profile
- **INSERT**: Users can create their own profile
- **DELETE**: Users can delete their own profile

### Food Records Table (4 policies)
- **SELECT**: Users can view their own records
- **INSERT**: Users can create their own records
- **UPDATE**: Users can update their own records
- **DELETE**: Users can delete their own records

### Subscriptions Table (3 policies)
- **SELECT**: Users can view their own subscription
- **INSERT**: Users can create their own subscription
- **UPDATE**: Users can update their own subscription

### Usage Quotas Table (3 policies)
- **SELECT**: Users can view their own quotas
- **INSERT**: Users can create their own quotas
- **UPDATE**: Users can update their own quotas

### User Feedback Table (4 policies)
- **SELECT**: Users can view their own feedback
- **INSERT**: Users can submit their own feedback
- **UPDATE**: Users can update their own feedback
- **DELETE**: Users can delete their own feedback

### Achievements Table (3 policies)
- **SELECT**: Users can view their own achievements
- **INSERT**: Users can earn their own achievements
- **DELETE**: Users can delete their own achievements

## How RLS Works

### Authentication

RLS policies use Supabase's `auth.uid()` function to identify the current user. This function returns the UUID of the authenticated user.

### Policy Example

```sql
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);
```

This policy means:
- **Table**: `users`
- **Operation**: SELECT (read)
- **Condition**: The authenticated user's ID must match the row's `id` column

### Service Role Bypass

The service role (using `SUPABASE_SERVICE_KEY`) automatically bypasses RLS. This allows backend functions to:
- Perform operations on behalf of users
- Access data for system operations (e.g., daily digest generation)
- Manage user data during registration

## Migration Files

### 002_enable_rls.sql

This migration file:
1. Enables RLS on all tables
2. Creates policies for each table
3. Adds comments for documentation

### verify_rls.sql

This verification script checks:
1. RLS is enabled on all tables
2. All expected policies exist
3. Policies have correct operations
4. Policy count matches expectations

## Testing RLS

### Running Tests

```bash
npm test src/lib/database/__tests__/rls.test.ts
```

### Test Coverage

The test suite verifies:
1. RLS is enabled on all 7 tables
2. Each table has the correct number of policies
3. Policies cover all required operations
4. Anonymous users cannot access data
5. Service role can bypass RLS

## Applying Migrations

### Step 1: Apply RLS Migration

In Supabase Dashboard:
1. Go to SQL Editor
2. Open `migrations/002_enable_rls.sql`
3. Execute the migration

Or using Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify RLS Setup

In Supabase Dashboard:
1. Go to SQL Editor
2. Open `migrations/verify_rls.sql`
3. Execute the verification script
4. Check that all checks show "✓ PASS"

## Security Best Practices

### 1. Always Use Authenticated Clients

```typescript
// ❌ Bad: Using anon key without authentication
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data } = await client.from('users').select('*');
// Returns empty array - no access

// ✅ Good: Using authenticated client
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await client.auth.signInWithOtp({ phone: '+6591234567' });
const { data } = await client.from('users').select('*');
// Returns user's own data
```

### 2. Use Service Role for Backend Operations

```typescript
// Backend function
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Can access all data for system operations
const { data } = await serviceClient
  .from('users')
  .select('*, health_profiles(*)')
  .eq('id', userId);
```

### 3. Never Expose Service Key

```typescript
// ❌ Bad: Exposing service key to frontend
const client = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ✅ Good: Use anon key in frontend
const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: Trying to insert data for another user

**Solution**: Ensure `user_id` matches `auth.uid()`

```typescript
// ❌ Bad
await client.from('food_records').insert({
  user_id: 'some-other-user-id', // Will fail
  image_url: '...',
});

// ✅ Good
const { data: { user } } = await client.auth.getUser();
await client.from('food_records').insert({
  user_id: user.id, // Matches authenticated user
  image_url: '...',
});
```

### Issue: "permission denied for table"

**Cause**: RLS is enabled but no policies exist

**Solution**: Apply the RLS migration

```bash
supabase db push
```

### Issue: Empty results when data exists

**Cause**: Not authenticated or wrong user

**Solution**: Verify authentication

```typescript
const { data: { user } } = await client.auth.getUser();
console.log('Authenticated as:', user?.id);
```

## Monitoring RLS

### Check RLS Status

```sql
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All Policies

```sql
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Count Policies Per Table

```sql
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

## Compliance

### PDPA Compliance

RLS helps ensure PDPA compliance by:

1. **Data Minimization**: Users can only access their own data
2. **Access Control**: Strict policies prevent unauthorized access
3. **Audit Trail**: All access is logged by Supabase
4. **Data Isolation**: User data is logically separated

### Data Deletion

When a user requests data deletion:

```typescript
// Service role can delete all user data
const { error } = await serviceClient
  .from('users')
  .delete()
  .eq('id', userId);

// Cascading deletes will remove:
// - health_profiles
// - food_records
// - subscriptions
// - usage_quotas
// - user_feedback
// - achievements
```

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Singapore PDPA](https://www.pdpc.gov.sg/Overview-of-PDPA/The-Legislation/Personal-Data-Protection-Act)

## Summary

RLS is a critical security feature that:
- ✅ Protects user data at the database level
- ✅ Ensures users can only access their own data
- ✅ Allows service role to perform system operations
- ✅ Helps maintain PDPA compliance
- ✅ Provides defense in depth security

All 7 tables have RLS enabled with 24+ policies covering all necessary operations.
