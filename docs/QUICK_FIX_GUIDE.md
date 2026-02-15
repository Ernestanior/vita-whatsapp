# Vita AI - 快速修复指南

## 🎯 目标

本指南提供最关键的8个bug的快速修复方案，可以在1-2周内完成，显著提升系统稳定性和安全性。

---

## 🔴 第1优先级：配额检查竞态条件（1天）

### 问题
多个并发请求可能绕过配额限制。

### 修复步骤

#### 1. 创建数据库函数
```sql
-- migrations/008_fix_quota_race_condition.sql
CREATE OR REPLACE FUNCTION check_and_increment_quota(
  p_user_id UUID,
  p_date DATE,
  p_limit INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  used INTEGER
) AS $$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  -- 使用 FOR UPDATE 锁定行，防止并发问题
  SELECT recognitions_used, recognitions_limit 
  INTO v_current, v_limit
  FROM usage_quotas
  WHERE user_id = p_user_id AND date = p_date
  FOR UPDATE;
  
  -- 如果记录不存在，创建新记录
  IF v_current IS NULL THEN
    INSERT INTO usage_quotas (user_id, date, recognitions_used, recognitions_limit)
    VALUES (p_user_id, p_date, 1, p_limit);
    RETURN QUERY SELECT TRUE, p_limit - 1, 1;
    RETURN;
  END IF;
  
  -- 检查是否超过限制
  IF v_current >= v_limit THEN
    RETURN QUERY SELECT FALSE, 0, v_current;
    RETURN;
  END IF;
  
  -- 增加使用次数
  UPDATE usage_quotas 
  SET recognitions_used = recognitions_used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND date = p_date;
  
  RETURN QUERY SELECT TRUE, v_limit - v_current - 1, v_current + 1;
END;
$$ LANGUAGE plpgsql;
```

#### 2. 更新 SubscriptionManager
```typescript
// src/lib/subscription/subscription-manager.ts
export class SubscriptionManager {
  /**
   * 原子性地检查并增加配额
   */
  async checkAndIncrementQuota(userId: string): Promise<QuotaCheckResult> {
    const supabase: any = await createClient();
    
    // 获取用户订阅
    const subscription = await this.getSubscription(userId);
    
    // Premium/Pro 用户无限制
    if (subscription.tier === 'premium' || subscription.tier === 'pro') {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        tier: subscription.tier,
        needsUpgrade: false,
      };
    }
    
    // 免费用户：使用原子操作
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('check_and_increment_quota', {
      p_user_id: userId,
      p_date: today,
      p_limit: SUBSCRIPTION_TIERS.free.dailyLimit,
    });
    
    if (error) {
      throw new Error(`Failed to check quota: ${error.message}`);
    }
    
    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      limit: SUBSCRIPTION_TIERS.free.dailyLimit,
      tier: 'free',
      needsUpgrade: !result.allowed,
    };
  }
  
  // 删除旧的 checkQuota() 和 incrementUsage() 方法
}
```

#### 3. 更新调用代码
```typescript
// src/lib/whatsapp/image-handler.ts
export class ImageHandler {
  async handleImage(message: Message, context: MessageContext): Promise<void> {
    // 原子性地检查并增加配额
    const quotaResult = await subscriptionManager.checkAndIncrementQuota(context.userId);
    
    if (!quotaResult.allowed) {
      await this.sendQuotaExceededMessage(context, quotaResult);
      return;
    }
    
    // 继续处理图片...
  }
}
```

#### 4. 测试
```typescript
// src/lib/subscription/__tests__/quota-race-condition.test.ts
describe('Quota Race Condition', () => {
  it('should handle concurrent requests correctly', async () => {
    const userId = 'test-user';
    
    // 同时发送10个请求
    const promises = Array(10).fill(null).map(() =>
      subscriptionManager.checkAndIncrementQuota(userId)
    );
    
    const results = await Promise.all(promises);
    const allowed = results.filter(r => r.allowed).length;
    
    // 应该只有3个被允许
    expect(allowed).toBe(3);
  });
});
```

---

## 🔴 第2优先级：WhatsApp Webhook 签名验证（0.5天）

### 修复步骤

