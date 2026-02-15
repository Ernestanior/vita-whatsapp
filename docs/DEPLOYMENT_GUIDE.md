# Vita AI 部署指南

完整的部署步骤文档，包括 Vercel、Supabase、Stripe 和 WhatsApp Business API 的配置。

## 目录

1. [前置准备](#前置准备)
2. [数据库设置](#数据库设置)
3. [WhatsApp Business API 配置](#whatsapp-business-api-配置)
4. [Stripe 配置](#stripe-配置)
5. [Vercel 部署](#vercel-部署)
6. [监控配置](#监控配置)
7. [验证部署](#验证部署)

## 前置准备

### 所需账号

- [ ] Vercel 账号（用于托管应用）
- [ ] Supabase 账号（用于数据库和存储）
- [ ] Meta for Developers 账号（用于 WhatsApp Business API）
- [ ] Stripe 账号（用于支付处理）
- [ ] OpenAI 账号（用于 AI 功能）
- [ ] Upstash 账号（用于 Redis 缓存）
- [ ] Sentry 账号（可选，用于错误追踪）

### 本地工具

```bash
# 安装 Node.js (v18+)
node --version

# 安装 Vercel CLI
npm install -g vercel

# 安装 Supabase CLI
npm install -g supabase

# 克隆项目
git clone <your-repo-url>
cd vita-ai

# 安装依赖
npm install
```

## 数据库设置

### 1. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 点击 "New Project"
3. 填写项目信息：
   - Name: `vita-ai-production`
   - Database Password: 生成强密码并保存
   - Region: `Southeast Asia (Singapore)` （推荐）
4. 等待项目创建完成（约 2 分钟）

### 2. 运行数据库迁移

```bash
# 方法 1: 使用 Supabase CLI
supabase link --project-ref <your-project-ref>
supabase db push

# 方法 2: 手动执行 SQL
# 在 Supabase Dashboard > SQL Editor 中依次执行：
# 1. migrations/001_initial_schema.sql
# 2. migrations/002_enable_rls.sql
# 3. migrations/003_login_logs.sql
```

### 3. 配置 Storage

```bash
# 在 Supabase Dashboard > Storage 中：
# 1. 创建新 bucket: "food-images"
# 2. 设置为 Private
# 3. 在 SQL Editor 中执行以下策略：
```

```sql
-- 允许认证用户上传图片
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 允许认证用户读取自己的图片
CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 允许认证用户删除自己的图片
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. 获取数据库凭证

在 Supabase Dashboard > Settings > API 中获取：

- `Project URL`: 用于 `NEXT_PUBLIC_SUPABASE_URL`
- `anon public`: 用于 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role`: 用于 `SUPABASE_SERVICE_ROLE_KEY`

## WhatsApp Business API 配置

### 1. 创建 Meta App

1. 访问 [Meta for Developers](https://developers.facebook.com)
2. 点击 "My Apps" > "Create App"
3. 选择 "Business" 类型
4. 填写应用信息并创建

### 2. 添加 WhatsApp 产品

1. 在应用 Dashboard 中点击 "Add Product"
2. 选择 "WhatsApp" 并点击 "Set Up"
3. 选择或创建 Business Account

### 3. 配置测试号码

1. 在 WhatsApp > Getting Started 中
2. 添加测试接收号码（您的手机号）
3. 验证接收到的验证码

### 4. 获取访问令牌

```bash
# 临时令牌（24小时有效）
# 在 WhatsApp > API Setup 中复制 "Temporary access token"

# 永久令牌（推荐用于生产）
# 1. 创建 System User
# 2. 分配 WhatsApp 权限
# 3. 生成永久令牌
```

### 5. 配置 Webhook

**重要：先部署应用到 Vercel，获取域名后再配置 Webhook**

1. 在 WhatsApp > Configuration 中
2. 点击 "Edit" Webhook
3. 填写信息：
   - Callback URL: `https://your-domain.com/api/webhook`
   - Verify Token: 自定义（记录到环境变量）
4. 订阅字段：
   - ✅ messages
   - ✅ message_status
5. 点击 "Verify and Save"

### 6. 获取 Phone Number ID

在 WhatsApp > API Setup 中：
- 复制 "Phone number ID"
- 用于 `WHATSAPP_PHONE_NUMBER_ID`

## Stripe 配置

### 1. 创建 Stripe 账号

1. 访问 [Stripe Dashboard](https://dashboard.stripe.com)
2. 完成账号注册和验证
3. 切换到测试模式进行配置

### 2. 创建产品

在 Stripe Dashboard > Products 中创建：

**Free Plan**
```
Name: Free Plan
Description: 每月 10 次食物识别
Price: $0.00 SGD
Billing: One-time
```

**Premium Plan**
```
Name: Premium Plan
Description: 每月 100 次食物识别
Price: $9.90 SGD
Billing: Monthly recurring
```

**Pro Plan**
```
Name: Pro Plan
Description: 无限次食物识别
Price: $29.90 SGD
Billing: Monthly recurring
```

### 3. 配置 Webhook

1. 在 Stripe Dashboard > Developers > Webhooks
2. 点击 "Add endpoint"
3. 填写信息：
   - Endpoint URL: `https://your-domain.com/api/stripe/webhook`
   - Description: Vita AI Production Webhook
4. 选择事件：
   ```
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   invoice.payment_succeeded
   invoice.payment_failed
   checkout.session.completed
   ```
5. 点击 "Add endpoint"
6. 复制 "Signing secret" 用于 `STRIPE_WEBHOOK_SECRET`

### 4. 获取 API 密钥

在 Stripe Dashboard > Developers > API keys 中：

**测试环境**
- Publishable key: `pk_test_...`
- Secret key: `sk_test_...`

**生产环境**（激活账号后）
- Publishable key: `pk_live_...`
- Secret key: `sk_live_...`

## Vercel 部署

### 1. 连接 Git 仓库

```bash
# 方法 1: 使用 Vercel CLI
vercel login
vercel

# 方法 2: 使用 Vercel Dashboard
# 1. 访问 https://vercel.com/new
# 2. 导入 Git 仓库
# 3. 配置项目设置
```

### 2. 配置环境变量

在 Vercel Dashboard > Settings > Environment Variables 中添加：

```bash
# 数据库
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# WhatsApp
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAAxx...
WHATSAPP_VERIFY_TOKEN=your-random-token
WHATSAPP_WEBHOOK_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-proj-xxx
OPENAI_MODEL=gpt-4o-mini

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# 安全
ENCRYPTION_KEY=your-32-byte-key-here-12345678
JWT_SECRET=your-jwt-secret

# 应用
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
LOG_LEVEL=info

# Sentry (可选)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Cron
CRON_SECRET=your-random-secret
```

**注意：** 为每个环境（Production, Preview, Development）分别配置

### 3. 配置 Cron Jobs

创建 `vercel.json`：

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 13 * * *"
    }
  ]
}
```

提交并推送：

```bash
git add vercel.json
git commit -m "Add cron configuration"
git push
```

### 4. 配置自定义域名

1. 在 Vercel Dashboard > Settings > Domains
2. 添加自定义域名
3. 配置 DNS 记录：
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. 等待 SSL 证书自动配置（约 5 分钟）

### 5. 部署

```bash
# 自动部署（推荐）
git push origin main

# 手动部署
vercel --prod
```

## 监控配置

### 1. Sentry 错误追踪

```bash
# 1. 创建 Sentry 项目
# 2. 获取 DSN
# 3. 配置环境变量
# 4. 测试错误追踪

curl -X POST https://your-domain.com/api/test-sentry
```

### 2. Vercel Analytics

1. 在 Vercel Dashboard > Analytics
2. 启用 Analytics
3. 配置性能预算

### 3. Uptime 监控

使用 [UptimeRobot](https://uptimerobot.com) 或类似服务：

```
Monitor Type: HTTP(s)
URL: https://your-domain.com/api/health
Interval: 5 minutes
Alert Contacts: your-email@example.com
```

## 验证部署

### 1. 健康检查

```bash
curl https://your-domain.com/api/health
# 预期输出: {"status":"ok","timestamp":"..."}
```

### 2. Webhook 验证

```bash
# WhatsApp Webhook
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=your-verify-token&hub.challenge=test"
# 预期输出: test

# Stripe Webhook
# 在 Stripe Dashboard > Webhooks 中点击 "Send test webhook"
```

### 3. 功能测试

```bash
# 发送测试消息到 WhatsApp 号码
# 1. 发送 "Hi" 应该收到欢迎消息
# 2. 发送图片应该触发食物识别
# 3. 发送 "/help" 应该收到帮助信息
```

### 4. 数据库测试

```bash
# 运行 RLS 验证
npm run verify:rls

# 检查数据是否正确保存
# 在 Supabase Dashboard > Table Editor 中查看
```

### 5. 支付测试

使用 Stripe 测试卡号：

```
Card Number: 4242 4242 4242 4242
Expiry: 任意未来日期
CVC: 任意 3 位数字
ZIP: 任意 5 位数字
```

## 故障排查

### Webhook 验证失败

```bash
# 检查日志
vercel logs <deployment-url>

# 常见问题：
# 1. Verify Token 不匹配
# 2. URL 配置错误
# 3. 防火墙阻止
```

### 数据库连接失败

```bash
# 检查环境变量
vercel env ls

# 测试连接
npm run test:db
```

### 图片上传失败

```bash
# 检查 Storage 策略
# 在 Supabase Dashboard > Storage > Policies

# 测试上传
npm run test:upload
```

### Cron Job 未执行

```bash
# 检查 Cron 配置
cat vercel.json

# 查看 Cron 日志
# Vercel Dashboard > Deployments > Functions > Cron
```

## 生产环境检查清单

部署前确认：

- [ ] 所有环境变量已配置
- [ ] 数据库迁移已完成
- [ ] RLS 策略已启用
- [ ] Storage 策略已配置
- [ ] WhatsApp Webhook 已验证
- [ ] Stripe Webhook 已验证
- [ ] 自定义域名已配置
- [ ] SSL 证书已生效
- [ ] Cron Jobs 已配置
- [ ] 监控已启用
- [ ] 备份已配置
- [ ] 测试已通过

部署后验证：

- [ ] 健康检查通过
- [ ] WhatsApp 消息正常接收
- [ ] 食物识别功能正常
- [ ] 支付流程正常
- [ ] 每日总结正常发送
- [ ] 错误追踪正常工作
- [ ] 性能监控正常
- [ ] 日志正常输出

## 回滚计划

如果部署出现问题：

```bash
# 方法 1: Vercel CLI
vercel rollback

# 方法 2: Vercel Dashboard
# Deployments > 选择上一个稳定版本 > Promote to Production
```

## 更新和维护

### 定期任务

- **每周**: 检查错误日志和性能指标
- **每月**: 更新依赖包，轮换 API 密钥
- **每季度**: 审查安全策略，优化成本

### 更新流程

```bash
# 1. 创建新分支
git checkout -b feature/update

# 2. 更新代码
# ... 进行修改 ...

# 3. 测试
npm run test
npm run build

# 4. 部署到预览环境
git push origin feature/update
# Vercel 会自动创建预览部署

# 5. 验证预览环境
# 测试所有功能

# 6. 合并到主分支
git checkout main
git merge feature/update
git push origin main
# 自动部署到生产环境
```

## 支持和资源

- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Stripe 文档](https://stripe.com/docs)
- [WhatsApp Business API 文档](https://developers.facebook.com/docs/whatsapp)
- [Next.js 文档](https://nextjs.org/docs)

## 联系方式

如有问题，请联系：
- 技术支持: support@your-domain.com
- 紧急联系: +65-xxxx-xxxx
