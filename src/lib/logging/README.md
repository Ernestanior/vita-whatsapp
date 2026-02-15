# 日志系统

本模块提供了 Vita AI 应用的结构化日志功能，使用 Pino 实现高性能日志记录，并自动脱敏 PII（个人身份信息）数据。

## 功能

### 1. 结构化日志

使用 JSON 格式记录日志，便于解析和分析。

```typescript
import logger from '@/lib/logging';

// 基础日志
logger.info('Application started');
logger.error('Something went wrong');

// 带上下文的日志
logger.info({ userId: '123', action: 'login' }, 'User logged in');

// 带错误对象的日志
try {
  throw new Error('Test error');
} catch (error) {
  logger.error({ err: error }, 'Error occurred');
}
```

### 2. 日志级别

支持多个日志级别，可通过环境变量配置。

```typescript
logger.trace('Trace message');  // 最详细
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.fatal('Fatal message');   // 最严重
```

### 3. 模块化 Logger

为不同模块创建独立的 logger。

```typescript
import { createLogger } from '@/lib/logging';

const foodLogger = createLogger('food-recognition');
const authLogger = createLogger('authentication');

foodLogger.info('Food recognized');
authLogger.info('User authenticated');
```

### 4. 专用日志函数

提供针对特定场景的日志函数。

```typescript
import {
  logAPICall,
  logUserAction,
  logError,
  logDatabaseOperation,
  logCacheOperation,
  logWebhook,
  logSecurityEvent,
  logCost,
  logPerformance,
} from '@/lib/logging';

// API 调用日志
logAPICall({
  userId: 'user-123',
  model: 'gpt-4o-mini',
  tokensUsed: 1500,
  cost: 0.0004,
  duration: 2500,
  success: true,
});

// 用户操作日志
logUserAction({
  userId: 'user-123',
  action: 'upload_food_image',
  metadata: { imageSize: 1024000 },
  duration: 500,
});

// 错误日志
logError({
  errorId: 'err-123',
  error: new Error('Something went wrong'),
  context: { userId: 'user-123', action: 'food_recognition' },
});

// 数据库操作日志
logDatabaseOperation({
  operation: 'insert',
  table: 'food_records',
  duration: 50,
  success: true,
  userId: 'user-123',
});

// 缓存操作日志
logCacheOperation({
  operation: 'get',
  key: 'food:abc123',
  hit: true,
  duration: 5,
});

// Webhook 日志
logWebhook({
  source: 'whatsapp',
  event: 'message.received',
  success: true,
  duration: 100,
});

// 安全事件日志
logSecurityEvent({
  event: 'rate_limit_exceeded',
  userId: 'user-123',
  ip: '192.168.1.1',
  details: { limit: 10, attempts: 15 },
});

// 成本日志
logCost({
  type: 'daily',
  amount: 25.50,
  userId: 'user-123',
  breakdown: { api: 20.00, storage: 5.50 },
});

// 性能日志
logPerformance({
  operation: 'food_recognition',
  duration: 2500,
  metadata: { imageSize: 1024000 },
});
```

### 5. PII 数据脱敏

自动脱敏敏感信息，保护用户隐私。

```typescript
import { maskPhoneNumber, maskEmail, maskPII } from '@/lib/logging';

// 脱敏手机号
const masked = maskPhoneNumber('+6512345678');
// 输出: +65*****78

// 脱敏邮箱
const maskedEmail = maskEmail('user@example.com');
// 输出: us***@example.com

// 脱敏对象
const user = {
  id: '123',
  phone_number: '+6512345678',
  email: 'user@example.com',
  password: 'secret123',
};

const maskedUser = maskPII(user);
// 输出: { id: '123', phone_number: '+65*****78', email: 'us***@example.com' }
// password 字段被移除
```

## 配置

### 环境变量

在 `.env` 文件中配置日志级别：

```env
# 日志级别: trace, debug, info, warn, error, fatal
LOG_LEVEL=info

# 环境
NODE_ENV=development
```

### 日志级别说明

- `trace`: 最详细的日志，用于深度调试
- `debug`: 调试信息，开发环境使用
- `info`: 一般信息，生产环境默认级别
- `warn`: 警告信息，需要注意但不影响运行
- `error`: 错误信息，需要处理
- `fatal`: 致命错误，应用无法继续运行

## 自动脱敏的字段

以下字段会自动被脱敏或移除：

- `phone_number`, `phoneNumber`, `phone`
- `email`
- `password`
- `token`, `accessToken`, `refreshToken`
- `apiKey`, `api_key`
- `headers.authorization`
- `headers.cookie`
- `connectionString`, `databaseUrl`
- `stripeKey`, `openaiKey`, `supabaseKey`

## 日志格式

### 开发环境

使用美化格式，便于阅读：

```
[14:30:45] INFO (food-recognition): Food recognized
    userId: "user-123"
    foodName: "Chicken Rice"
    confidence: 95
```

### 生产环境

使用 JSON 格式，便于解析：

```json
{
  "level": "info",
  "time": "2024-01-15T14:30:45.123Z",
  "module": "food-recognition",
  "userId": "user-123",
  "foodName": "Chicken Rice",
  "confidence": 95,
  "msg": "Food recognized"
}
```

## 日志查询

### 使用 grep 查询日志

```bash
# 查询特定用户的日志
grep "user-123" logs/app.log

# 查询错误日志
grep '"level":"error"' logs/app.log

# 查询 API 调用日志
grep '"type":"ai_api_call"' logs/app.log
```

### 使用 jq 解析 JSON 日志

```bash
# 查询所有错误
cat logs/app.log | jq 'select(.level == "error")'

# 统计 API 调用次数
cat logs/app.log | jq 'select(.type == "ai_api_call")' | wc -l

# 计算平均响应时间
cat logs/app.log | jq 'select(.type == "ai_api_call") | .duration' | jq -s 'add/length'
```

## 最佳实践

1. **使用合适的日志级别**
   - `info`: 记录重要的业务事件
   - `warn`: 记录潜在问题
   - `error`: 记录错误和异常
   - `debug`: 仅在开发环境使用

2. **添加上下文信息**
   - 始终包含 `userId`（如果有）
   - 包含 `requestId` 用于追踪请求
   - 包含相关的业务数据

3. **不要记录敏感信息**
   - 使用脱敏函数处理 PII 数据
   - 不要记录密码、token、API 密钥
   - 不要记录完整的信用卡号

4. **使用结构化数据**
   - 使用对象而不是字符串拼接
   - 便于后续查询和分析

5. **性能考虑**
   - 避免在循环中记录大量日志
   - 使用合适的日志级别
   - 生产环境使用 `info` 或更高级别

## 日志轮转

建议使用日志轮转工具（如 `logrotate`）管理日志文件：

```
/var/log/vita-ai/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## 相关需求

- 需求 11.8: 记录所有数据访问日志用于安全审计
- 需求 12.4: 记录详细错误日志并通知运维团队
- 需求 19.7: 记录错误 ID 并告知用户，方便后续追踪
