-- Migration 007: Cost Monitoring System
-- API 使用追踪、成本监控、预算告警

-- 创建 API 使用记录表
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  model VARCHAR(50) NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  cached BOOLEAN DEFAULT FALSE,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON api_usage (user_id, date);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage (date);
CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage (model);

-- 创建成本指标表
CREATE TABLE IF NOT EXISTS cost_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_api_calls INTEGER DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost DECIMAL(10, 2) DEFAULT 0,
  cost_per_user DECIMAL(10, 4) DEFAULT 0,
  cache_hit_rate DECIMAL(5, 4) DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  model_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建成本告警表
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('DAILY_BUDGET_EXCEEDED', 'ABNORMAL_USAGE', 'HIGH_ERROR_RATE')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cost_alerts_type ON cost_alerts (type);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_severity ON cost_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_created ON cost_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_alerts_resolved ON cost_alerts (resolved);

-- 启用 RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_alerts ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的 API 使用记录
CREATE POLICY "Users can view their own API usage"
ON api_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS 策略：管理员可以查看所有成本指标
CREATE POLICY "Admins can view cost metrics"
ON cost_metrics FOR SELECT
TO authenticated
USING (true); -- 所有认证用户都可以查看（可以根据需要调整）

-- RLS 策略：管理员可以查看成本告警
CREATE POLICY "Admins can view cost alerts"
ON cost_alerts FOR SELECT
TO authenticated
USING (true);

-- 创建函数：获取用户 API 使用统计
CREATE OR REPLACE FUNCTION get_user_api_usage_stats(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_calls BIGINT,
  total_cost DECIMAL,
  cached_calls BIGINT,
  cache_hit_rate DECIMAL
) AS $
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_calls,
    SUM(cost)::DECIMAL as total_cost,
    COUNT(*) FILTER (WHERE cached = TRUE)::BIGINT as cached_calls,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE cached = TRUE)::DECIMAL / COUNT(*)::DECIMAL)
      ELSE 0
    END as cache_hit_rate
  FROM api_usage
  WHERE user_id = p_user_id
    AND date >= p_start_date
    AND date <= p_end_date;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建函数：获取每日成本汇总
CREATE OR REPLACE FUNCTION aggregate_daily_cost_metrics(p_date DATE)
RETURNS void AS $
DECLARE
  v_total_calls INTEGER;
  v_total_input_tokens BIGINT;
  v_total_output_tokens BIGINT;
  v_total_cost DECIMAL;
  v_unique_users INTEGER;
  v_cached_calls INTEGER;
  v_cache_hit_rate DECIMAL;
  v_model_breakdown JSONB;
BEGIN
  -- 计算统计数据
  SELECT
    COUNT(*)::INTEGER,
    SUM(input_tokens)::BIGINT,
    SUM(output_tokens)::BIGINT,
    SUM(cost)::DECIMAL,
    COUNT(DISTINCT user_id)::INTEGER,
    COUNT(*) FILTER (WHERE cached = TRUE)::INTEGER
  INTO
    v_total_calls,
    v_total_input_tokens,
    v_total_output_tokens,
    v_total_cost,
    v_unique_users,
    v_cached_calls
  FROM api_usage
  WHERE date = p_date;

  -- 计算缓存命中率
  v_cache_hit_rate := CASE 
    WHEN v_total_calls > 0 THEN v_cached_calls::DECIMAL / v_total_calls::DECIMAL
    ELSE 0
  END;

  -- 计算模型分布
  SELECT jsonb_object_agg(model, model_stats)
  INTO v_model_breakdown
  FROM (
    SELECT
      model,
      jsonb_build_object(
        'calls', COUNT(*),
        'cost', SUM(cost)
      ) as model_stats
    FROM api_usage
    WHERE date = p_date
    GROUP BY model
  ) model_data;

  -- 插入或更新成本指标
  INSERT INTO cost_metrics (
    date,
    total_api_calls,
    total_input_tokens,
    total_output_tokens,
    total_cost,
    cost_per_user,
    cache_hit_rate,
    unique_users,
    model_breakdown
  ) VALUES (
    p_date,
    v_total_calls,
    v_total_input_tokens,
    v_total_output_tokens,
    v_total_cost,
    CASE WHEN v_unique_users > 0 THEN v_total_cost / v_unique_users ELSE 0 END,
    v_cache_hit_rate,
    v_unique_users,
    COALESCE(v_model_breakdown, '{}'::jsonb)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_api_calls = EXCLUDED.total_api_calls,
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_cost = EXCLUDED.total_cost,
    cost_per_user = EXCLUDED.cost_per_user,
    cache_hit_rate = EXCLUDED.cache_hit_rate,
    unique_users = EXCLUDED.unique_users,
    model_breakdown = EXCLUDED.model_breakdown,
    updated_at = NOW();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON TABLE api_usage IS 'API 使用记录表，追踪每次 API 调用';
COMMENT ON TABLE cost_metrics IS '每日成本指标汇总表';
COMMENT ON TABLE cost_alerts IS '成本告警记录表';

COMMENT ON COLUMN api_usage.model IS 'AI 模型名称（如 gpt-4o-mini）';
COMMENT ON COLUMN api_usage.input_tokens IS '输入 token 数量';
COMMENT ON COLUMN api_usage.output_tokens IS '输出 token 数量';
COMMENT ON COLUMN api_usage.cost IS '本次调用成本（美元）';
COMMENT ON COLUMN api_usage.cached IS '是否使用了缓存';
COMMENT ON COLUMN api_usage.duration IS '调用耗时（毫秒）';

COMMENT ON COLUMN cost_metrics.cache_hit_rate IS '缓存命中率（0-1）';
COMMENT ON COLUMN cost_metrics.model_breakdown IS '各模型的调用次数和成本分布（JSON）';

COMMENT ON COLUMN cost_alerts.type IS '告警类型';
COMMENT ON COLUMN cost_alerts.severity IS '告警严重程度';
COMMENT ON COLUMN cost_alerts.metadata IS '告警相关的元数据（JSON）';