#### 1. 添加签名验证方法
```typescript
// src/lib/whatsapp/webhook-handler.ts
import crypto from 'crypto';
import { env } from '@/config/env';

export class WebhookHandler {
  /**
   * 验证 WhatsApp Webhook 签名
   */
  verifySignature(payload: string, signature: string | null): boolean {
    if (!signature) {
      logger.error('Missing webhook signature');
      return false;
    }
    
    try {
      const expectedSignature = crypto
        .createHmac('sha256', env.WHATSAPP_APP_SECRET)
        .update(payload)
        .digest('hex');
      
      const signatureHash = signature.replace('sha256=', '');
      
      // 使用 timingSafeEqual 防止时序攻击
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signatureHash)
      );
    } catch (error) {
      logger.error('Signature verification error', { error });
      return false;
    }
  }
  
  // 更新 handleWebhook 方法
  async handleWebhook(
    payload: WebhookPayload,
    rawBody: string,
    signature: string | null
  ): Promise<void> {
    // 验证签名
    if (!this.verifySignature(rawBody, signature)) {
      logger.error('Invalid webhook signature', {
        hasSignature: !!signature,
      });
      throw new Error('Invalid webhook signature');
    }
    
    // 继续处理...
  }
}
```

#### 2. 更新 API 路由
```typescript
// src/app/api/webhook/route.ts
export async function POST(request: NextRequest) {
  try {
    // 获取原始请求体（用于签名验证）
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // 解析 payload
    const payload = JSON.parse(rawBody);
    
    // 处理 webhook（包含签名验证）
    await webhookHandler.handleWebhook(payload, rawBody, signature);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Webhook processing error', { error });
    
    if (error instanceof Error && error.message === 'Invalid webhook signature') {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 3. 添加环境变量
```typescript
// src/config/env.ts
export const env = {
  // ... 其他变量
  WHATSAPP_APP_SECRET: z.string().min(1),
};
```

```bash
# .env
WHATSAPP_APP_SECRET=your_app_secret_here
```

---

## 🔴 第3优先级：缓存失效机制（0.5天）

### 修复步骤

#### 1. 添加缓存失效方法
```typescript
// src/lib/cache/cache-manager.ts
export class CacheManager {
  /**
   * 清除食物识别缓存
   */
  async invalidateFoodRecognition(imageHash: string): Promise<void> {
    if (!this.enabled) return;
    
    try {
      const key = `${CACHE_KEYS.FOOD_RECOGNITION}${imageHash}`;
      await redis.del(key);
      
      logger.info('Food recognition cache invalidated', { imageHash });
    } catch (error) {
      logger.error('Failed to invalidate cache', { error, imageHash });
    }
  }
  
  /**
   * 批量清除缓存
   */
  async invalidateMultiple(imageHashes: string[]): Promise<void> {
    if (!this.enabled) return;
    
    try {
      const keys = imageHashes.map(hash => 
        `${CACHE_KEYS.FOOD_RECOGNITION}${hash}`
      );
      
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info('Multiple caches invalidated', { count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to invalidate multiple caches', { error });
    }
  }
}
```

#### 2. 在反馈提交时清除缓存
```typescript
// src/lib/feedback/feedback-manager.ts
export class FeedbackManager {
  private cacheManager: CacheManager;
  
  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.cacheManager = new CacheManager();
  }
  
  async submitFeedback(data: FeedbackData): Promise<{ success: boolean }> {
    // 提交反馈
    const { data: feedback, error } = await this.supabase
      .from('user_feedback')
      .insert({...})
      .select()
      .single();
    
    if (error) {
      return { success: false };
    }
    
    // 如果是不准确的反馈，清除缓存
    if (data.feedbackType === 'inaccurate' && data.foodRecordId) {
      await this.invalidateCacheForFeedback(data.foodRecordId);
    }
    
    return { success: true, feedbackId: feedback.id };
  }
  
  private async invalidateCacheForFeedback(foodRecordId: string): Promise<void> {
    try {
      // 获取食物记录的图片哈希
      const { data: record } = await this.supabase
        .from('food_records')
        .select('image_hash')
        .eq('id', foodRecordId)
        .single();
      
      if (record?.image_hash) {
        await this.cacheManager.invalidateFoodRecognition(record.image_hash);
        
        logger.info('Cache invalidated due to feedback', {
          foodRecordId,
          imageHash: record.image_hash,
        });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache for feedback', {
        error,
        foodRecordId,
      });
    }
  }
}
```

---

## 🔴 第4优先级：Stripe 事件幂等性（1天）

### 修复步骤

#### 1. 创建事件日志表
```sql
-- migrations/009_stripe_events.sql
CREATE TABLE stripe_events (
  event_id VARCHAR(100) PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id),
  processed_at TIMESTAMP DEFAULT NOW(),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX idx_stripe_events_user ON stripe_events(user_id);
