# WhatsApp App Secret 获取指南

## 什么是 App Secret？

App Secret 是 Meta（Facebook）为你的 WhatsApp Business App 生成的密钥，用于验证 Webhook 请求的真实性。这是一个安全措施，确保只有 Meta 的服务器可以向你的应用发送消息。

---

## 📋 获取步骤

### 步骤 1: 登录 Meta for Developers

1. 访问 [Meta for Developers](https://developers.facebook.com/)
2. 使用你的 Facebook 账号登录
3. 如果还没有开发者账号，需要先注册

### 步骤 2: 找到你的 WhatsApp Business App

1. 在顶部导航栏点击 **"My Apps"**
2. 从列表中选择你的 WhatsApp Business App
3. 如果还没有创建 App，需要先创建一个

### 步骤 3: 获取 App Secret

有两种方法获取 App Secret：

#### 方法 A: 从 App Settings 获取（推荐）

1. 在左侧菜单中，点击 **Settings** → **Basic**
2. 向下滚动找到 **App Secret** 字段
3. 点击 **Show** 按钮
4. 可能需要重新输入你的 Facebook 密码验证身份
5. 复制显示的 App Secret

```
示例位置：
Dashboard → Your App → Settings → Basic → App Secret
```

#### 方法 B: 从 WhatsApp 配置获取

1. 在左侧菜单中，找到 **WhatsApp** → **Configuration**
2. 在 Webhook 配置部分，可以看到用于签名验证的说明
3. App Secret 用于生成 `X-Hub-Signature-256` 签名

---

## 🔐 App Secret 的格式

App Secret 通常是一个 32 字符的十六进制字符串，例如：

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**注意**: 这只是示例，你的 App Secret 会不同。

---

## ⚙️ 配置到项目中

### 开发环境

在项目根目录的 `.env.local` 文件中添加：

```bash
# WhatsApp Configuration
WHATSAPP_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_APP_SECRET=your_app_secret_here  # 👈 在这里添加
```

### 生产环境（Vercel）

```bash
# 使用 Vercel CLI
vercel env add WHATSAPP_APP_SECRET

# 或在 Vercel Dashboard
# Project Settings → Environment Variables → Add New
# Name: WHATSAPP_APP_SECRET
# Value: your_app_secret_here
# Environment: Production, Preview, Development
```

---

## 🔍 验证配置

### 测试签名验证

创建一个测试脚本验证配置是否正确：

```typescript
// scripts/test-webhook-signature.ts
import crypto from 'crypto';

const APP_SECRET = process.env.WHATSAPP_APP_SECRET!;
const payload = '{"test":"data"}';

// 生成签名
const signature = crypto
  .createHmac('sha256', APP_SECRET)
  .update(payload)
  .digest('hex');

console.log('Generated signature:', `sha256=${signature}`);

// 验证签名
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(signature) // 在实际中，这里是从请求头获取的签名
);

console.log('Signature valid:', isValid);
```

运行测试：

```bash
npx tsx scripts/test-webhook-signature.ts
```

---

## ⚠️ 安全注意事项

### 1. 保密性

- ❌ **不要**将 App Secret 提交到 Git 仓库
- ❌ **不要**在客户端代码中使用
- ❌ **不要**在日志中打印
- ✅ **只在**服务器端使用
- ✅ **使用**环境变量存储

### 2. .gitignore 配置

确保 `.gitignore` 包含：

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Vercel
.vercel
```

### 3. 定期轮换

建议每 3-6 个月轮换一次 App Secret：

1. 在 Meta Dashboard 生成新的 App Secret
2. 更新所有环境的环境变量
3. 部署新版本
4. 验证 Webhook 正常工作

---

## 🐛 常见问题

### Q1: 找不到 App Secret？

**A**: 确保你：
- 已经创建了 WhatsApp Business App
- 有该 App 的管理员权限
- 在正确的 App 中查看（不是 Facebook App）

### Q2: App Secret 不工作？

**A**: 检查：
- 是否复制了完整的 Secret（没有空格或换行）
- 环境变量是否正确设置
- 是否重启了应用（环境变量更改后需要重启）

### Q3: 如何测试签名验证？

**A**: 使用以下 curl 命令测试：

```bash
# 生成测试签名
PAYLOAD='{"test":"data"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | cut -d' ' -f2)

# 发送测试请求
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

### Q4: 签名验证失败怎么办？

**A**: 检查：
1. App Secret 是否正确
2. 请求体是否完全一致（包括空格、换行）
3. 签名格式是否为 `sha256=<hash>`
4. 是否使用了原始请求体（不是解析后的 JSON）

---

## 📚 相关文档

- [Meta Webhooks 文档](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [WhatsApp Business API 文档](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Webhook 签名验证](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)

---

## 🔄 如果 App Secret 泄露

如果你的 App Secret 不小心泄露了：

1. **立即重置**: 在 Meta Dashboard 重置 App Secret
2. **更新环境变量**: 在所有环境中更新新的 Secret
3. **部署**: 重新部署应用
4. **监控**: 检查是否有异常的 Webhook 请求
5. **审计**: 查看日志，确认是否有未授权访问

---

## ✅ 配置检查清单

部署前确认：

- [ ] 已从 Meta Dashboard 获取 App Secret
- [ ] 已添加到 `.env.local`（开发环境）
- [ ] 已添加到 Vercel 环境变量（生产环境）
- [ ] 已添加到 `.gitignore`
- [ ] 已测试签名验证
- [ ] Webhook 请求正常工作

---

*最后更新: 2026年2月14日*
