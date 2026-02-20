-- Migration 011: Phase 3 Personalization & Gamification (Fixed)
-- 用户个性化、预算追踪、提醒、视觉卡片、社交功能
-- 此版本可以独立运行，不依赖之前的 gamification 迁移

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

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);

-- 启用 RLS（如果还没启用）
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_streaks' 
    AND policyname = 'Users can view their own streaks'
  ) THEN
    CREATE POLICY "Users can view their own streaks"
    ON user_streaks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_streaks' 
    AND policyname = 'Users can update their own streaks'
  ) THEN
    CREATE POLICY "Users can update their own streaks"
    ON user_streaks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 1. Enhanced User Preferences (扩展用户偏好表)
-- ============================================
-- 注意：user_preferences 已存在，我们添加新列
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS dietary_type TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS eating_habits JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS minimal_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'en';

-- 创建索引（TEXT[] 需要指定 array_ops 操作符类）
CREATE INDEX IF NOT EXISTS idx_user_preferences_dietary_type ON user_preferences USING GIN(dietary_type array_ops);
CREATE INDEX IF NOT EXISTS idx_user_preferences_allergies ON user_preferences USING GIN(allergies);

-- ============================================
-- 2. Daily Budgets (每日预算表)
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

-- 启用 RLS
ALTER TABLE daily_budgets ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_budgets' 
    AND policyname = 'Users can view their own budgets'
  ) THEN
    CREATE POLICY "Users can view their own budgets"
    ON daily_budgets FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_budgets' 
    AND policyname = 'Users can insert their own budgets'
  ) THEN
    CREATE POLICY "Users can insert their own budgets"
    ON daily_budgets FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_budgets' 
    AND policyname = 'Users can update their own budgets'
  ) THEN
    CREATE POLICY "Users can update their own budgets"
    ON daily_budgets FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 3. Enhanced Streaks (扩展打卡表)
-- ============================================
-- 添加新列到 user_streaks
ALTER TABLE user_streaks
ADD COLUMN IF NOT EXISTS streak_freezes_available INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_freeze_reset_date DATE,
ADD COLUMN IF NOT EXISTS comeback_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_active INTEGER DEFAULT 0;

-- ============================================
-- 4. Achievements Table (成就表)
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

-- 启用 RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'achievements' 
    AND policyname = 'Users can view their own achievements'
  ) THEN
    CREATE POLICY "Users can view their own achievements"
    ON achievements FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 5. Reminders (提醒表)
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

-- 启用 RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reminders' 
    AND policyname = 'Users can view their own reminders'
  ) THEN
    CREATE POLICY "Users can view their own reminders"
    ON reminders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reminders' 
    AND policyname = 'Users can insert their own reminders'
  ) THEN
    CREATE POLICY "Users can insert their own reminders"
    ON reminders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reminders' 
    AND policyname = 'Users can update their own reminders'
  ) THEN
    CREATE POLICY "Users can update their own reminders"
    ON reminders FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 6. Enhanced Food Records (扩展食物记录表)
-- ============================================
ALTER TABLE food_records
ADD COLUMN IF NOT EXISTS meal_context JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_food_records_meal_context ON food_records USING GIN(meal_context);

-- ============================================
-- 7. Visual Cards (视觉卡片表)
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

-- 启用 RLS
ALTER TABLE visual_cards ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'visual_cards' 
    AND policyname = 'Users can view their own cards'
  ) THEN
    CREATE POLICY "Users can view their own cards"
    ON visual_cards FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 8. Feature Discovery (功能发现表)
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

-- 启用 RLS
ALTER TABLE feature_discovery ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feature_discovery' 
    AND policyname = 'Users can view their own feature discovery'
  ) THEN
    CREATE POLICY "Users can view their own feature discovery"
    ON feature_discovery FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 9. User Engagement Metrics (用户参与度指标表)
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

-- 启用 RLS
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_engagement_metrics' 
    AND policyname = 'Users can view their own metrics'
  ) THEN
    CREATE POLICY "Users can view their own metrics"
    ON user_engagement_metrics FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

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
  -- 计算总餐数
  SELECT COUNT(*) INTO v_total_meals
  FROM food_records
  WHERE user_id = p_user_id;

  -- 计算活跃天数
  SELECT COUNT(DISTINCT DATE(created_at)) INTO v_days_active
  FROM food_records
  WHERE user_id = p_user_id;

  -- 获取启用的功能
  SELECT ARRAY_AGG(DISTINCT feature_name) INTO v_features
  FROM feature_discovery
  WHERE user_id = p_user_id AND user_engaged = TRUE;

  -- 更新或插入指标
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
