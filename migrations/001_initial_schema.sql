-- Vita AI Database Schema
-- Migration: 001_initial_schema
-- Description: Create initial database tables, indexes, RLS policies, and functions
-- Requirements: 4.1, 4.2, 7.1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  whatsapp_name VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'zh-CN', 'zh-TW')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Health profiles table
CREATE TABLE health_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height INTEGER NOT NULL CHECK (height BETWEEN 100 AND 250),
  weight DECIMAL(5,2) NOT NULL CHECK (weight BETWEEN 30 AND 300),
  age INTEGER CHECK (age BETWEEN 10 AND 120),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('lose-weight', 'gain-muscle', 'control-sugar', 'maintain')),
  activity_level VARCHAR(20) DEFAULT 'light' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
  digest_time TIME DEFAULT '21:00:00',
  quick_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Food records table
CREATE TABLE food_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64) NOT NULL,
  recognition_result JSONB NOT NULL,
  health_rating JSONB NOT NULL,
  meal_context VARCHAR(20) CHECK (meal_context IN ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  stripe_customer_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Usage quotas table
CREATE TABLE usage_quotas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recognitions_used INTEGER DEFAULT 0,
  recognitions_limit INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- User feedback table
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_record_id UUID REFERENCES food_records(id) ON DELETE SET NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('accurate', 'inaccurate', 'suggestion')),
  correct_food_name TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, achievement_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Food records indexes
CREATE INDEX idx_food_records_user_date ON food_records(user_id, created_at DESC);
CREATE INDEX idx_food_records_image_hash ON food_records(image_hash);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- Usage quotas indexes
CREATE INDEX idx_usage_quotas_user_date ON usage_quotas(user_id, date);

-- User feedback indexes
CREATE INDEX idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_record ON user_feedback(food_record_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to health_profiles table
CREATE TRIGGER update_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to usage_quotas table
CREATE TRIGGER update_usage_quotas_updated_at
  BEFORE UPDATE ON usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_date DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_quotas (user_id, date, recognitions_used, recognitions_limit)
  VALUES (p_user_id, p_date, 1, 3)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    recognitions_used = usage_quotas.recognitions_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_meals INTEGER,
  avg_calories DECIMAL,
  green_count INTEGER,
  yellow_count INTEGER,
  red_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_meals,
    AVG((recognition_result->'totalNutrition'->'calories'->>'min')::DECIMAL) as avg_calories,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'green')::INTEGER as green_count,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'yellow')::INTEGER as yellow_count,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'red')::INTEGER as red_count
  FROM food_records
  WHERE user_id = p_user_id
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Stores user account information and preferences';
COMMENT ON TABLE health_profiles IS 'Stores user health information for personalized recommendations';
COMMENT ON TABLE food_records IS 'Stores food recognition results and health ratings';
COMMENT ON TABLE subscriptions IS 'Manages user subscription tiers and payment status';
COMMENT ON TABLE usage_quotas IS 'Tracks daily usage limits for free tier users';
COMMENT ON TABLE user_feedback IS 'Collects user feedback on recognition accuracy';
COMMENT ON TABLE achievements IS 'Tracks user achievements and milestones';

COMMENT ON FUNCTION increment_usage IS 'Increments the daily recognition usage count for a user';
COMMENT ON FUNCTION get_user_stats IS 'Retrieves aggregated statistics for a user within a date range';
