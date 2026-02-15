# Vita AI 部署指南

## 前置要求

在部署之前，你需要准备以下服务账号：

1. **Vercel 账号** - 用于部署应用
2. **Supabase 账号** - 用于数据库和存储
3. **OpenAI 账号** - 用于 AI 食物识别
4. **WhatsApp Business 账号** - 用于 WhatsApp Bot
5. **Stripe 账号** - 用于支付处理
6. **Upstash 账号** - 用于 Redis 缓存

## 步骤 1: Supabase 设置

### 1.1 创建项目

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 点击 "New Project"
3. 填写项目信息并选择区域（建议选择 Singapore）
4. 等待项目创建完成

### 1.2 执行数据库迁移

1. 在 Supabase Dashboard 中，进入 SQL Editor
2. 执行以下 SQL 脚本创建表结构：

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  whatsapp_name VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建健康画像表
CREATE TABLE health_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  height INTEGER NOT NULL CHECK (height BETWEEN 100 AND 250),
  weight DECIMAL(5,2) NOT NULL CHECK (weight BETWEEN 30 AND 300),
  age INTEGER CHECK (age BETWEEN 10 AND 120),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  goal VARCHAR(20) NOT NULL CHECK (goal IN ('lose-weight', 'gain-muscle', 'control-sugar', 'maintain')),
  activity_level VARCHAR(20) DEFAULT 'light' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
  digest_time TIME DEFAULT '21:00:00',
  quick_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建食物识别记录表
CREATE TABLE food_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64) NOT NULL,
  recognition_result JSONB NOT NULL,
  health_rating JSONB NOT NULL,
  meal_context VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_food_records_user_date ON food_records(user_id, created_at DESC);
CREATE INDEX idx_food_records_image_hash ON food_records(image_hash);

-- 创建订阅表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  stripe_customer_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);

-- 创建使用配额表
CREATE TABLE usage_quotas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recognitions_used INTEGER DEFAULT 0,
  recognitions_limit INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- 创建用户反馈表
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_record_id UUID REFERENCES food_records(id) ON DELETE SET NULL,
  feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('accurate', 'inaccurate', 'suggestion')),
  correct_food_name TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建成就表
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, achievement_type)
);

-- 创建触发器（自动更新 updated_at）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建数据库函数
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_date DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO usage_quotas (user_id, date, recognitions_used, recognitions_limit)
  VALUES (p_user_id, p_date, 1, 3)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    recognitions_used = usage_quotas.recognitions_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_stats(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  total_meals INTEGER,
  avg_calories DECIMAL,
  green_count INTEGER,
  yellow_count INTEGER,
  red_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_meals,
    AVG((recognition_result->'totalNutrition'->'calories'->>'min')::DECIMAL) as avg_calories,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'green')::INTEGER as green_count,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'yellow')::INTEGER as yellow_count,
    COUNT(*) FILTER (WHERE health_rating->>'overall' = 'red')::INTEGER as red_count
  FROM food_records
  WHERE user_id = p_user_id
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 配置 Storage

1. 在 Supabase Dashboard 中，进入 Storage
2. 创建一个名为 `food-images` 的 bucket
3. 设置为 public bucket（允许公开访问图片）

### 1.4 获取 API Keys

在 Supabase Dashboard 的 Settings > API 中获取：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

## 步骤 2: OpenAI 设置

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 创建 API Key
3. 记录 `OPENAI_API_KEY`

## 步骤 3: WhatsApp Business API 设置

1. 访问 [Meta for Developers](https://developers.facebook.com/)
2. 创建应用并启用 WhatsApp Business API
3. 获取以下信息：
   - `WHATSAPP_TOKEN` (Access Token)
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN` (自己设置的验证令牌)

## 步骤 4: Stripe 设置

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 获取 API Keys：
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. 创建 Webhook 端点（部署后配置）
4. 创建订阅产品和价格

## 步骤 5: Upstash Redis 设置

1. 访问 [Upstash Console](https://console.upstash.com/)
2. 创建 Redis 数据库（选择 Singapore 区域）
3. 获取：
   - `UPSTASH_REDIS_URL`
   - `UPSTASH_REDIS_TOKEN`

## 步骤 6: Vercel 部署

### 6.1 连接 GitHub

1. 将代码推送到 GitHub 仓库
2. 访问 [Vercel Dashboard](https://vercel.com/)
3. 点击 "Import Project"
4. 选择你的 GitHub 仓库

### 6.2 配置环境变量

在 Vercel 项目设置中，添加所有环境变量：

```
OPENAI_API_KEY=...
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
NEXT_PUBLIC_URL=https://your-domain.vercel.app
ENABLE_CACHING=true
ENABLE_COST_ALERTS=true
MAX_DAILY_COST=100
```

### 6.3 部署

1. 点击 "Deploy"
2. 等待部署完成
3. 记录部署的 URL

## 步骤 7: 配置 Webhooks

### 7.1 WhatsApp Webhook

1. 在 Meta for Developers 中配置 Webhook URL：
   - URL: `https://your-domain.vercel.app/api/webhook`
   - Verify Token: 你设置的 `WHATSAPP_VERIFY_TOKEN`
2. 订阅 `messages` 事件

### 7.2 Stripe Webhook

1. 在 Stripe Dashboard 中添加 Webhook 端点：
   - URL: `https://your-domain.vercel.app/api/stripe/webhook`
2. 选择以下事件：
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
3. 获取 Webhook 签名密钥并更新 `STRIPE_WEBHOOK_SECRET`

## 步骤 8: 验证部署

1. 访问 `https://your-domain.vercel.app/api/health` 检查 API 是否正常
2. 通过 WhatsApp 发送消息测试 Bot
3. 检查 Vercel 日志确认没有错误

## 监控和维护

### 日志查看

- Vercel Dashboard > Logs
- Supabase Dashboard > Logs

### 成本监控

定期检查：
- OpenAI API 使用量
- Vercel 函数调用次数
- Supabase 数据库大小
- Upstash Redis 使用量

### 备份

建议每周备份 Supabase 数据库：
```bash
npm run backup
```

## 故障排查

### Webhook 不工作

1. 检查 Vercel 日志
2. 验证 Webhook URL 是否正确
3. 确认 Verify Token 匹配

### AI 识别失败

1. 检查 OpenAI API Key 是否有效
2. 确认账户有足够余额
3. 查看错误日志

### 数据库连接失败

1. 检查 Supabase 项目是否正常运行
2. 验证 API Keys 是否正确
3. 确认 RLS 策略配置正确

## 安全建议

1. 定期轮换 API Keys
2. 启用 Vercel 的 IP 白名单（如果需要）
3. 监控异常 API 调用
4. 定期审查 Supabase RLS 策略
5. 使用 Sentry 进行错误追踪

## 扩展建议

当用户量增长时：
1. 升级 Supabase 计划
2. 考虑使用 CDN 加速图片
3. 优化数据库查询
4. 增加缓存策略
