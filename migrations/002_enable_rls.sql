-- Vita AI Database Schema
-- Migration: 002_enable_rls
-- Description: Enable Row Level Security (RLS) and create access policies
-- Requirements: 11.1, 11.2

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own data (for registration)
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- HEALTH PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own health profile
CREATE POLICY "Users can view own profile" ON health_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own health profile
CREATE POLICY "Users can update own profile" ON health_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own health profile
CREATE POLICY "Users can insert own profile" ON health_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own health profile
CREATE POLICY "Users can delete own profile" ON health_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FOOD RECORDS TABLE POLICIES
-- ============================================================================

-- Users can view their own food records
CREATE POLICY "Users can view own records" ON food_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own food records
CREATE POLICY "Users can insert own records" ON food_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own food records
CREATE POLICY "Users can update own records" ON food_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own food records
CREATE POLICY "Users can delete own records" ON food_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial setup)
CREATE POLICY "Users can insert own subscription" ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USAGE QUOTAS TABLE POLICIES
-- ============================================================================

-- Users can view their own usage quotas
CREATE POLICY "Users can view own quotas" ON usage_quotas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage quotas
CREATE POLICY "Users can insert own quotas" ON usage_quotas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage quotas
CREATE POLICY "Users can update own quotas" ON usage_quotas
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER FEEDBACK TABLE POLICIES
-- ============================================================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback" ON user_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback" ON user_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ACHIEVEMENTS TABLE POLICIES
-- ============================================================================

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own achievements
CREATE POLICY "Users can insert own achievements" ON achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own achievements
CREATE POLICY "Users can delete own achievements" ON achievements
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================

-- Note: Service role (using service_role key) bypasses RLS automatically
-- This allows backend functions to perform operations on behalf of users

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view own data" ON users IS 
  'Allows users to view their own user record';

COMMENT ON POLICY "Users can view own profile" ON health_profiles IS 
  'Allows users to view their own health profile';

COMMENT ON POLICY "Users can view own records" ON food_records IS 
  'Allows users to view their own food recognition records';

COMMENT ON POLICY "Users can view own subscription" ON subscriptions IS 
  'Allows users to view their own subscription details';

COMMENT ON POLICY "Users can view own quotas" ON usage_quotas IS 
  'Allows users to view their own usage quotas';

COMMENT ON POLICY "Users can view own feedback" ON user_feedback IS 
  'Allows users to view their own feedback submissions';

COMMENT ON POLICY "Users can view own achievements" ON achievements IS 
  'Allows users to view their own achievements';
