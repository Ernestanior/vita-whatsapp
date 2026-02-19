-- Migration 011: Phase 3 Personalization & Gamification (FINAL VERSION)
-- 完全测试通过的版本，可以直接执行

-- ============================================
-- 0. 确保 user_streaks 表存在
-- ============================================
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_checkin_date DATE,
  total_checkins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. Enhanced User Preferences
-- ============================================
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS dietary_type TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS eating_habits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS minimal_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- 注意：不创建 GIN 索引，避免操作符类问题
-- 如果需要，可以手动创建：CREATE INDEX idx_user_preferences_allergies ON user_preferences USING GIN(allergies);

-- ============================================
-- 2. Daily Budgets
-- ============================================
CREATE TABLE IF NOT EXISTS daily_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calorie_target INTEGER NOT NULL,
  calories_consumed INTEGER DEFAULT 0,
  budget_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_budgets_user_date ON daily_budgets(user_id, date DESC);
ALTER TABLE daily_budgets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Enhanced Streaks
-- ============================================
ALTER TABLE user_streaks
ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_freeze_reset_date DATE,
ADD COLUMN IF NOT EXISTS comeback_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_active INTEGER DEFAULT 0;

-- ============================================
-- 4. Achievements
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_tier TEXT NOT NULL CHECK (achievement_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Reminders
-- ============================================
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('breakfast', 'lunch', 'dinner')),
  scheduled_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '07:00',
  effectiveness_score FLOAT DEFAULT 0.5,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_enabled ON reminders(user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time ON reminders(scheduled_time);
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. Enhanced Food Records
-- ============================================
ALTER TABLE food_records
ADD COLUMN IF NOT EXISTS meal_context JSONB DEFAULT '{}';

-- ============================================
-- 7. Visual Cards
-- ============================================
CREATE TABLE IF NOT EXISTS visual_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('daily', 'weekly', 'achievement')),
  generation_date DATE NOT NULL,
  image_url TEXT NOT NULL,
  data_snapshot JSONB NOT NULL,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visual_cards_user_id ON visual_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_visual_cards_type_date ON visual_cards(card_type, generation_date DESC);
ALTER TABLE visual_cards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Feature Discovery
-- ============================================
CREATE TABLE IF NOT EXISTS feature_discovery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  introduction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  introduction_count INTEGER DEFAULT 1,
  user_engaged BOOLEAN DEFAULT FALSE,
  last_mentioned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_feature_discovery_user_id ON feature_discovery(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_discovery_feature ON feature_discovery(feature_name);
ALTER TABLE feature_discovery ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. User Engagement Metrics
-- ============================================
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_meals_logged INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  features_enabled TEXT[] DEFAULT '{}',
  last_active_date DATE,
  engagement_score FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_metrics_score ON user_engagement_metrics(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_last_active ON user_engagement_metrics(last_active_date DESC);
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. Helper Functions
-- ============================================

-- 函数：获取预算状态
CREATE OR REPLACE FUNCTION get_budget_status(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  enabled BOOLEAN,
  target INTEGER,
  consumed INTEGER,
  remaining INTEGER,
  percentage_used NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_budget RECORD;
BEGIN
  SELECT * INTO v_budget
  FROM daily_budgets
  WHERE user_id = p_user_id AND date = p_date;

  IF NOT FOUND OR NOT v_budget.budget_enabled THEN
    RETURN QUERY SELECT FALSE, 0, 0, 0, 0::NUMERIC, 'disabled'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    v_budget.calorie_target,
    v_budget.calories_consumed,
    v_budget.calorie_target - v_budget.calories_consumed,
    ROUND((v_budget.calories_consumed::NUMERIC / v_budget.calorie_target::NUMERIC) * 100, 1),
    CASE
      WHEN v_budget.calories_consumed >= v_budget.calorie_target THEN 'over_budget'
      WHEN v_budget.calories_consumed >= v_budget.calorie_target * 0.8 THEN 'approaching_limit'
      ELSE 'on_track'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：更新用户参与度指标
CREATE OR REPLACE FUNCTION update_engagement_metrics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_meals INTEGER;
  v_days_active INTEGER;
  v_features TEXT[];
BEGIN
  SELECT COUNT(*) INTO v_total_meals
  FROM food_records
  WHERE user_id = p_user_id;

  SELECT COUNT(DISTINCT DATE(created_at)) INTO v_days_active
  FROM food_records
  WHERE user_id = p_user_id;

  SELECT ARRAY_AGG(DISTINCT feature_name) INTO v_features
  FROM feature_discovery
  WHERE user_id = p_user_id AND user_engaged = TRUE;

  INSERT INTO user_engagement_metrics (
    user_id,
    total_meals_logged,
    days_active,
    features_enabled,
    last_active_date,
    engagement_score,
    updated_at
  ) VALUES (
    p_user_id,
    v_total_meals,
    v_days_active,
    COALESCE(v_features, '{}'),
    CURRENT_DATE,
    LEAST(1.0, (v_days_active::FLOAT / 30.0)),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_meals_logged = v_total_meals,
    days_active = v_days_active,
    features_enabled = COALESCE(v_features, '{}'),
    last_active_date = CURRENT_DATE,
    engagement_score = LEAST(1.0, (v_days_active::FLOAT / 30.0)),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE daily_budgets IS 'Phase 3: 每日卡路里预算追踪';
COMMENT ON TABLE reminders IS 'Phase 3: 用户提醒设置';
COMMENT ON TABLE visual_cards IS 'Phase 3: 可分享的视觉卡片';
COMMENT ON TABLE feature_discovery IS 'Phase 3: 功能发现和渐进式介绍';
COMMENT ON TABLE user_engagement_metrics IS 'Phase 3: 用户参与度指标';
COMMENT ON TABLE achievements IS 'Phase 3: 用户成就记录';
