# 生产环境部署指南

本文档详细说明如何将 Vita AI 部署到生产环境。

## 前置条件

在开始部署之前，请确保您已经：

1. 拥有 Vercel 账号
2. 拥有 Supabase 项目
3. 拥有 Stripe 账号
4. 拥有 WhatsApp Business API 访问权限
5. 拥有 OpenAI API 密钥
6. 拥有 Upstash Redis 实例
7. 拥有 Sentry 项目（可选，用于错误追踪）

## 部署步骤

### 1. 配置 Vercel 项目

#### 1.1 创建 Vercel 项目

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 初始化项目
vercel
```

#### 1.2 配置环境变量

在 Vercel Dashboard 中配置以下环境变量：

**数据库配置**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**WhatsApp 配置**
```
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret
```

**OpenAI 配置**
```
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o-mini
```

**Stripe 配置**
```
STRIPE_SECRET_KEY=sk_live_your-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-publishable-key
```

**Redis 配置**
```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**安全配置**
```
ENCRYPTION_KEY=your-32-byte-encryption-key
JWT_SECRET=your-jwt-secret
```

**Sentry 配置（可选）**
```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

**其他配置**
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
LOG_LEVEL=info
```

#### 1.3 配置自定义域名

1. 在 Vercel Dashboard 中进入项目设置
2. 点击 "Domains"
3. 添加您的自定义域名
4. 按照提示配置 DNS 记录
5. 等待 SSL 证书自动配置

### 2. 配置 Supabase

#### 2.1 运行数据库迁移

```bash
# 连接到 Supabase 项目
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# 运行迁移脚本
\i migrations/001_initial_schema.sql
\i migrations/002_enable_rls.sql
\i migrations/003_login_logs.sql
```

#### 2.2 配置 Storage

1. 在 Supabase Dashboard 中创建 Storage Bucket
2. 创建名为 `food-images` 的 bucket
3. 配置 bucket 策略：

```sql
-- 允许认证用户上传图片
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允许认证用户读取自己的图片
CREATE POLICY "Users can read their own images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

#### 2.3 验证 RLS 策略

```bash
# 运行验证脚本
npm run verify:rls
```

### 3. 配置 Stripe

#### 3.1 创建产品和价格

1. 登录 Stripe Dashboard
2. 切换到生产模式
3. 创建以下产品：

**Free Plan**
- 名称: Free
- 价格: $0
- 描述: 每月 10 次识别

**Premium Plan**
- 名称: Premium
- 价格: $9.90/月
- 描述: 每月 100 次识别

**Pro Plan**
- 名称: Pro
- 价格: $29.90/月
- 描述: 无限次识别

#### 3.2 配置 Webhook

1. 在 Stripe Dashboard 中进入 "Developers" > "Webhooks"
2. 点击 "Add endpoint"
3. 输入 URL: `https://your-domain.com/api/stripe/webhook`
4. 选择以下事件：
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. 复制 Webhook 签名密钥并添加到环境变量

### 4. 配置 WhatsApp Business API

#### 4.1 设置 Webhook

1. 登录 Meta for Developers
2. 进入您的 WhatsApp Business App
3. 配置 Webhook URL: `https://your-domain.com/api/webhook`
4. 配置 Verify Token（与环境变量中的 `WHATSAPP_VERIFY_TOKEN` 一致）
5. 订阅以下字段：
   - `messages`
   - `message_status`

#### 4.2 验证 Webhook

```bash
# 测试 Webhook 验证
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=your-verify-token&hub.challenge=test-challenge"
```

### 5. 配置 Vercel Cron Jobs

#### 5.1 创建 vercel.json

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

注意：Vercel Cron 使用 UTC 时间，13:00 UTC = 21:00 SGT

#### 5.2 保护 Cron 端点

在 `/api/cron/daily-digest/route.ts` 中添加验证：

```typescript
// 验证请求来自 Vercel Cron
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

添加环境变量：
```
CRON_SECRET=your-random-secret
```

### 6. 部署到生产环境

#### 6.1 部署命令

```bash
# 部署到生产环境
vercel --prod

