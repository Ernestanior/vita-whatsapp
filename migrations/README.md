# Database Migrations

This directory contains SQL migration files for the Vita AI database schema.

## Migration Files

### 001_initial_schema.sql
Creates the initial database schema including:
- 7 tables (users, health_profiles, food_records, subscriptions, usage_quotas, user_feedback, achievements)
- Indexes for query optimization
- Triggers for automatic timestamp updates
- Database functions (increment_usage, get_user_stats)

**Status**: ✅ Applied

### 002_enable_rls.sql
Enables Row Level Security (RLS) and creates access policies:
- Enables RLS on all 7 tables
- Creates 24+ policies for data access control
- Ensures users can only access their own data
- Allows service role to bypass RLS for system operations

**Status**: ⏳ Ready to apply

**Requirements**: 11.1, 11.2

### 003_login_logs.sql
Creates login logging table for security auditing:
- Tracks login attempts and success/failure
- Records IP addresses and user agents
- Enables anomaly detection

**Status**: ⏳ Ready to apply

### 004_feedback_system.sql
User feedback collection system:
- User feedback table with multiple feedback types
- Feedback statistics and analysis functions
- Monthly feedback analysis

**Status**: ⏳ Ready to apply

### 005_gamification_system.sql
Gamification features:
- User streaks tracking
- Achievements system with 10 pre-defined achievements
- Weekly goals
- Optional leaderboard

**Status**: ⏳ Ready to apply

### 006_context_understanding.sql
Smart context and preference learning:
- User food preferences tracking
- Dietary patterns learning
- Meal scene inference

**Status**: ⏳ Ready to apply

### 007_cost_monitoring.sql
API usage tracking and cost monitoring:
- API usage records per user
- Daily cost metrics aggregation
- Budget alerts and warnings

**Status**: ⏳ Ready to apply

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the editor
6. Click **Run** to execute

### Option 2: Supabase CLI

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option 3: Direct SQL Connection

```bash
# Using psql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" < migrations/002_enable_rls.sql
```

## Verification

After applying a migration, run the corresponding verification script:

### Verify Initial Schema
```bash
# In Supabase SQL Editor
-- Run migrations/verify_schema.sql
```

### Verify RLS Setup
```bash
# In Supabase SQL Editor
-- Run migrations/verify_rls.sql

# Or using the Node.js script
npx tsx scripts/verify-rls.ts
```

## Migration Order

Migrations must be applied in order:

1. ✅ `001_initial_schema.sql` - Creates tables and functions
2. ⏳ `002_enable_rls.sql` - Enables RLS and creates policies
3. ⏳ `003_login_logs.sql` - Adds login logging
4. ⏳ `004_feedback_system.sql` - User feedback system
5. ⏳ `005_gamification_system.sql` - Gamification features
6. ⏳ `006_context_understanding.sql` - Context understanding
7. ⏳ `007_cost_monitoring.sql` - Cost monitoring system

## Rollback

If you need to rollback a migration:

### Rollback RLS (002)
```sql
-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE food_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
-- ... (drop all other policies)
```

### Rollback Initial Schema (001)
```sql
-- Drop all tables (cascading will remove dependent objects)
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS usage_quotas CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS food_records CASCADE;
DROP TABLE IF EXISTS health_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS increment_usage;
DROP FUNCTION IF EXISTS get_user_stats;
DROP FUNCTION IF EXISTS update_updated_at_column;
```

## Best Practices

1. **Always backup before migrations**: Use Supabase's backup feature
2. **Test in development first**: Apply migrations to a dev project first
3. **Verify after applying**: Run verification scripts to ensure success
4. **Document changes**: Update this README when adding new migrations
5. **Use transactions**: Wrap migrations in BEGIN/COMMIT for safety

## Troubleshooting

### Error: "relation already exists"
The migration has already been applied. Check the verification script output.

### Error: "permission denied"
Make sure you're using the service role key or have sufficient permissions.

### Error: "syntax error"
Check that you copied the entire migration file without truncation.

### RLS blocking queries
If queries return empty results after enabling RLS:
1. Verify you're authenticated: `await client.auth.getUser()`
2. Check that `auth.uid()` matches the `user_id` in your data
3. Use service role key for backend operations

## Support

For issues with migrations:
1. Check the verification script output
2. Review the migration file for syntax errors
3. Consult the [RLS Setup Guide](../docs/RLS_SETUP.md)
4. Check Supabase logs in the dashboard

## References

- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS Setup Guide](../docs/RLS_SETUP.md)
