# Vita AI — 开发者文档

## 快速开始

```bash
git clone <repo-url>
cd vita-whatsapp
npm install
cp .env.example .env.local   # 填写环境变量
npm run dev                   # http://localhost:3000
```

**技术栈**: Next.js 16 (App Router) + TypeScript + Supabase (PostgreSQL) + OpenAI GPT-4o-mini + Google Gemini 2.0 Flash + Stripe + Upstash Redis + sharp
**部署**: Vercel (Serverless)
**包管理**: npm

---

## 一、项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts              ← WhatsApp Webhook 入口
│   │   ├── stripe/
│   │   │   ├── webhook/route.ts          ← Stripe Webhook
│   │   │   ├── create-subscription/route.ts
│   │   │   ├── cancel-subscription/route.ts
│   │   │   ├── billing-portal/route.ts
│   │   │   └── products/route.ts
│   │   ├── dashboard/
│   │   │   ├── stats/route.ts
│   │   │   ├── history/route.ts
│   │   │   └── export/route.ts
│   │   ├── cron/
│   │   │   ├── meal-reminder/route.ts    ← Vercel Cron 用餐提醒
│   │   │   ├── daily-digest/route.ts     ← Vercel Cron 每日摘要
│   │   │   └── weekly-trend/route.ts     ← Vercel Cron 每周趋势
│   │   ├── auth/
│   │   │   ├── send-login-link/route.ts  ← 发送登录链接
│   │   │   └── verify-token/route.ts     ← 验证登录 token
│   │   ├── feedback/
│   │   │   ├── submit/route.ts           ← 提交反馈
│   │   │   ├── report/route.ts           ← 反馈报告
│   │   │   └── stats/route.ts            ← 反馈统计
│   │   ├── health/route.ts               ← 健康检查
│   │   ├── monitoring/metrics/route.ts   ← 监控指标
│   │   └── debug-logs/route.ts           ← ⚠️ 生产环境需移除
│   │   # ⚠️ 还有 29 个 test-* 路由待清理（如 test-image/, test-webhook-* 等）
│   └── ...
├── lib/
│   ├── whatsapp/
│   │   ├── client.ts                     ← WhatsApp Cloud API 封装
│   │   ├── webhook-handler.ts            ← 消息路由（签名验证→用户查找→分发）
│   │   ├── message-router.ts             ← 消息类型分发（文字/图片/交互/语音）
│   │   ├── text-handler.ts               ← 文字消息（命令匹配 + AI意图 + 食物记录）
│   │   ├── image-handler.ts              ← 图片消息（下载→压缩→识别→评分→存储）
│   │   ├── interactive-handler.ts        ← 按钮回调（详情/修改/忽略/导航）
│   │   ├── response-formatter-sg.ts      ← 响应格式化（简洁版 + 详情版）
│   │   └── messages-sg.ts               ← 消息模板（新加坡本地化）
│   ├── food-recognition/
│   │   ├── recognizer.ts                 ← GPT-4o-mini Vision 调用
│   │   ├── image-handler.ts              ← sharp 压缩 + hash 计算
│   │   └── prompts.ts                    ← System/User prompt 模板
│   ├── rating/
│   │   └── rating-engine.ts              ← 健康评分（6因子加权）
│   ├── ai/
│   │   ├── unified-intent-detector.ts    ← 统一意图识别（单次AI调用，Gemini → OpenAI fallback）
│   │   └── intelligent-conversation.ts   ← 智能对话（非食物相关的AI回复）
│   ├── profile/
│   │   └── profile-manager.ts            ← 健康档案 CRUD + 多步骤设置流程
│   ├── digest/
│   │   └── daily-digest-generator.ts     ← 每日摘要生成
│   ├── gamification/
│   │   ├── gamification-manager.ts      ← 打卡/成就管理（使用 streak-manager-fixed）
│   │   └── index.ts                     ← 导出
│   ├── context/
│   │   └── context-manager.ts            ← 上下文理解（用餐提醒判断等）
│   ├── stripe/
│   │   ├── client.ts                     ← Stripe SDK 初始化
│   │   └── stripe-manager.ts             ← 订阅管理 + Webhook 处理
│   ├── phase3/
│   │   ├── types.ts                      ← Phase3 类型定义
│   │   ├── service-container.ts          ← 服务容器（懒加载初始化）
│   │   ├── commands/
│   │   │   └── command-handler.ts        ← Phase3 命令处理（streak/budget/settings）
│   │   └── services/
│   │       ├── streak-manager-fixed.ts   ← 打卡连续天数
│   │       ├── budget-tracker.ts         ← 每日热量预算
│   │       ├── preference-manager.ts     ← 饮食偏好 + 过敏警告
│   │       └── feature-discovery-engine.ts ← 功能发现引导
│   ├── food-record/
│   │   ├── food-record-manager.ts       ← 食物记录 CRUD
│   │   └── history-manager.ts           ← 历史查询
│   ├── database/
│   │   ├── schema.ts                    ← 数据库 schema 定义
│   │   └── functions.ts                 ← 数据库函数调用
│   ├── cache/
│   │   └── cache-manager.ts             ← Upstash Redis 缓存
│   ├── redis/
│   │   └── client.ts                    ← Redis 客户端初始化
│   ├── supabase/
│   │   └── server.ts                    ← Supabase 服务端客户端
│   ├── openai/
│   │   └── client.ts                    ← OpenAI SDK 初始化
│   ├── security/
│   │   ├── rate-limiter.ts              ← 速率限制
│   │   ├── encryption.ts               ← 数据加密
│   │   ├── middleware.ts                ← 安全中间件
│   │   └── login-monitor.ts            ← 登录监控
│   ├── error/
│   │   ├── error-handler.ts             ← 统一错误处理
│   │   └── retry-manager.ts             ← 重试逻辑
│   ├── logging/
│   │   └── logger.ts                    ← 日志工具
│   ├── monitoring/
│   │   └── sentry.ts                    ← Sentry 错误监控
│   ├── cost/
│   │   ├── cost-monitor.ts              ← API 成本追踪
│   │   └── cost-optimizer.ts            ← 成本优化策略
│   ├── network/
│   │   ├── network-optimizer.ts         ← 网络请求优化
│   │   └── offline-cache.ts             ← 离线缓存
│   ├── i18n/
│   │   ├── translations.ts              ← 多语言翻译
│   │   └── food-names.ts               ← 食物名称翻译
│   ├── language/
│   │   └── detector.ts                  ← 语言检测
│   ├── feedback/
│   │   └── feedback-manager.ts          ← 用户反馈收集
│   └── subscription/
│       └── subscription-manager.ts      ← 订阅层级/配额逻辑
├── config/
│   └── env.ts                            ← 环境变量验证
├── types/
│   ├── index.ts                          ← 核心类型定义
│   └── whatsapp.ts                       ← WhatsApp 消息类型
└── utils/
    └── logger.ts                         ← 日志工具
