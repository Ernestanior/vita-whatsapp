# 环境变量配置清单

本文档列出了 Vita AI 所需的所有环境变量。

## 必需的环境变量

### 数据库配置

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGc...` | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | `eyJhbGc...` | Supabase Dashboard > Settings > API |

### WhatsApp Business API

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `WHATSAPP_API_URL` | WhatsApp API 基础 URL | `https://graph.facebook.com/v18.0` | 固定值 |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp 电话号码 ID | `123456789` | Meta for Developers > WhatsApp > API Setup |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp 访问令牌 | `EAAxx...` | Meta for Developers > WhatsApp > API Setup |
| `WHATSAPP_VERIFY_TOKEN` | Webhook 验证令牌 | `your-random-token` | 自定义（建议使用随机字符串） |
| `WHATSAPP_WEBHOOK_SECRET` | Webhook 签名密钥 | `your-secret-key` | Meta for Developers > WhatsApp > Configuration |

### OpenAI API

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-proj-xxx` | OpenAI Dashboard > API Keys |
| `OPENAI_MODEL` | 使用的模型 | `gpt-4o-mini` | 固定值或自定义 |

### Stripe 支付

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `STRIPE_SECRET_KEY` | Stripe 密钥 | `sk_live_xxx` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_PUBLISHABLE_KEY` | Stripe 可发布密钥 | `pk_live_xxx` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名密钥 | `whsec_xxx` | Stripe Dashboard > Developers > Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 客户端可发布密钥 | `pk_live_xxx` | 与 `STRIPE_PUBLISHABLE_KEY` 相同 |

### Redis 缓存

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | `https://xxx.upstash.io` | Upstash Dashboard > Database > REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | `AXxx...` | Upstash Dashboard > Database > REST API |

### 安全配置

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `ENCRYPTION_KEY` | 数据加密密钥（32 字节） | `your-32-byte-key-here-12345678` | 自定义（使用 `openssl rand -hex 32` 生成） |
| `JWT_SECRET` | JWT 签名密钥 | `your-jwt-secret` | 自定义（使用随机字符串） |

### 应用配置

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `NODE_ENV` | 运行环境 | `production` | 固定值 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | `https://your-domain.com` | 您的域名 |
| `LOG_LEVEL` | 日志级别 | `info` | `debug`, `info`, `warn`, `error` |

## 可选的环境变量

### Sentry 错误追踪

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` | Sentry Dashboard > Settings > Client Keys |
| `SENTRY_AUTH_TOKEN` | Sentry 认证令牌 | `sntrys_xxx` | Sentry Dashboard > Settings > Auth Tokens |
| `SENTRY_ORG` | Sentry 组织名 | `your-org` | Sentry Dashboard > Settings > Organization |
| `SENTRY_PROJECT` | Sentry 项目名 | `your-project` | Sentry Dashboard > Settings > Projects |

### Cron Job 保护

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `CRON_SECRET` | Cron 端点认证密钥 | `your-random-secret` | 自定义（使用随机字符串） |

### 成本监控

| 变量名 | 描述 | 示例 | 获取方式 |
|--------|------|------|----------|
| `DAILY_COST_BUDGET` | 每日成本预算（美元） | `50` | 自定义 |
| `COST_ALERT_THRESHOLD` | 成本告警阈值（0-1） | `0.8` | 自定义（80% 时告警） |

## 环境变量生成脚本

### 生成加密密钥

```bash
# 生成 32 字节加密密钥
openssl rand -hex 32

# 生成 JWT 密钥
openssl rand -base64 32

# 生成 Webhook 验证令牌
openssl rand -base64 24
```

### 验证环境变量

创建 `scripts/verify-env.ts`：

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // 数据库
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // WhatsApp
  WHATSAPP_API_URL: z.string().url(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

  // 安全
  ENCRYPTION_KEY: z.string().length(64), // 32 字节 hex = 64 字符
  JWT_SECRET: z.string().min(32),

  // 应用
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // 可选
  SENTRY_DSN: z.string().url().optional(),
  CRON_SECRET: z.string().optional(),
  DAILY_COST_BUDGET: z.string().optional(),
});

try {
  envSchema.parse(process.env);
  console.log('✅ All environment variables are valid');
} catch (error) {
  console.error('❌ Environment variable validation failed:');
  console.error(error);
  process.exit(1);
}
```

运行验证：

```bash
npx tsx scripts/verify-env.ts
```

## 不同环境的配置

### 开发环境 (.env.local)

```bash
# 使用测试密钥和本地服务
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
LOG_LEVEL=debug

# 使用 Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 预发布环境 (.env.staging)

```bash
# 使用预发布域名
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.your-domain.com
LOG_LEVEL=info

# 使用 Stripe 测试密钥
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 生产环境 (Vercel Environment Variables)

```bash
# 使用生产域名
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
LOG_LEVEL=info

# 使用 Stripe 生产密钥
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

## 安全最佳实践

1. **永远不要提交 `.env` 文件到 Git**
   - 确保 `.env*` 在 `.gitignore` 中
   - 只提交 `.env.example` 作为模板

2. **使用强随机密钥**
   - 使用 `openssl` 或其他工具生成
   - 至少 32 字节长度

3. **定期轮换密钥**
   - 每 90 天轮换一次敏感密钥
   - 使用密钥管理服务（如 AWS Secrets Manager）

4. **限制密钥访问权限**
   - 只给必要的团队成员访问权限
   - 使用 Vercel 的环境变量加密

5. **监控密钥使用**
   - 启用 API 密钥使用监控
   - 设置异常使用告警

## 故障排查

### 环境变量未生效

1. 检查变量名是否正确（区分大小写）
2. 重启开发服务器
3. 清除 Next.js 缓存：`rm -rf .next`
4. 检查 Vercel 环境变量是否已保存

### 客户端无法访问环境变量

- 确保变量名以 `NEXT_PUBLIC_` 开头
- 重新构建应用

### Vercel 部署失败

1. 检查所有必需的环境变量是否已配置
2. 运行 `npx tsx scripts/verify-env.ts` 验证
3. 查看 Vercel 部署日志

## 参考资料

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
