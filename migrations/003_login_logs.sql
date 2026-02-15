-- 创建登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason TEXT,
  location JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_login_logs_user_timestamp ON login_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_success ON login_logs (user_id, success);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON login_logs (ip_address);

-- 启用 RLS
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的登录日志
CREATE POLICY "Users can view own login logs" ON login_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 系统可以插入登录日志
CREATE POLICY "System can insert login logs" ON login_logs
  FOR INSERT WITH CHECK (true);

-- 添加注释
COMMENT ON TABLE login_logs IS '用户登录日志表，用于安全审计和异常检测';
COMMENT ON COLUMN login_logs.user_id IS '用户 ID';
COMMENT ON COLUMN login_logs.timestamp IS '登录时间';
COMMENT ON COLUMN login_logs.ip_address IS 'IP 地址';
COMMENT ON COLUMN login_logs.user_agent IS '用户代理（浏览器/设备信息）';
COMMENT ON COLUMN login_logs.success IS '登录是否成功';
COMMENT ON COLUMN login_logs.failure_reason IS '登录失败原因';
COMMENT ON COLUMN login_logs.location IS '地理位置信息（可选）';
