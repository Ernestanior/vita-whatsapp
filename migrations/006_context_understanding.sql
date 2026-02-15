-- Migration 006: Smart Context Understanding
-- 智能上下文理解系统

-- 创建用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name VARCHAR(200) NOT NULL,
  frequency INTEGER DEFAULT 1,
  avg_rating NUMERIC(3, 2) DEFAULT 0,
  last_eaten TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, food_name)
);

-- 创建饮食模式表
CREATE TABLE IF NOT EXISTS dietary_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  typical_breakfast_time TIME,
  typical_lunch_time TIME,
  typical_dinner_time TIME,
  avg_meals_per_day NUMERIC(3, 1) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 为 food_records 表添加 meal_scene 列（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_records' AND column_name = 'meal_scene'
  ) THEN
    ALTER TABLE food_records 
    ADD COLUMN meal_scene VARCHAR(20) CHECK (meal_scene IN ('breakfast', 'lunch', 'dinner', 'snack'));
  END IF;
END $$;

-- 创建索引
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_frequency ON user_preferences(frequency DESC);
CREATE INDEX idx_user_preferences_food_name ON user_preferences(food_name);
CREATE INDEX idx_dietary_patterns_user_id ON dietary_patterns(user_id);
CREATE INDEX idx_food_records_meal_scene ON food_records(meal_scene);

-- 启用 RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_patterns ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view their own preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own dietary patterns"
ON dietary_patterns FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dietary patterns"
ON dietary_patterns FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dietary patterns"
ON dietary_patterns FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 创建函数：获取用户最喜欢的食物
CREATE OR REPLACE FUNCTION get_user_favorite_foods(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  food_name VARCHAR,
  frequency INTEGER,
  avg_rating NUMERIC,
  last_eaten TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.food_name,
    up.frequency,
    up.avg_rating,
    up.last_eaten
  FROM user_preferences up
  WHERE up.user_id = p_user_id
  ORDER BY up.frequency DESC, up.avg_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取营养缺口
CREATE OR REPLACE FUNCTION get_nutrition_gaps(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  target_calories INTEGER,
  current_calories INTEGER,
  calories_gap INTEGER,
  target_protein INTEGER,
  current_protein INTEGER,
  protein_gap INTEGER
) AS $$
DECLARE
  v_profile RECORD;
  v_bmr NUMERIC;
  v_tdee NUMERIC;
  v_activity_multiplier NUMERIC;
  v_current_calories INTEGER;
  v_current_protein INTEGER;
BEGIN
  -- 获取用户健康画像
  SELECT * INTO v_profile
  FROM health_profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 计算基础代谢率 (Mifflin-St Jeor)
  IF v_profile.gender = 'male' THEN
    v_bmr := 10 * v_profile.weight + 6.25 * v_profile.height - 5 * v_profile.age + 5;
  ELSE
    v_bmr := 10 * v_profile.weight + 6.25 * v_profile.height - 5 * v_profile.age - 161;
  END IF;

  -- 活动系数
  v_activity_multiplier := CASE v_profile.activity_level
    WHEN 'sedentary' THEN 1.2
    WHEN 'light' THEN 1.375
    WHEN 'moderate' THEN 1.55
    WHEN 'active' THEN 1.725
    WHEN 'very_active' THEN 1.9
    ELSE 1.2
  END;

  v_tdee := v_bmr * v_activity_multiplier;

  -- 获取当日摄入
  SELECT
    COALESCE(SUM(calories), 0)::INTEGER,
    COALESCE(SUM(protein), 0)::INTEGER
  INTO v_current_calories, v_current_protein
  FROM food_records
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_date;

  -- 返回结果
  RETURN QUERY
  SELECT
    v_tdee::INTEGER AS target_calories,
    v_current_calories AS current_calories,
    GREATEST(0, v_tdee::INTEGER - v_current_calories) AS calories_gap,
    (v_profile.weight * 1.6)::INTEGER AS target_protein,
    v_current_protein AS current_protein,
    GREATEST(0, (v_profile.weight * 1.6)::INTEGER - v_current_protein) AS protein_gap;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE user_preferences IS '用户食物偏好表';
COMMENT ON COLUMN user_preferences.food_name IS '食物名称';
COMMENT ON COLUMN user_preferences.frequency IS '食用频率（次数）';
COMMENT ON COLUMN user_preferences.avg_rating IS '平均评分';
COMMENT ON COLUMN user_preferences.last_eaten IS '最后食用时间';

COMMENT ON TABLE dietary_patterns IS '用户饮食模式表';
COMMENT ON COLUMN dietary_patterns.typical_breakfast_time IS '典型早餐时间';
COMMENT ON COLUMN dietary_patterns.typical_lunch_time IS '典型午餐时间';
COMMENT ON COLUMN dietary_patterns.typical_dinner_time IS '典型晚餐时间';
COMMENT ON COLUMN dietary_patterns.avg_meals_per_day IS '平均每日用餐次数';

COMMENT ON COLUMN food_records.meal_scene IS '用餐场景：breakfast（早餐）、lunch（午餐）、dinner（晚餐）、snack（加餐）';
