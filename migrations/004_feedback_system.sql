-- Migration 004: User Feedback System
-- 用户反馈系统

-- 创建反馈表
CREATE TABLE IF NOT EXISTS user_feedback (
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
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_food_record_id ON user_feedback(food_record_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

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

-- 添加注释
COMMENT ON TABLE user_feedback IS '用户反馈表';
COMMENT ON COLUMN user_feedback.feedback_type IS '反馈类型：accurate（准确）、inaccurate（不准确）、general（一般）、suggestion（建议）';
COMMENT ON COLUMN user_feedback.rating IS '评分（1-5星）';
COMMENT ON COLUMN user_feedback.comment IS '反馈内容';
COMMENT ON COLUMN user_feedback.metadata IS '额外元数据（JSON格式）';
