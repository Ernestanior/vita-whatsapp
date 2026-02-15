# 监控模块

本模块提供了 Vita AI 应用的监控和错误追踪功能，使用 Sentry 进行错误追踪、性能监控和自定义指标收集。

## 功能

### 1. 错误追踪

自动捕获和报告应用中的错误。

```typescript
import { captureException, captureMessage } from '@/lib/monitoring';

try {
  // 可能出错的代码
  throw new Error('Something went wrong');
} catch (error) {
  // 捕获异常并发送到 Sentry
  captureException(error as Error, {
    context: {
      userId: '123',
      action: 'food_recognition',
    },
  });
}

// 捕获非错误的重要事件
captureMessage('User completed onboarding', 'info', {
  user: {
    id: '123',
    tier: 'premium',
  },
});
```

### 2. 用户上下文

关联错误到特定用户，便于调试。

```typescript
import { setUserContext, clearUserContext } from '@/lib/monitoring';

// 用户登录时设置上下文
setUserContext('user-123', {
  username: 'john_doe',
  tier: 'premium',
  language: 'en',
});

// 用户登出时清除上下文
clearUserContext();
```

### 3. 性能监控

追踪应用性能和响应时间。

```typescript
import { startTransaction } from '@/lib/monitoring';

// 开始一个事务
const transaction = startTransaction('food_recognition', 'ai.api');

try {
  // 执行操作
  const result = await recognizeFood(image);
  
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### 4. 自定义指标

追踪业务指标和 KPI。

```typescript
import { trackAPICall, trackCacheHit, trackCost } from '@/lib/monitoring';

// 追踪 API 调用
trackAPICall({
  model: 'gpt-4o-mini',
  tokensUsed: 1500,
  cost: 0.0004,
  duration: 2500,
  success: true,
});

// 追踪缓存命中
trackCacheHit(true, 'food:abc123');

// 追踪成本
trackCost({
  type: 'daily',
  amount: 25.50,
  userId: 'user-123',
});
```

### 5. 面包屑

记录用户操作轨迹，帮助重现错误。

```typescript
import { addBreadcrumb } from '@/lib/monitoring';

addBreadcrumb({
  message: 'User uploaded food image',
  category: 'user_action',
  level: 'info',
  data: {
    imageSize: 1024000,
    imageType: 'image/jpeg',
  },
});
```

### 6. 标签和上下文

为错误添加额外的元数据。

```typescript
import { setTag, setContext } from '@/lib/monitoring';

// 设置标签（用于过滤和分组）
setTag('feature', 'food_recognition');
setTag('user_tier', 'premium');

// 设置上下文（添加详细信息）
setContext('request', {
  method: 'POST',
  url: '/api/recognize',
  body: { imageHash: 'abc123' },
});
```

## 配置

### 环境变量

在 `.env` 文件中配置 Sentry DSN：

```env
# Sentry DSN（从 Sentry 项目设置中获取）
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# 可选：公开的 Sentry DSN（用于客户端）
NEXT_PUBLIC_SENTRY_DSN=https://your-public-sentry-dsn@sentry.io/project-id
```

### Sentry 项目设置

1. 在 [Sentry.io](https://sentry.io) 创建项目
2. 选择 Next.js 作为平台
3. 复制 DSN 到环境变量
4. 配置告警规则和通知

## 敏感信息过滤

监控模块自动过滤以下敏感信息：

- 密码
- API 密钥和 Token
- 手机号码
- 邮箱地址
- Cookie
- Authorization 头部

所有敏感信息在发送到 Sentry 之前都会被替换为 `[REDACTED]`。

## 告警规则

系统会在以下情况自动发送告警：

1. **成本超标**：每日成本超过预算（默认 $100）
2. **错误率过高**：错误率超过 5%
3. **性能下降**：API 响应时间超过阈值

## 最佳实践

1. **及时捕获错误**：在所有可能出错的地方使用 try-catch
2. **添加上下文**：为错误添加足够的上下文信息，便于调试
3. **使用面包屑**：记录关键的用户操作，帮助重现问题
4. **追踪业务指标**：使用自定义指标追踪 KPI
5. **定期检查**：定期查看 Sentry 仪表板，识别趋势和问题

## 仪表板

Sentry 提供以下仪表板：

- **错误概览**：查看所有错误和异常
- **性能监控**：查看 API 响应时间和性能指标
- **发布追踪**：追踪每个版本的错误率
- **用户反馈**：收集用户报告的问题

## 相关需求

- 需求 12.4: 记录详细错误日志并通知运维团队
- 需求 20.6: 实施实时监控仪表板
- 需求 20.7: 系统错误率超过 5% 时自动发送告警
- 需求 20.8: 每日 API 成本超过预算时触发告警
