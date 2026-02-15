# OpenAI Token 管理和成本优化

## 📊 当前使用情况

### GPT-4o-mini Vision API

项目使用 **GPT-4o-mini** 模型进行食物识别，这是 OpenAI 最经济的视觉模型。

**配置位置**: `src/lib/food-recognition/recognizer.ts`

```typescript
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1000;
const TEMPERATURE = 0.3;
```

---

## 💰 成本分析

### GPT-4o-mini 定价（2024年）

- **输入**: $0.15 / 1M tokens
- **输出**: $0.60 / 1M tokens
- **图片**: 按像素计费，约 $0.001-0.003 / 图片

### 每次识别成本估算

假设每次识别：
- 系统提示: ~500 tokens
- 用户提示: ~100 tokens
- 图片: ~1000 tokens (取决于分辨率)
- 输出: ~400 tokens

**单次成本**:
```
输入: (500 + 100 + 1000) × $0.15 / 1M = $0.00024
输出: 400 × $0.60 / 1M = $0.00024
总计: ~$0.0005 (约 ¥0.0035)
```

### 月度成本估算

| 用户数 | 每日识别 | 月度识别 | 月度成本 |
|--------|---------|---------|---------|
| 100 | 300 | 9,000 | $4.50 |
| 500 | 1,500 | 45,000 | $22.50 |
| 1,000 | 3,000 | 90,000 | $45.00 |
| 5,000 | 15,000 | 450,000 | $225.00 |

---

## 🎯 已实现的优化措施

### 1. 缓存系统 ✅

**位置**: `src/lib/cache/cache-manager.ts`

```typescript
// 缓存识别结果 7 天
const CACHE_TTL = {
  FOOD_RECOGNITION: 7 * 24 * 60 * 60, // 7 days
};
```

**效果**: 
- 相同图片不会重复调用 API
- 预期缓存命中率: 30-40%
- 成本节省: 30-40%

### 2. 图片压缩 ✅

**位置**: `src/lib/food-recognition/image-handler.ts`

```typescript
// 压缩图片到最大 1024x1024
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const QUALITY = 85;
```

**效果**:
- 减少图片 token 消耗
- 加快上传速度
- 成本节省: 20-30%

### 3. 配额限制 ✅

**位置**: `src/lib/subscription/subscription-manager.ts`

```typescript
// 免费用户每日限制 3 次
const FREE_TIER_LIMIT = 3;
```

**效果**:
- 防止滥用
- 控制成本
- 鼓励付费订阅

### 4. 超时保护 ✅

**位置**: `src/lib/food-recognition/recognizer.ts`

```typescript
// 10 秒超时
const API_TIMEOUT_MS = 10000;
```

**效果**:
- 避免长时间等待
- 减少无效 API 调用
- 改善用户体验

---

## 🚀 建议的进一步优化

### 1. Token 使用监控

创建监控系统跟踪 token 使用：

```typescript
// src/lib/openai/token-monitor.ts
export class TokenMonitor {
  async recordUsage(userId: string, tokens: number, cost: number) {
    await supabase.from('api_usage').insert({
      user_id: userId,
      tokens_used: tokens,
      cost_usd: cost,
      model: 'gpt-4o-mini',
      created_at: new Date().toISOString(),
    });
  }

  async getDailyUsage(date: string) {
    const { data } = await supabase
      .from('api_usage')
      .select('SUM(tokens_used), SUM(cost_usd)')
      .eq('date', date);
    
    return data;
  }
}
```

### 2. 成本告警

```typescript
// src/lib/cost/cost-alerter.ts
export class CostAlerter {
  private readonly DAILY_BUDGET = 10; // $10/day
  
  async checkBudget() {
    const usage = await tokenMonitor.getDailyUsage(today);
    
    if (usage.cost > this.DAILY_BUDGET * 0.8) {
      await this.sendAlert('⚠️ 80% of daily budget used');
    }
    
    if (usage.cost > this.DAILY_BUDGET) {
      await this.sendAlert('🚨 Daily budget exceeded!');
      // 可选：暂时禁用免费用户的识别
    }
  }
}
```

### 3. 智能缓存预热

