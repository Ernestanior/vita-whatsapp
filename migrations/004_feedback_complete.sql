-- Migration 004: User Feedback System (Complete)
-- 用户反馈系统 - 完整版本（包含清理）

-- 清理旧的对象（如果存在）
DROP VIEW IF EXISTS feedback_stats CASCADE;
DROP FUNCTION IF EXISTS get_user_feedback_stats(UUID);
DROP FUNCTION IF EXISTS get_monthly_feedback_analysis(DATE, DATE);
DROP TABLE IF EXISTS user_feedback CASCADE;

-- 创建反馈表
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_record_id UUID REFERENCES food_records(id) ON DELETE SET NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('accurate', 'inaccurate', 'general', 'suggestion')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_food_record_id ON user_feedback(food_record_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- 启用 RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看和创建自己的反馈
CREATE POLICY "Users can view their own feedback"
ON user_feedback FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON user_feedback FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON user_feedback FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 创建反馈统计视图
CREATE VIEW feedback_stats AS
SELECT
  feedback_type,
  COUNT(*) as count,
  AVG(CASE WHEN rating IS NOT NULL THEN rating::NUMERIC ELSE NULL END) as avg_rating,
  DATE_TRUNC('day', created_at) as date
FROM user_feedback
GROUP BY feedback_type, DATE_TRUNC('day', created_at);

-- 创建函数：获取用户反馈统计
CREATE FUNCTION get_user_feedback_stats(p_user_id UUID)
RETURNS TABLE (
  total_feedback BIGINT,
  accurate_count BIGINT,
  inaccurate_count BIGINT,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE feedback_type = 'accurate') as accurate_count,
    COUNT(*) FILTER (WHERE feedback_type = 'inaccurate') as inaccurate_count,
    AVG(CASE WHEN rating IS NOT NULL THEN rating::NUMERIC ELSE NULL END) as avg_rating
  FROM user_feedback
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取月度反馈分析
CREATE FUNCTION get_monthly_feedback_analysis(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  feedback_type VARCHAR,
  count BIGINT,
  avg_rating NUMERIC,
  common_issues TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uf.feedback_type,
    COUNT(*) as count,
    AVG(CASE WHEN uf.rating IS NOT NULL THEN uf.rating::NUMERIC ELSE NULL END) as avg_rating,
    ARRAY_AGG(DISTINCT uf.comment) FILTER (WHERE uf.comment IS NOT NULL) as common_issues
  FROM user_feedback uf
  WHERE uf.created_at >= p_start_date
    AND uf.created_at < p_end_date
  GROUP BY uf.feedback_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE user_feedback IS '用户反馈表';
COMMENT ON COLUMN user_feedback.feedback_type IS '反馈类型：accurate（准确）、inaccurate（不准确）、general（一般）、suggestion（建议）';
COMMENT ON COLUMN user_feedback.rating IS '评分（1-5星）';
COMMENT ON COLUMN user_feedback.comment IS '反馈内容';
COMMENT ON COLUMN user_feedback.metadata IS '额外元数据（JSON格式）';
