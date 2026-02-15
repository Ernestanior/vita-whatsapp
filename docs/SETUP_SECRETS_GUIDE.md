# 🔐 密钥配置快速指南

## 两个重要的新增密钥

在bug修复中，我们添加了两个重要的安全配置。

---

## 1. WHATSAPP_APP_SECRET

### 🎯 用途
验证 WhatsApp Webhook 请求的真实性，防止伪造攻击。

### 📍 获取方法

**步骤 1**: 登录 [Meta for Developers](https://developers.facebook.com/)

**步骤 2**: 选择你的 WhatsApp Business App

**步骤 3**: 进入 **Settings** → **Basic**

**步骤 4**: 找到 **App Secret** 字段，点击 **Show**

**步骤 5**: 可能需要重新输入 Facebook 密码验证

**步骤 6**: 复制显示的 App Secret

### 📝 格式示例
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```
（32位十六进制字符串）

### ⚙️ 配置

**开发环境** (`.env.local`):
```bash
WHATSAPP_APP_SECRET=your_app_secret_here
```

**生产环境** (Vercel):
```bash
vercel env add WHATSAPP_APP_SECRET
# 或在 Vercel Dashboard → Settings → Environment Variables
```

### ⚠️ 重要提示
- ❌ 不要提交到 Git
- ❌ 不要在客户端使用
- ✅ 只在服务器端使用
- ✅ 定期轮换（3-6个月）

详细文档: `docs/WHATSAPP_APP_SECRET_GUIDE.md`

---

## 2. OPENAI_API_KEY

### 🎯 用途
调用 OpenAI GPT-4o-mini Vision API 进行食物识别。

### 📍 获取方法

**步骤 1**: 访问 [OpenAI Platform](https://platform.openai.com/)

**步骤 2**: 登录你的 OpenAI 账号

**步骤 3**: 进入 **API Keys** 页面

**步骤 4**: 点击 **Create new secret key**

**步骤 5**: 输入名称（如 "Vita AI Production"）

**步骤 6**: 复制并保存（只显示一次！）

### 📝 格式示例
```
sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### ⚙️ 配置

**开发环境** (`.env.local`):
```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_ORG_ID=org-your-org-id  # 可选
```

**生产环境** (Vercel):
```bash
vercel env add OPENAI_API_KEY
vercel env add OPENAI_ORG_ID  # 如果有组织
```

### 💰 成本控制

**单次识别成本**: ~$0.0005 (约 ¥0.0035)

**月度成本估算**:
- 100 用户: ~$4.50/月
- 500 用户: ~$22.50/月
- 1,000 用户: ~$45/月

**优化措施**:
- ✅ 缓存系统（节省 30-40%）
- ✅ 图片压缩（节省 20-30%）
- ✅ 配额限制（免费用户 3次/天）
- ✅ 超时保护（10秒）

**建议设置**:
1. 在 OpenAI Dashboard 设置月度预算
2. 启用 80% 预算告警
3. 设置速率限制（100 requests/min）

详细文档: `docs/OPENAI_TOKEN_MANAGEMENT.md`

---

## 🚀 快速配置

### 开发环境

创建 `.env.local` 文件：

```bash
# WhatsApp
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret_here  # 👈 新增

# OpenAI
OPENAI_API_KEY=sk-proj-your-key-here      # 👈 必需
OPENAI_ORG_ID=org-your-org-id             # 可选

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key

# Redis
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token

# 其他
NEXT_PUBLIC_URL=http://localhost:3000
NODE_ENV=development
ENABLE_CACHING=true
```

### 生产环境（Vercel）

```bash
# 批量添加
vercel env add WHATSAPP_APP_SECRET
vercel env add OPENAI_API_KEY
vercel env add OPENAI_ORG_ID

# 或在 Vercel Dashboard
# Project → Settings → Environment Variables
```

---

## ✅ 验证配置

### 1. 检查环境变量

```bash
# 开发环境
npm run dev

# 查看日志，确认没有 "Missing environment variable" 错误
```

### 2. 测试 WhatsApp 签名验证

```bash
# 发送测试 Webhook
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"test":"data"}'

# 应该返回 401 Unauthorized（签名无效）
```

### 3. 测试 OpenAI API

```bash
# 运行测试脚本
npx tsx scripts/test-food-recognition.ts

# 应该成功识别测试图片
```

---

## 🐛 常见问题

### Q1: WHATSAPP_APP_SECRET 在哪里？

**A**: Meta Dashboard → Your App → Settings → Basic → App Secret (点击 Show)

### Q2: OpenAI API Key 不工作？

**A**: 检查：
- Key 是否完整复制（包括 `sk-proj-` 前缀）
- 是否有足够的余额
- 是否设置了正确的权限

### Q3: 如何测试配置是否正确？

**A**: 
```bash
# 测试所有环境变量
npm run test:env

# 测试 API 连接
npm run test:apis
```

### Q4: 成本太高怎么办？

**A**: 
1. 检查缓存命中率（目标 >30%）
2. 启用图片压缩
3. 降低免费用户配额
4. 设置 OpenAI 预算限制

---

## 📚 相关文档

- `docs/WHATSAPP_APP_SECRET_GUIDE.md` - WhatsApp 密钥详细指南
- `docs/OPENAI_TOKEN_MANAGEMENT.md` - OpenAI Token 管理
- `docs/ENVIRONMENT_VARIABLES.md` - 完整环境变量列表
- `docs/BUG_FIX_COMPLETE.md` - Bug 修复报告

---

## 🔒 安全检查清单

部署前确认：

- [ ] 所有密钥已配置
- [ ] 密钥未提交到 Git
- [ ] `.gitignore` 包含 `.env*`
- [ ] 生产环境使用不同的密钥
- [ ] OpenAI 设置了预算限制
- [ ] Webhook 签名验证已启用
- [ ] 已测试所有 API 连接

---

*最后更新: 2026年2月14日*
