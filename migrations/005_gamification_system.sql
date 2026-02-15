-- Migration 005: Gamification System (社交和激励机制)
-- 连续打卡、成就系统、每周目标

-- 创建用户打卡记录表
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

-- 创建成就定义表
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_zh_cn VARCHAR(100) NOT NULL,
  name_zh_tw VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_zh_cn TEXT,
  description_zh_tw TEXT,
  icon VARCHAR(10),
  category VARCHAR(50),
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, achievement_id)
);

-- 创建每周目标表
CREATE TABLE IF NOT EXISTS weekly_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  goal_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_start_date, goal_type)
);

-- 创建排行榜表（可选）
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  health_score INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  is_public BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 创建索引
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_weekly_goals_user_id ON weekly_goals(user_id);
CREATE INDEX idx_weekly_goals_week_start ON weekly_goals(week_start_date);
CREATE INDEX idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX idx_leaderboard_health_score ON leaderboard(health_score DESC);

-- 启用 RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can view their own streaks"
ON user_streaks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
ON user_streaks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements"
ON user_achievements FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals"
ON weekly_goals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON weekly_goals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON weekly_goals FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 排行榜：所有人可以查看公开的排行榜
CREATE POLICY "Anyone can view public leaderboard"
ON leaderboard FOR SELECT
TO authenticated
USING (is_public = TRUE);

CREATE POLICY "Users can update their own leaderboard entry"
ON leaderboard FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 插入预定义成就
INSERT INTO achievements (code, name_en, name_zh_cn, name_zh_tw, description_en, description_zh_cn, description_zh_tw, icon, category, requirement_type, requirement_value, points) VALUES
-- 打卡成就
('streak_7', 'Week Warrior', '一周战士', '一週戰士', 'Log meals for 7 consecutive days', '连续打卡7天', '連續打卡7天', '🔥', 'streak', 'consecutive_days', 7, 100),
('streak_30', 'Month Master', '月度大师', '月度大師', 'Log meals for 30 consecutive days', '连续打卡30天', '連續打卡30天', '🏆', 'streak', 'consecutive_days', 30, 500),
('streak_100', 'Century Champion', '百日冠军', '百日冠軍', 'Log meals for 100 consecutive days', '连续打卡100天', '連續打卡100天', '👑', 'streak', 'consecutive_days', 100, 2000),

-- 识别成就
('recognition_10', 'Food Explorer', '美食探索者', '美食探索者', 'Recognize 10 different foods', '识别10种不同食物', '識別10種不同食物', '🍽️', 'recognition', 'unique_foods', 10, 50),
('recognition_50', 'Food Connoisseur', '美食鉴赏家', '美食鑑賞家', 'Recognize 50 different foods', '识别50种不同食物', '識別50種不同食物', '🌟', 'recognition', 'unique_foods', 50, 200),
('recognition_100', 'Food Master', '美食大师', '美食大師', 'Recognize 100 different foods', '识别100种不同食物', '識別100種不同食物', '🎖️', 'recognition', 'unique_foods', 100, 500),

-- 健康饮食成就
('healthy_7', 'Green Week', '绿灯周', '綠燈週', 'Eat healthy (green rating) for 7 days', '连续7天健康饮食（绿灯）', '連續7天健康飲食（綠燈）', '🥗', 'healthy', 'green_days', 7, 150),
('healthy_30', 'Green Month', '绿灯月', '綠燈月', 'Eat healthy (green rating) for 30 days', '连续30天健康饮食（绿灯）', '連續30天健康飲食（綠燈）', '🌱', 'healthy', 'green_days', 30, 600),

-- 目标达成成就
('goal_1', 'Goal Getter', '目标达人', '目標達人', 'Complete your first weekly goal', '完成第一个每周目标', '完成第一個每週目標', '🎯', 'goal', 'goals_completed', 1, 100),
('goal_10', 'Goal Master', '目标大师', '目標大師', 'Complete 10 weekly goals', '完成10个每周目标', '完成10個每週目標', '🏅', 'goal', 'goals_completed', 10, 500);

-- 创建函数：更新打卡记录
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE (
  current_streak INTEGER,
  longest_streak INTEGER,
  is_new_record BOOLEAN
) AS $$
DECLARE
  v_last_checkin DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 获取或创建打卡记录
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_checkin_date, total_checkins)
  VALUES (p_user_id, 0, 0, NULL, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 获取当前记录
  SELECT last_checkin_date, user_streaks.current_streak, user_streaks.longest_streak
  INTO v_last_checkin, v_current_streak, v_longest_streak
  FROM user_streaks
  WHERE user_id = p_user_id;

  -- 如果今天已经打卡，直接返回
  IF v_last_checkin = v_today THEN
    RETURN QUERY SELECT v_current_streak, v_longest_streak, FALSE;
    RETURN;
  END IF;

  -- 更新打卡记录
  IF v_last_checkin IS NULL OR v_last_checkin = v_today - INTERVAL '1 day' THEN
    -- 连续打卡
    v_current_streak := v_current_streak + 1;
  ELSE
    -- 中断，重新开始
    v_current_streak := 1;
  END IF;

  -- 更新最长记录
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- 更新数据库
  UPDATE user_streaks
  SET current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_checkin_date = v_today,
      total_checkins = total_checkins + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_current_streak, v_longest_streak, (v_current_streak = v_longest_streak);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：检查并解锁成就
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS TABLE (
  achievement_id UUID,
  achievement_code VARCHAR,
  achievement_name VARCHAR
) AS $$
BEGIN
  -- 这里简化实现，实际应用中需要更复杂的逻辑
  RETURN QUERY
  SELECT a.id, a.code, a.name_en
  FROM achievements a
  WHERE NOT EXISTS (
    SELECT 1 FROM user_achievements ua
    WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：更新每周目标进度
CREATE OR REPLACE FUNCTION update_weekly_goal_progress(
  p_user_id UUID,
  p_goal_type VARCHAR,
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_week_start DATE;
  v_updated BOOLEAN := FALSE;
BEGIN
  -- 计算本周开始日期（周一）
  v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  -- 更新目标进度
  UPDATE weekly_goals
  SET current_value = current_value + p_increment,
      status = CASE
        WHEN current_value + p_increment >= target_value THEN 'completed'
        ELSE 'active'
      END,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND week_start_date = v_week_start
    AND goal_type = p_goal_type
    AND status = 'active';

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE user_streaks IS '用户打卡记录表';
COMMENT ON TABLE achievements IS '成就定义表';
COMMENT ON TABLE user_achievements IS '用户已解锁成就表';
COMMENT ON TABLE weekly_goals IS '每周目标表';
COMMENT ON TABLE leaderboard IS '排行榜表';
