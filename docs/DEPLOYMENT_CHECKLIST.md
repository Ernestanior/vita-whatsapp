# 🚀 部署检查清单

## 当前状态

✅ 已完成:
- WHATSAPP_APP_SECRET
- OPENAI_API_KEY

---

## 📋 必需配置（按优先级）

### 🔴 P0 - 核心功能必需（立即配置）

#### 1. WhatsApp Business API
```bash
# 你已有 WHATSAPP_APP_SECRET ✅
WHATSAPP_TOKEN=EAAxxxxxxxxx  # 从 Meta Dashboard 获取
WHATSAPP_PHONE_NUMBER_ID=123456789  # 你的 WhatsApp 号码 ID
WHATSAPP_VERIFY_TOKEN=your_custom_token  # 自己设置（任意字符串）
```

**获取方式**:
1. 登录 [Meta for Developers](https://developers.facebook.com/)
2. 选择你的 WhatsApp Business App
3. 进入 **WhatsApp** → **API Setup**
4. 复制 **Temporary access token** (WHATSAPP_TOKEN)
5. 复制 **Phone number ID** (WHATSAPP_PHONE_NUMBER_ID)
6. 自己设置一个随机字符串作为 WHATSAPP_VERIFY_TOKEN

#### 2. Supabase 数据库
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**获取方式**:
1. 登录 [Supabase](https://supabase.com/)
2. 选择你的项目（或创建新项目）
3. 进入 **Settings** → **API**
4. 复制 **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
5. 复制 **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
6. 复制 **service_role** key (SUPABASE_SERVICE_KEY)

#### 3. Upstash Redis 缓存
```bash
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=AXxxxxxxxxxxxx
```

**获取方式**:
1. 登录 [Upstash](https://upstash.com/)
2. 创建新的 Redis 数据库（选择免费套餐）
3. 进入数据库详情页
4. 复制 **REST URL** (UPSTASH_REDIS_URL)
5. 复制 **REST Token** (UPSTASH_REDIS_TOKEN)

---

### 🟡 P1 - 支付功能（如需订阅功能）

#### 4. Stripe 支付
```bash
STRIPE_SECRET_KEY=sk_test_xxx  # 测试环境用 sk_test，生产用 sk_live
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

**获取方式**:
1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers** → **API keys**
3. 复制 **Secret key** (STRIPE_SECRET_KEY)
4. 复制 **Publishable key** (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
5. 进入 **Webhooks** → 创建 endpoint → 复制 **Signing secret** (STRIPE_WEBHOOK_SECRET)

**可选配置**（如果要使用订阅）:
```bash
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
```

---

### 🟢 P2 - 可选配置

#### 5. 安全加密（推荐）
```bash
ENCRYPTION_KEY=your_64_character_hex_key
```

**生成方式**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 6. 监控（可选）
```bash
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

#### 7. 其他配置
```bash
# Cron Jobs 密钥（用于定时任务）
CRON_SECRET=your_random_secret

# 功能开关
ENABLE_CACHING=true
ENABLE_COST_ALERTS=true
MAX_DAILY_COST=100

# 应用配置
NEXT_PUBLIC_URL=http://localhost:3000  # 开发环境
NODE_ENV=development
LOG_LEVEL=info
```

---

## 📝 完整的 .env 模板

复制以下内容到你的 `.env` 文件：

```bash
# ============================================================================
# AI API
# ============================================================================
OPENAI_API_KEY=sk-proj-xxx  # ✅ 你已配置
OPENAI_ORG_ID=  # 可选

# ============================================================================
# WhatsApp Cloud API
# ============================================================================
WHATSAPP_APP_SECRET=xxx  # ✅ 你已配置
WHATSAPP_TOKEN=EAAxxxxxxxxx  # ⏳ 需要配置
WHATSAPP_PHONE_NUMBER_ID=123456789  # ⏳ 需要配置
WHATSAPP_VERIFY_TOKEN=your_custom_token  # ⏳ 需要配置

# ============================================================================
# Supabase Database
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # ⏳ 需要配置
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ⏳ 需要配置
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # ⏳ 需要配置

# ============================================================================
# Upstash Redis Cache
# ============================================================================
UPSTASH_REDIS_URL=https://xxx.upstash.io  # ⏳ 需要配置
UPSTASH_REDIS_TOKEN=AXxxxxxxxxxxxx  # ⏳ 需要配置

# ============================================================================
# Stripe Payment (可选 - 如需订阅功能)
# ============================================================================
STRIPE_SECRET_KEY=sk_test_xxx  # 可选
STRIPE_WEBHOOK_SECRET=whsec_xxx  # 可选
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # 可选
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_xxx  # 可选
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_xxx  # 可选
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx  # 可选
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx  # 可选

# ============================================================================
# Security
# ============================================================================
ENCRYPTION_KEY=  # 可选，生成命令见上方

# ============================================================================
# Monitoring (可选)
# ============================================================================
SENTRY_DSN=  # 可选
NEXT_PUBLIC_SENTRY_DSN=  # 可选

# ============================================================================
# Cron Jobs
# ============================================================================
CRON_SECRET=your_random_secret  # 可选

# ============================================================================
# Feature Flags
# ============================================================================
ENABLE_CACHING=true
ENABLE_COST_ALERTS=true
MAX_DAILY_COST=100

# ============================================================================
# App Config
# ============================================================================
NEXT_PUBLIC_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
```

---

## 🎯 最小可运行配置

如果你只想快速测试，最少需要这些：

```bash
# AI
OPENAI_API_KEY=sk-proj-xxx  # ✅

# WhatsApp
WHATSAPP_APP_SECRET=xxx  # ✅
WHATSAPP_TOKEN=xxx  # ⏳
WHATSAPP_PHONE_NUMBER_ID=xxx  # ⏳
WHATSAPP_VERIFY_TOKEN=xxx  # ⏳

# Database
NEXT_PUBLIC_SUPABASE_URL=xxx  # ⏳
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx  # ⏳
SUPABASE_SERVICE_KEY=xxx  # ⏳

# Cache
UPSTASH_REDIS_URL=xxx  # ⏳
UPSTASH_REDIS_TOKEN=xxx  # ⏳

# App
NEXT_PUBLIC_URL=http://localhost:3000
NODE_ENV=development
ENABLE_CACHING=true
```

---

## 📊 配置进度

- [x] OPENAI_API_KEY
- [x] WHATSAPP_APP_SECRET
- [ ] WHATSAPP_TOKEN
- [ ] WHATSAPP_PHONE_NUMBER_ID
- [ ] WHATSAPP_VERIFY_TOKEN
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_KEY
- [ ] UPSTASH_REDIS_URL
- [ ] UPSTASH_REDIS_TOKEN
- [ ] STRIPE_SECRET_KEY (可选)
- [ ] ENCRYPTION_KEY (可选)

---

## 🚀 下一步行动

### 1. 配置必需的环境变量（P0）

按照上面的指南，依次配置：
1. WhatsApp 剩余的 3 个变量
2. Supabase 的 3 个变量
3. Upstash Redis 的 2 个变量

### 2. 执行数据库迁移

配置好 Supabase 后，运行迁移：

```bash
# 连接到 Supabase 数据库
# 方式1: 使用 Supabase CLI
supabase db push

# 方式2: 使用 psql
psql "your_supabase_connection_string" -f migrations/001_initial_schema.sql
psql "your_supabase_connection_string" -f migrations/002_enable_rls.sql
# ... 依次执行所有迁移
```

或者在 Supabase Dashboard 的 SQL Editor 中手动执行每个迁移文件。

### 3. 安装依赖

```bash
npm install
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 测试配置

```bash
# 测试环境变量
npm run test:env

# 测试 API 连接
npm run test:apis
```

---

## ⚠️ 重要提示

1. **不要提交 .env 到 Git**
   - 确保 `.gitignore` 包含 `.env`
   - 只提交 `.env.example`

2. **生产环境使用不同的密钥**
   - 开发: `sk_test_`, `pk_test_`
   - 生产: `sk_live_`, `pk_live_`

3. **定期轮换密钥**
   - 建议每 3-6 个月轮换一次
   - 特别是 WHATSAPP_APP_SECRET 和 API keys

4. **设置预算限制**
   - OpenAI: 设置月度预算
   - Stripe: 设置测试模式限制

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 `docs/SETUP_SECRETS_GUIDE.md`
2. 查看 `docs/ENVIRONMENT_VARIABLES.md`
3. 运行 `npm run test:env` 查看哪些变量缺失

---

*最后更新: 2026年2月14日*