# 或者通过 Git 自动部署
git push origin main
```

#### 6.2 验证部署

1. 检查 Vercel Dashboard 中的部署状态
2. 访问您的域名确认网站可访问
3. 测试健康检查端点：

```bash
curl https://your-domain.com/api/health
```

### 7. 配置监控和告警

#### 7.1 Sentry 配置

1. 在 Sentry Dashboard 中创建项目
2. 配置告警规则：
   - 错误率超过 5%
   - 响应时间超过 10 秒
   - 每日成本超过预算

#### 7.2 Vercel Analytics

1. 在 Vercel Dashboard 中启用 Analytics
2. 配置性能预算
3. 设置告警通知

#### 7.3 Uptime 监控

使用 Vercel 的内置监控或第三方服务（如 UptimeRobot）：

```
监控 URL: https://your-domain.com/api/health
检查间隔: 5 分钟
告警方式: Email, SMS
```

### 8. 配置备份

#### 8.1 Supabase 自动备份

1. 在 Supabase Dashboard 中进入 "Database" > "Backups"
2. 启用自动备份
3. 配置备份保留期（建议 30 天）

#### 8.2 手动备份脚本

创建 `scripts/backup-database.sh`：

```bash
#!/bin/bash

# 配置
SUPABASE_PROJECT_REF="your-project-ref"
SUPABASE_PASSWORD="your-password"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump "postgresql://postgres:$SUPABASE_PASSWORD@db.$SUPABASE_PROJECT_REF.supabase.co:5432/postgres" \
  > "$BACKUP_DIR/backup_$DATE.sql"

# 压缩备份
gzip "$BACKUP_DIR/backup_$DATE.sql"

echo "Backup completed: $BACKUP_DIR/backup_$DATE.sql.gz"
```

### 9. 性能优化

#### 9.1 启用 Edge Functions

对于高频访问的 API，考虑使用 Vercel Edge Functions：

```typescript
// app/api/health/route.ts
export const runtime = 'edge';
```

#### 9.2 配置缓存

在 `next.config.ts` 中配置缓存策略：

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
};
```

#### 9.3 图片优化

确保使用 Next.js Image 组件：

```typescript
import Image from 'next/image';

<Image
  src="/food-image.jpg"
  alt="Food"
  width={800}
  height={600}
  quality={85}
  priority
/>
```

### 10. 安全检查清单

- [ ] 所有环境变量已配置
- [ ] RLS 策略已启用并测试
- [ ] Webhook 签名验证已实现
- [ ] API 速率限制已配置
- [ ] 敏感数据已加密
- [ ] 日志脱敏已实现
- [ ] HTTPS 已启用
- [ ] CORS 已正确配置
- [ ] CSP 头已配置
- [ ] 依赖包已更新到最新版本

### 11. 上线后检查

#### 11.1 功能测试

```bash
# 测试 WhatsApp Webhook
npm run test:webhook

# 测试食物识别
npm run test:recognition

# 测试支付流程
npm run test:payment
```

#### 11.2 性能测试

```bash
# 运行负载测试
npm run test:load

# 检查响应时间
npm run test:performance
```

#### 11.3 监控检查

1. 检查 Sentry 是否正常接收事件
2. 检查 Vercel Analytics 是否有数据
3. 检查 Uptime 监控是否正常
4. 检查日志是否正常输出

### 12. 回滚计划

如果部署出现问题，可以快速回滚：

```bash
# 回滚到上一个版本
vercel rollback
```

或在 Vercel Dashboard 中：
1. 进入 "Deployments"
2. 找到上一个稳定版本
3. 点击 "Promote to Production"

## 故障排查

### 常见问题

**1. Webhook 验证失败**
- 检查 `WHATSAPP_VERIFY_TOKEN` 是否正确
- 检查 Webhook URL 是否可访问
- 查看 Vercel 日志

**2. 数据库连接失败**
- 检查 Supabase URL 和密钥
- 检查 RLS 策略
- 检查网络连接

**3. Stripe Webhook 失败**
- 检查 Webhook 签名密钥
- 检查事件订阅配置
- 查看 Stripe Dashboard 中的 Webhook 日志

**4. 图片上传失败**
- 检查 Supabase Storage 配置
- 检查 bucket 策略
- 检查文件大小限制

**5. Cron Job 未执行**
- 检查 `vercel.json` 配置
- 检查 Cron 端点认证
- 查看 Vercel Cron 日志

## 联系支持

如果遇到无法解决的问题：

- Vercel 支持: https://vercel.com/support
- Supabase 支持: https://supabase.com/support
- Stripe 支持: https://support.stripe.com
- WhatsApp 支持: https://developers.facebook.com/support

## 更新日志

- 2024-01-15: 初始版本
- 2024-01-20: 添加 Cron Job 配置
- 2024-01-25: 添加安全检查清单