```

---

## 二、核心流程

### 2.1 消息处理主流程

```
POST /api/webhook
  → webhookHandler.handleWebhook(payload, rawBody, signature)
    → HMAC SHA-256 签名验证
    → 提取 messages[] 和 contacts[]
    → 查找/创建用户 (users 表)
    → 根据 message.type 路由:
```

| 消息类型 | Handler | 处理逻辑 |
|---------|---------|---------|
| `text` | TextHandler | 命令匹配 → 设置流程检查 → AI意图识别 → 文字食物记录 |
| `image` | ImageHandler | 下载 → sharp压缩 → hash缓存检查 → GPT-4o-mini Vision → 评分 → 存储 |
| `audio` | AudioHandler | 下载 → Whisper转录 → 进入TextHandler文字食物流程 |
| `interactive` | InteractiveHandler | 解析button_reply.id → detail/modify/ignore/navigation |

### 2.2 图片食物识别流程

```typescript
// ImageHandler.handle()
1. whatsappClient.downloadMedia(mediaId)        // 下载原图
2. imageHandler.validateImage(buffer)            // 验证格式
3. imageHandler.processImage(buffer)             // sharp压缩 + hash
4. cacheManager.get(hash)                        // Redis缓存检查
5. recognizer.recognizeFood(buffer, context)     // GPT-4o-mini Vision
6. ratingEngine.evaluate(result, profile)        // 健康评分
7. supabase.insert('food_records', {...})         // 自动存储
8. gamificationManager.updateStreak(userId)      // 更新打卡
9. responseFormatterSG.formatResponse(...)       // 格式化简洁回复
10. whatsappClient.sendButtonMessage(...)        // 发送结果+按钮
```

### 2.3 文字命令识别流程

```typescript
// TextHandler.handle()
1. recognizeCommand(text)                        // 精确匹配（快速路径）
   ├── 命中 → 执行对应命令
   └── 未命中 → 检查是否在设置流程中
       ├── 是 → profileManager.processSetupInput()
       └── 否 → unifiedIntentDetector.detect(text)  // 单次AI统一意图识别
           ├── FOOD_LOG → tryTextFoodLog()           // 文字食物记录
           ├── MEAL_ADVICE → tryMealAdvice()         // 餐前建议
           ├── PROFILE_UPDATE → handleProfileUpdate() // 档案更新
           ├── STATS/HISTORY/PROFILE/... → 执行命令
           └── GENERAL → handleGeneralChat()         // 通用对话