CREATE INDEX idx_stripe_events_processed ON stripe_events(processed_at);
```

#### 2. 实现幂等性处理
```typescript
// src/lib/stripe/stripe-manager.ts
export class StripeManager {
  async handleWebhook(event: Stripe.Event): Promise<void> {
    const supabase = await createClient();
    
    // 检查事件是否已处理（幂等性）
    const { data: existing } = await supabase
      .from('stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();
    
    if (existing) {
      logger.info('Stripe event already processed', { eventId: event.id });
      return;
    }
    
    // 记录事件
    await supabase
      .from('stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        payload: event.data,
      });
    
    // 处理事件
    try {
      await this.processEvent(event);
    } catch (error) {
      logger.error('Failed to process Stripe event', {
        eventId: event.id,
        eventType: event.type,
        error,
      });
      throw error;
    }
  }
  
  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancellation(event);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event);
        break;
      
      default:
        logger.warn('Unhandled Stripe event type', { type: event.type });
    }
  }
  
  private async handleSubscriptionCancellation(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;
    
    if (!userId) {
      logger.error('Missing userId in subscription metadata');
      return;
    }
    
    await this.subscriptionManager.cancelSubscription(userId);
    
    // 通知用户
    await whatsappClient.sendTextMessage(
      userId,
      '您的订阅已取消。感谢您的使用！'
    );
  }
  
  private async handlePaymentFailure(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;
    
    // 获取用户ID
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();
    
    if (subscription) {
      // 通知用户支付失败
      await whatsappClient.sendTextMessage(
        subscription.user_id,
        '⚠️ 支付失败，请更新您的支付方式以继续使用 Premium 功能。'
      );
    }
  }
}
```

---

## 🔴 第5优先级：API 超时处理（0.5天）

### 修复步骤

```typescript
// src/lib/food-recognition/recognizer.ts
export class FoodRecognizer {
  private readonly API_TIMEOUT = 10000; // 10秒
  
  async recognizeFood(
    imageBuffer: Buffer,
    context: RecognitionContext
  ): Promise<RecognitionResult> {
    try {
      // 使用 Promise.race 实现超时
      const response = await Promise.race([
        this.callOpenAI(imageBuffer, context),
        this.createTimeoutPromise(),
      ]);
      
      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof TimeoutError) {
        logger.warn('OpenAI API timeout', { context });
        return this.createTimeoutResponse();
      }
      
      throw error;
    }
  }
  
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError('API request timeout'));
      }, this.API_TIMEOUT);
    });
  }
  
  private createTimeoutResponse(): RecognitionResult {
    return {
      success: false,
      error: {
        type: ErrorType.TIMEOUT,
        message: '识别超时，请稍后重试',
        retryable: true,
      },
    };
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
```

---

## 🔴 第6-8优先级：其他关键修复

### 6. 成就解锁去重（0.5天）
```typescript
// 使用 ON CONFLICT DO NOTHING
await supabase
  .from('user_achievements')
  .insert({...})
  .onConflict('user_id, achievement_id')
  .ignoreDuplicates();
```

### 7. 用户画像乐观锁（0.5天）
```typescript
// 添加 updated_at 版本检查
await supabase
  .from('health_profiles')
  .update({...})
  .eq('user_id', userId)
  .eq('updated_at', currentVersion);
```

### 8. 缓存键修复（0.5天）
```typescript
// 包含用户ID或分离识别和评价
const key = `${CACHE_KEYS.FOOD_RECOGNITION}${imageHash}:${userId}`;
```

---

## 📋 实施计划

### 第1周（5天）
- [ ] Day 1: 修复配额检查竞态条件
- [ ] Day 2: 添加 Webhook 签名验证
- [ ] Day 3: 实现缓存失效机制
- [ ] Day 4-5: Stripe 事件幂等性处理

### 第2周（3天）
- [ ] Day 1: API 超时处理
- [ ] Day 2: 成就解锁去重 + 用户画像乐观锁
- [ ] Day 3: 缓存键修复 + 测试

---

## ✅ 验证清单

修复完成后，验证以下内容：

- [ ] 并发配额检查测试通过
- [ ] Webhook 签名验证正常工作
- [ ] 反馈提交后缓存被清除
- [ ] Stripe 事件不会重复处理
- [ ] API 超时后返回友好错误
- [ ] 成就不会重复解锁
- [ ] 用户画像更新不会丢失数据
- [ ] 缓存键包含必要的上下文

---

## 📊 预期效果

修复这8个关键问题后：

- ✅ 配额系统可靠性：100%
- ✅ 安全性提升：显著
- ✅ 数据一致性：显著改善
- ✅ 用户体验：明显提升
- ✅ 系统稳定性：大幅提高

---

## 🚀 下一步

完成这些修复后，继续处理：
1. 中优先级问题（API 速率限制、数据验证等）
2. 补充单元测试
3. 性能优化
4. 用户体验优化

详见 `CRITICAL_BUGS_AND_ISSUES.md` 和 `MISSING_FEATURES_AND_EDGE_CASES.md`。