```typescript
// 预缓存常见食物
const COMMON_FOODS = [
  'chicken-rice',
  'nasi-lemak',
  'laksa',
  // ...
];

async function preheatCache() {
  for (const food of COMMON_FOODS) {
    const result = await generateMockRecognition(food);
    await cacheManager.setFoodRecognition(food, result);
  }
}
```

### 4. 批量处理

如果用户发送多张图片，可以批量处理：

```typescript
// 批量识别（未来功能）
async recognizeBatch(images: Buffer[]) {
  // 使用单个 API 调用识别多张图片
  // 节省系统提示的 token
}
```

---

## 📊 成本监控仪表板

### 创建监控表

```sql
-- migrations/010_api_usage_tracking.sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_date ON api_usage(DATE(created_at));
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
```

### 监控查询

```sql
-- 每日成本
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(cost_usd) as avg_cost_per_request
FROM api_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 用户成本排名
SELECT 
  user_id,
  COUNT(*) as requests,
  SUM(cost_usd) as total_cost
FROM api_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_cost DESC
LIMIT 10;

-- 缓存效果
SELECT 
  cached,
  COUNT(*) as count,
  SUM(cost_usd) as cost_saved
FROM api_usage
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY cached;
```

---

## 🔐 API Key 安全

### 1. 环境变量配置

```bash
# .env
OPENAI_API_KEY=sk-proj-...  # 你的 API Key
OPENAI_ORG_ID=org-...       # 可选：组织 ID
```

### 2. 获取 API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录你的账号
3. 进入 **API Keys** 页面
4. 点击 **Create new secret key**
5. 复制并保存（只显示一次）

### 3. 安全最佳实践

- ❌ 不要提交到 Git
- ❌ 不要在客户端使用
- ❌ 不要在日志中打印
- ✅ 使用环境变量
- ✅ 定期轮换
- ✅ 设置使用限制

### 4. 使用限制设置

在 OpenAI Dashboard 设置：
- **Monthly budget**: $100
- **Rate limits**: 100 requests/minute
- **Notifications**: 80% budget alert

---

## 💡 成本优化建议

### 短期（立即实施）

1. ✅ **启用缓存** - 已实现
2. ✅ **图片压缩** - 已实现
3. ✅ **配额限制** - 已实现
4. ⏳ **监控使用** - 建议添加
5. ⏳ **成本告警** - 建议添加

### 中期（1-2个月）

1. **优化提示词** - 减少 token 使用
2. **批量处理** - 提高效率
3. **智能缓存** - 预热常见食物
4. **用户分级** - 不同用户不同限制

### 长期（3-6个月）

1. **自建模型** - 考虑训练专用模型
2. **混合方案** - 简单识别用本地模型
3. **边缘计算** - 部分处理在客户端

---

## 📈 预期效果

实施所有优化后：

| 指标 | 优化前 | 优化后 | 改善 |
|-----|--------|--------|------|
| 单次成本 | $0.0005 | $0.0003 | 40% ↓ |
| 缓存命中率 | 0% | 35% | - |
| 月度成本 (1000用户) | $45 | $27 | 40% ↓ |
| 响应时间 | 3-5s | 1-3s | 50% ↓ |

---

## 🎯 成本控制策略

### 1. 免费用户
- 每日 3 次识别
- 使用缓存优先
- 图片压缩到 512x512

### 2. Premium 用户
- 无限识别
- 使用缓存
- 图片压缩到 1024x1024

### 3. Pro 用户
- 无限识别
- 优先级处理
- 原图识别（可选）

---

## ✅ 检查清单

部署前确认：

- [ ] OpenAI API Key 已配置
- [ ] 成本监控已启用
- [ ] 缓存系统正常工作
- [ ] 配额限制已设置
- [ ] 告警系统已配置
- [ ] 预算限制已设置

---

## 📞 相关资源

- [OpenAI Pricing](https://openai.com/pricing)
- [GPT-4o-mini Documentation](https://platform.openai.com/docs/models/gpt-4o-mini)
- [Token Counting](https://platform.openai.com/tokenizer)
- [Usage Dashboard](https://platform.openai.com/usage)

---

*最后更新: 2026年2月14日*
