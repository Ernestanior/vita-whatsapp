-- 清理 user_feedback 表（如果存在）
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP VIEW IF EXISTS feedback_stats CASCADE;
DROP FUNCTION IF EXISTS get_user_feedback_stats(UUID);
DROP FUNCTION IF EXISTS get_monthly_feedback_analysis(DATE, DATE);