```

### 2.4 AI统一意图识别（单次调用）

```
用户输入 → Gemini 2.0 Flash (便宜快速)
         → 失败? → GPT-4o-mini (稳定)
         → 都失败? → 返回 GENERAL
```

单次调用同时完成：意图分类 + 结构化数据提取（食物名/数量/档案字段等）

可识别意图: START, HELP, PROFILE, STATS, HISTORY, SETTINGS, FOOD_LOG, MEAL_ADVICE, PROFILE_UPDATE, QUICK_SETUP, GREETING, STREAK, BUDGET, GENERAL

---

## 三、数据库 Schema

### 3.1 核心表

```sql
-- 用户
users (id UUID PK, phone_number TEXT UNIQUE, language TEXT DEFAULT 'en', created_at, updated_at)

-- 健康档案
health_profiles (id UUID PK, user_id FK→users, height, weight, age, gender,
                 goal TEXT, activity_level TEXT, digest_time TEXT DEFAULT '21:00',
                 quick_mode BOOLEAN DEFAULT true)

-- 食物记录 (核心业务表)
food_records (id UUID PK, user_id FK→users,
              image_url TEXT NULL,           -- 文字/语音记录时为null
              image_hash TEXT NULL,          -- 文字/语音记录时为null
              recognition_result JSONB,      -- FoodRecognitionResult
              health_rating JSONB,           -- HealthRating
              meal_context VARCHAR,          -- breakfast/lunch/dinner/snack
              created_at TIMESTAMPTZ)

-- 订阅
subscriptions (id UUID PK, user_id FK→users, tier TEXT, status TEXT,
               stripe_subscription_id TEXT, stripe_customer_id TEXT,
               current_period_start, current_period_end)

-- 每日配额
usage_quotas (id UUID PK, user_id FK→users, date DATE,
              recognitions_used INT DEFAULT 0, recognitions_limit INT DEFAULT 3,
              UNIQUE(user_id, date))
```

### 3.2 游戏化表

```sql
-- 打卡
user_streaks (id UUID PK, user_id FK UNIQUE, current_streak INT DEFAULT 0,
              longest_streak INT DEFAULT 0, last_checkin_date DATE,
              total_checkins INT DEFAULT 0, freeze_cards INT DEFAULT 1)

-- 每日预算
daily_budgets (id UUID PK, user_id FK, date DATE, calorie_target INT,
               calories_consumed INT DEFAULT 0, UNIQUE(user_id, date))

-- 成就
achievements (id UUID PK, user_id FK, achievement_code TEXT,
              achievement_tier TEXT, unlocked_at TIMESTAMPTZ)

-- 提醒
reminders (id UUID PK, user_id FK, meal_type TEXT, reminder_time TIME,
           is_active BOOLEAN DEFAULT true, quiet_start TIME, quiet_end TIME)
```

### 3.3 辅助表

```sql
-- 设置会话 (多步骤引导, 1小时过期)
profile_setup_sessions (id UUID PK, user_id FK UNIQUE, current_step TEXT,
                        collected_data JSONB DEFAULT '{}', expires_at TIMESTAMPTZ)

-- 用户偏好
user_preferences (id UUID PK, user_id FK UNIQUE, dietary_type TEXT,
                  allergies TEXT[], favorite_foods TEXT[], disliked_foods TEXT[])

