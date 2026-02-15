# 安全模块

本模块提供了 Vita AI 应用的安全功能，包括速率限制、Webhook 验证、数据加密等。

## 功能

### 1. 速率限制 (Rate Limiting)

使用 Upstash Redis 实现分布式速率限制，防止 API 滥用。

```typescript
import { checkUserRateLimit, checkIpRateLimit } from '@/lib/security';

// 检查用户速率限制（每分钟 10 次请求）
const result = await checkUserRateLimit(userId);
if (!result.allowed) {
  // 超过限制
  console.log(`Rate limit exceeded. Reset at: ${result.resetAt}`);
}

// 检查 IP 速率限制（每分钟 20 次请求）
const ipResult = await checkIpRateLimit(ipAddress);
```

### 2. Webhook 签名验证

验证来自 WhatsApp 和 Stripe 的 Webhook 请求的真实性。

```typescript
import { verifyWhatsAppWebhook, verifyStripeWebhook } from '@/lib/security';

// 验证 WhatsApp Webhook
const isValid = verifyWhatsAppWebhook(payload, signature);

// 验证 Stripe Webhook
const isStripeValid = verifyStripeWebhook(payload, signature);
```

### 3. 数据加密

使用 AES-256-GCM 加密敏感数据。

```typescript
import { encrypt, decrypt, encryptObject, decryptObject } from '@/lib/security';

// 加密文本
const encrypted = encrypt('sensitive data');

// 解密文本
const decrypted = decrypt(encrypted);

// 加密对象
const encryptedObj = encryptObject({ userId: '123', email: 'user@example.com' });

// 解密对象
const decryptedObj = decryptObject<{ userId: string; email: string }>(encryptedObj);
```

### 4. 密码哈希

使用 PBKDF2 安全地哈希和验证密码。

```typescript
import { hashPassword, verifyPassword } from '@/lib/security';

// 哈希密码
const hashed = hashPassword('myPassword123');

// 验证密码
const isValid = verifyPassword('myPassword123', hashed);
```

### 5. 安全中间件

提供用于 API 路由的安全中间件。

```typescript
import { rateLimitMiddleware, whatsappWebhookMiddleware } from '@/lib/security/middleware';

// 在 API 路由中使用
export async function POST(request: NextRequest) {
  // 检查速率限制
  const rateLimitResponse = await rateLimitMiddleware(request, userId);
  if (rateLimitResponse) {
    return rateLimitResponse; // 返回 429 错误
  }

  // 验证 Webhook
  const webhookResponse = await whatsappWebhookMiddleware(request);
  if (webhookResponse) {
    return webhookResponse; // 返回 401 错误
  }

  // 继续处理请求
  // ...
}
```

## 环境变量

需要在 `.env` 文件中配置以下环境变量：

```env
# 加密密钥（64 个十六进制字符，32 字节）
ENCRYPTION_KEY=your_64_character_hex_key

# WhatsApp 验证 Token
WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token

# Stripe Webhook 密钥
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Upstash Redis
UPSTASH_REDIS_URL=your_redis_url
UPSTASH_REDIS_TOKEN=your_redis_token
```

### 生成加密密钥

使用以下命令生成安全的加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 安全最佳实践

1. **速率限制**：所有公开的 API 端点都应该应用速率限制
2. **Webhook 验证**：始终验证 Webhook 签名，防止伪造请求
3. **数据加密**：加密存储所有敏感数据（如健康信息、个人数据）
4. **密钥管理**：
   - 永远不要在代码中硬编码密钥
   - 使用环境变量管理密钥
   - 定期轮换密钥
5. **日志安全**：不要在日志中记录敏感信息（密码、token、个人数据）

## 测试

```bash
# 运行安全模块测试
npm test src/lib/security
```

## 相关需求

- 需求 11.1: 使用 AES-256 加密存储所有用户健康数据
- 需求 11.7: 实施 API 速率限制防止滥用
- 需求 11.8: 记录所有数据访问日志用于安全审计
