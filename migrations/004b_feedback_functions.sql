-- Migration 004b: User Feedback Functions and Views
-- 用户反馈系统的函数和视图（在表创建后执行）

-- 创建反馈统计视图
CREATE OR REPLACE VIEW feedback_stats AS
SELECT
  feedback_type,
  COUNT(*) as count,
  AVG(CASE WHEN rating IS NOT NULL THEN rating::NUMERIC ELSE NULL END) as avg_rating,
  DATE_TRUNC('day', created_at) as date
FROM user_feedback
GROUP BY feedback_type, DATE_TRUNC('day', created_at);

-- 创建函数：获取用户反馈统计
CREATE OR REPLACE FUNCTION get_user_feedback_stats(p_user_id UUID)
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
CREATE OR REPLACE FUNCTION get_monthly_feedback_analysis(p_start_date DATE, p_end_date DATE)
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