-- 饮食模式 (学习用户习惯)
dietary_patterns (id UUID PK, user_id FK UNIQUE,
                  typical_breakfast_time TIME, typical_lunch_time TIME,
                  typical_dinner_time TIME, avg_daily_calories NUMERIC)

-- API成本追踪
api_usage (id UUID PK, user_id, model TEXT, tokens_used INT,
           estimated_cost NUMERIC, endpoint TEXT, created_at)

-- Stripe事件幂等
stripe_events (id UUID PK, event_id TEXT UNIQUE, event_type TEXT, processed_at)

-- 用户反馈
user_feedback (id UUID PK, user_id FK, food_record_id FK,
               feedback_type TEXT, feedback_data JSONB)
```

### 3.4 关键数据库函数

```sql
-- 原子配额检查（FOR UPDATE行锁防并发）
check_and_increment_quota(p_user_id UUID, p_date DATE, p_limit INT)
  → RETURNS {allowed: boolean, used: int, limit: int}

-- 更新打卡连续天数
update_user_streak(p_user_id UUID)
  → RETURNS {current_streak, longest_streak, is_new_record}
```

### 3.5 迁移文件执行顺序

```
supabase/migrations/
├── 001_initial_schema.sql           — 核心表 + 索引 + 触发器
├── 002_enable_rls.sql               — RLS策略
├── 003_login_logs.sql               — 登录日志
├── 004_feedback_system.sql          — 反馈系统
├── 005_gamification_system.sql      — 游戏化基础
├── 006_context_understanding.sql    — user_preferences + dietary_patterns
├── 007_cost_monitoring.sql          — api_usage + cost_metrics + cost_alerts
├── 008_fix_quota_race_condition.sql — check_and_increment_quota 原子函数
├── 009_stripe_events.sql            — Stripe幂等
├── 010_profile_setup_sessions.sql   — 多步骤设置会话
└── 011_phase3_FINAL.sql             — Phase3全部（预算/成就/提醒/卡片/功能发现）
```

⚠️ 部署后还需手动执行:
```sql
ALTER TABLE food_records ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE food_records ALTER COLUMN image_hash DROP NOT NULL;
```

---

## 四、API 参考

### 4.1 WhatsApp Webhook

```
GET  /api/webhook?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=xxx
  → Webhook验证，返回challenge

POST /api/webhook
  → 接收WhatsApp消息，签名验证后处理
  Headers: X-Hub-Signature-256
  Body: WhatsApp Cloud API payload
```

### 4.2 Stripe API

```
GET  /api/stripe/products
  → 返回订阅产品列表和价格

POST /api/stripe/create-subscription
  Body: { userId, email, priceId, tier }
  → 创建Stripe订阅，返回clientSecret

POST /api/stripe/cancel-subscription
  Body: { userId }
  → 取消订阅（期末生效）

POST /api/stripe/billing-portal
  Body: { userId }
  → 返回Stripe Billing Portal URL

POST /api/stripe/webhook
  Headers: stripe-signature
  → 处理Stripe事件（subscription.created/updated/deleted, payment成功/失败）
```

### 4.3 Dashboard API

```
GET /api/dashboard/stats
  Headers: Authorization: Bearer <session_token>
  → 返回今日营养、目标、本周统计、订阅状态、配额

GET /api/dashboard/history
  Headers: Authorization: Bearer <session_token>
  → 返回饮食记录历史

GET /api/dashboard/export
  Headers: Authorization: Bearer <session_token>
  → 导出用户数据
```

### 4.4 Cron

```
GET /api/cron/meal-reminder
  Headers: Authorization: Bearer <CRON_SECRET>
  → 检查所有用户，发送用餐提醒
  → Vercel Cron 定时触发

GET /api/cron/daily-digest
  Headers: Authorization: Bearer <CRON_SECRET>
  → 生成并发送每日健康摘要

GET /api/cron/weekly-trend
  Headers: Authorization: Bearer <CRON_SECRET>
  → 生成并发送每周趋势报告
```

---

## 五、环境变量

```env
# === AI ===
OPENAI_API_KEY=               # GPT-4o-mini (Vision + 文字识别 + Whisper)
GOOGLE_AI_API_KEY=            # Gemini 2.0 Flash (意图识别, 更便宜)

# === WhatsApp Cloud API ===
WHATSAPP_TOKEN=               # 永久Token或临时Token
WHATSAPP_PHONE_NUMBER_ID=     # 电话号码ID
WHATSAPP_VERIFY_TOKEN=        # Webhook验证Token (自定义字符串)
WHATSAPP_APP_SECRET=          # App Secret (用于签名验证)

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=     # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Anon Key (前端)
SUPABASE_SERVICE_KEY=         # Service Role Key (后端, 绕过RLS)

# === Stripe ===
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PREMIUM_MONTHLY_PRICE_ID=
STRIPE_PREMIUM_YEARLY_PRICE_ID=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=

# === Redis ===
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# === App ===
NEXT_PUBLIC_URL=              # 部署URL
NODE_ENV=                     # development / production / test
LOG_LEVEL=                    # debug / info / warn / error
CRON_SECRET=                  # Cron Job 认证密钥
```

⚠️ 注意: `gamification-manager.ts` 使用 `SUPABASE_SERVICE_ROLE_KEY` 而非 `SUPABASE_SERVICE_KEY`，详见"已知问题 #3"。

---

## 六、关键设计决策

### 6.1 AI模型选择

| 用途 | 模型 | 原因 |
|------|------|------|
| 食物识别(图片) | GPT-4o-mini Vision | 视觉理解能力强，性价比高 |
| 食物识别(文字) | GPT-4o-mini | 同上 |
| 语音转文字 | OpenAI Whisper | 多语言支持好 |
| 意图识别 | Gemini 2.0 Flash → GPT-4o-mini fallback | Gemini更便宜更快，OpenAI更稳定 |

### 6.2 缓存策略

- 图片通过 sharp 处理后计算 hash
- 相同 hash 的图片直接返回 Redis 缓存结果
- 避免重复调用 Vision API（最贵的调用）

### 6.3 配额并发控制

```sql
-- 使用 FOR UPDATE 行锁
SELECT * FROM usage_quotas WHERE user_id = $1 AND date = $2 FOR UPDATE;
-- 检查 + 递增在同一事务内完成
```

### 6.4 响应格式

默认简洁（一行式）:
```
🟢 *鸡饭*
520 kcal · 75/100
🔥 3 day streak
💰 980 kcal left today

💡 Try less rice next time
```

点击"详情"后展开完整营养分解。

### 6.5 WhatsApp 按钮限制

WhatsApp Interactive Buttons 最多3个按钮，每个标题最多20字符。当前使用:
- `detail_{recordId}` → "📊 Details"
- `modify_{recordId}` → "✏️ Modify"
- `ignore_{recordId}` → "❌ Ignore"

---

## 七、已知问题

1. **配额检查临时禁用** — `ImageHandler` 中 quota 检查被注释掉，测试完需恢复
2. **debug-logs 路由** — 生产环境应移除或加认证
3. **环境变量不一致** — `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SERVICE_KEY`，需统一
4. **meal_context 列冲突** — 001迁移定义 VARCHAR CHECK，011迁移又添加 JSONB 类型
5. **achievements 表重复定义** — 001 和 011 迁移结构不同（001有UNIQUE，011有tier）
6. **007迁移 SQL 语法** — 部分函数用 `$` 而非 `$$` 作分隔符
7. **Stripe 价格ID** — 使用占位符字符串，需替换为真实 Stripe Price ID
8. **测试路由过多** — `src/app/api/` 下仍有 29 个 test-* 路由，生产环境应清理
9. **__tests__ 类型错误** — 测试文件有 Supabase `never` 类型和缺少 jest/vitest 声明的问题

---

## 八、已清理的功能

以下功能已在代码清理中移除（代码和类型定义均已删除）：

| 已删除 | 原因 |
|--------|------|
| `card-generator.ts` (营养卡片) | 纯 stub，社交分享需求不明确 |
| `reminder-service.ts` (定时提醒服务) | 与 cron job 功能重复 |
| `comparison-engine.ts` (饮食对比) | 复杂度高，用户需求不明确 |
| CARD/REMINDERS/COMPARE/PROGRESS/PREFERENCES 意图 | 对应功能已删除 |
| `/card` `/compare` `/progress` `/reminders` `/preferences` 命令 | 对应功能已删除 |

保留的 Phase 3 功能：Streak（打卡）、Budget（热量预算）、Preferences（饮食偏好/过敏警告）、Settings（用户设置）
