# Vita AI 运维指南

本文档为运维团队提供监控、故障排查、备份恢复和扩展的完整指南。

## 目录

1. [监控和告警](#监控和告警)
2. [故障排查](#故障排查)
3. [备份和恢复](#备份和恢复)
4. [性能优化](#性能优化)
5. [成本管理](#成本管理)
6. [安全运维](#安全运维)
7. [扩展计划](#扩展计划)

## 监控和告警

### 关键指标

#### 1. 应用健康

**监控指标**:
- ✅ 服务可用性 (目标: 99.9%)
- ⏱️ 响应时间 (目标: < 2s)
- ❌ 错误率 (目标: < 1%)
- 📊 请求量 (QPS)

**监控工具**:
```bash
# 健康检查
curl https://your-domain.com/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

**Vercel 监控**:
- Dashboard > Analytics
- 查看实时流量和错误

#### 2. 数据库性能

**监控指标**:
- 🔌 连接数 (目标: < 80% 池大小)
- ⏱️ 查询时间 (目标: < 500ms)
- 💾 存储使用 (目标: < 80%)
- 🔄 复制延迟 (目标: < 1s)

**Supabase 监控**:
```sql
-- 检查活跃连接
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- 检查慢查询
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 检查数据库大小
SELECT pg_size_pretty(pg_database_size('postgres'));
```

#### 3. 缓存性能

**监控指标**:
- 📈 命中率 (目标: > 30%)
- ⏱️ 响应时间 (目标: < 50ms)
- 💾 内存使用 (目标: < 80%)
- 🔄 驱逐率

**Upstash 监控**:
- Dashboard > Metrics
- 查看命中率和延迟

#### 4. API 使用

**监控指标**:
- 📞 OpenAI API 调用量
- 💰 每日成本
- ⏱️ 平均响应时间
- ❌ 错误率

**成本监控**:
```typescript
// 查看每日成本
const cost = await getCostMonitor().getDailyCost();
console.log(`Today's cost: $${cost.toFixed(2)}`);

// 检查预算告警
if (cost > DAILY_BUDGET * 0.8) {
  await sendAlert('Cost approaching budget');
}
```

### 告警配置

#### Sentry 告警

**错误率告警**:
```yaml
Alert Name: High Error Rate
Condition: Error rate > 5% for 5 minutes
Action: Email + Slack notification
```

**响应时间告警**:
```yaml
Alert Name: Slow Response
Condition: P95 response time > 10s for 5 minutes
Action: Email notification
```

#### Uptime 监控

**服务可用性**:
```yaml
Monitor: Health Check
URL: https://your-domain.com/api/health
Interval: 5 minutes
Alert: Email + SMS when down
```

#### 成本告警

**每日预算**:
```typescript
// 在 cost-monitor.ts 中配置
const DAILY_BUDGET = 50; // USD
const ALERT_THRESHOLD = 0.8; // 80%

if (dailyCost > DAILY_BUDGET * ALERT_THRESHOLD) {
  await sendAlert({
    type: 'cost',
    message: `Daily cost $${dailyCost} approaching budget $${DAILY_BUDGET}`,
    severity: 'warning',
  });
}
```

### 日志管理

#### 日志级别

```
DEBUG: 详细调试信息
INFO: 一般信息
WARN: 警告信息
ERROR: 错误信息
```

**配置日志级别**:
```bash
# 开发环境
LOG_LEVEL=debug

# 生产环境
LOG_LEVEL=info
```

#### 查看日志

**Vercel 日志**:
```bash
# 实时日志
vercel logs --follow

# 特定部署
vercel logs <deployment-url>

# 过滤错误
vercel logs --filter error
```

**Supabase 日志**:
- Dashboard > Logs
- 查看数据库查询和错误

#### 日志分析

**常见日志模式**:
```bash
# 查找错误
grep "ERROR" logs.txt

# 统计错误类型
grep "ERROR" logs.txt | cut -d':' -f2 | sort | uniq -c

# 查找慢查询
grep "duration.*[5-9][0-9][0-9][0-9]ms" logs.txt
```

## 故障排查

### 常见问题

#### 1. 服务不可用

**症状**: 健康检查失败，用户无法访问

**检查清单**:
- [ ] Vercel 部署状态
- [ ] DNS 配置
- [ ] SSL 证书
- [ ] 环境变量

**排查步骤**:
```bash
# 1. 检查 Vercel 状态
vercel ls

# 2. 测试健康检查
curl -v https://your-domain.com/api/health

# 3. 检查 DNS
nslookup your-domain.com

# 4. 检查 SSL
openssl s_client -connect your-domain.com:443
```

**解决方案**:
```bash
# 回滚到上一个版本
vercel rollback

# 或重新部署
vercel --prod
```

#### 2. 数据库连接失败

**症状**: 数据库查询超时或失败

**检查清单**:
- [ ] Supabase 服务状态
- [ ] 连接池配置
- [ ] 网络连接
- [ ] RLS 策略

**排查步骤**:
```bash
# 1. 测试连接
psql "postgresql://..." -c "SELECT 1"

# 2. 检查连接数
psql "postgresql://..." -c "SELECT count(*) FROM pg_stat_activity"

# 3. 检查慢查询
npm run verify:db
```

**解决方案**:
```sql
-- 终止空闲连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes';

-- 增加连接池大小（在 Supabase Dashboard）
```

#### 3. 食物识别失败

**症状**: 图片上传后无响应或返回错误

**检查清单**:
- [ ] OpenAI API 状态
- [ ] API 密钥有效性
- [ ] 图片大小和格式
- [ ] 网络连接

**排查步骤**:
```bash
# 1. 测试 OpenAI API
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 2. 检查图片处理
npm run test:recognition

# 3. 查看错误日志
vercel logs --filter "food recognition"
```

**解决方案**:
```typescript
// 检查 API 密钥
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OpenAI API key not configured');
}

// 实现重试逻辑
const result = await retryWithBackoff(
  () => recognizeFood(image),
  { maxRetries: 3, backoff: 1000 }
);
```

#### 4. Webhook 未触发

**症状**: WhatsApp 消息发送后无响应

**检查清单**:
- [ ] Webhook URL 配置
- [ ] Webhook 验证
- [ ] 防火墙设置
- [ ] 订阅字段

**排查步骤**:
```bash
# 1. 测试 Webhook 验证
curl "https://your-domain.com/api/webhook?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=test"

# 2. 检查 Webhook 日志
vercel logs --filter webhook

# 3. 验证签名
npm run test:webhook
```

**解决方案**:
```bash
# 重新配置 Webhook
# 在 Meta for Developers > WhatsApp > Configuration
# 1. 更新 Callback URL
# 2. 重新验证
# 3. 重新订阅字段
```

#### 5. 支付失败

**症状**: 用户无法完成支付或订阅未激活

**检查清单**:
- [ ] Stripe API 状态
- [ ] Webhook 配置
- [ ] 产品和价格 ID
- [ ] 支付方式

**排查步骤**:
```bash
# 1. 检查 Stripe Webhook
# Stripe Dashboard > Webhooks > 查看事件

# 2. 测试 Webhook
# Stripe Dashboard > Webhooks > Send test webhook

# 3. 查看支付日志
vercel logs --filter stripe
```

**解决方案**:
```typescript
// 手动同步订阅状态
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
await updateSubscriptionInDatabase(subscription);

// 重新发送 Webhook
// Stripe Dashboard > Events > Resend webhook
```

### 性能问题

#### 慢查询优化

**识别慢查询**:
```sql
-- 查看最慢的查询
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**优化策略**:
```sql
-- 添加索引
CREATE INDEX idx_food_records_user_date
ON food_records(user_id, created_at DESC);

-- 使用 EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM food_records
WHERE user_id = 'xxx'
ORDER BY created_at DESC
LIMIT 20;
```

#### 缓存优化

**提高命中率**:
```typescript
// 增加缓存时间
await cache.set(key, value, { ex: 3600 }); // 1 hour

// 预热缓存
await warmupCache();

// 使用缓存标签
await cache.set(key, value, { tags: ['user:123'] });
```

## 备份和恢复

### 自动备份

#### Supabase 备份

**配置**:
- Dashboard > Database > Backups
- 启用自动备份
- 保留期: 30 天

**验证备份**:
```bash
# 列出备份
supabase db dump --list

# 下载备份
supabase db dump --backup-id <id>
```

#### 手动备份

**数据库备份**:
```bash
#!/bin/bash
# scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump "postgresql://..." > "$BACKUP_DIR/db_$DATE.sql"

# 压缩
gzip "$BACKUP_DIR/db_$DATE.sql"

# 上传到 S3（可选）
aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" s3://your-bucket/backups/

echo "Backup completed: db_$DATE.sql.gz"
```

**运行备份**:
```bash
# 手动运行
./scripts/backup-database.sh

# 定时任务（每天凌晨 3 点）
0 3 * * * /path/to/scripts/backup-database.sh
```

### 数据恢复

#### 恢复数据库

**从备份恢复**:
```bash
# 1. 下载备份
aws s3 cp s3://your-bucket/backups/db_20240115.sql.gz .

# 2. 解压
gunzip db_20240115.sql.gz

# 3. 恢复
psql "postgresql://..." < db_20240115.sql
```

**恢复特定表**:
```bash
# 只恢复 users 表
pg_restore -t users db_20240115.sql
```

#### 灾难恢复

**完整恢复流程**:
```bash
# 1. 创建新 Supabase 项目
# 2. 恢复数据库
psql "postgresql://new-project..." < backup.sql

# 3. 恢复 Storage
# 从备份恢复文件到新 bucket

# 4. 更新环境变量
vercel env add NEXT_PUBLIC_SUPABASE_URL

# 5. 重新部署
vercel --prod

# 6. 验证
npm run test:integration
```

## 性能优化

### 数据库优化

**索引优化**:
```sql
-- 分析表
ANALYZE users;
ANALYZE food_records;

-- 检查索引使用
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- 删除未使用的索引
DROP INDEX IF EXISTS unused_index;
```

**查询优化**:
```sql
-- 使用 CTE
WITH recent_records AS (
  SELECT * FROM food_records
  WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM recent_records WHERE user_id = 'xxx';

-- 使用分区（大表）
CREATE TABLE food_records_2024_01 PARTITION OF food_records
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 缓存优化

**缓存策略**:
```typescript
// 1. 缓存热点数据
await cache.set(`user:${userId}:profile`, profile, { ex: 3600 });

// 2. 使用缓存预热
async function warmupCache() {
  const activeUsers = await getActiveUsers();
  for (const user of activeUsers) {
    await cache.set(`user:${user.id}:profile`, user.profile);
  }
}

// 3. 缓存失效策略
await cache.del(`user:${userId}:*`); // 删除用户所有缓存
```

### API 优化

**批量处理**:
```typescript
// 批量获取用户数据
const users = await Promise.all(
  userIds.map(id => getUserProfile(id))
);

// 使用 DataLoader
const userLoader = new DataLoader(async (ids) => {
  return await getUsersByIds(ids);
});
```

**响应压缩**:
```typescript
// next.config.ts
const nextConfig = {
  compress: true,
};
```

## 成本管理

### 成本监控

**每日成本追踪**:
```typescript
// 查看成本明细
const costs = await getCostMonitor().getCostBreakdown();
console.log('OpenAI:', costs.openai);
console.log('Supabase:', costs.supabase);
console.log('Vercel:', costs.vercel);
console.log('Total:', costs.total);
```

**成本优化建议**:
```typescript
// 获取优化建议
const suggestions = await getCostOptimizer().getOptimizationSuggestions();
for (const suggestion of suggestions) {
  console.log(`${suggestion.type}: ${suggestion.message}`);
  console.log(`Potential savings: $${suggestion.savings}`);
}
```

### 成本优化

**OpenAI 成本**:
```typescript
// 1. 使用更便宜的模型
const model = cost > threshold ? 'gpt-4o-mini' : 'gpt-4o';

// 2. 压缩图片
const optimized = await optimizeImage(image, { quality: 0.8 });

// 3. 使用缓存
const cached = await cache.get(imageHash);
if (cached) return cached;
```

**数据库成本**:
```sql
-- 1. 清理旧数据
DELETE FROM food_records
WHERE created_at < NOW() - INTERVAL '2 years';

-- 2. 归档数据
INSERT INTO food_records_archive
SELECT * FROM food_records
WHERE created_at < NOW() - INTERVAL '1 year';

-- 3. 优化存储
VACUUM FULL food_records;
```

**存储成本**:
```typescript
// 1. 删除旧图片
const oldImages = await storage
  .from('food-images')
  .list({ limit: 1000, offset: 0 });

for (const image of oldImages) {
  if (isOlderThan(image, 90)) {
    await storage.from('food-images').remove([image.name]);
  }
}

// 2. 压缩图片
await compressAndReplace(image);
```

## 安全运维

### 安全检查

**定期检查清单**:
- [ ] 更新依赖包
- [ ] 检查安全漏洞
- [ ] 审查访问日志
- [ ] 验证 RLS 策略
- [ ] 检查 API 密钥
- [ ] 审查用户权限

**安全扫描**:
```bash
# 检查依赖漏洞
npm audit

# 修复漏洞
npm audit fix

# 检查过时的包
npm outdated
```

### 密钥轮换

**轮换 API 密钥**:
```bash
# 1. 生成新密钥
openssl rand -hex 32

# 2. 更新环境变量
vercel env add ENCRYPTION_KEY

# 3. 重新部署
vercel --prod

# 4. 验证
npm run test:integration
```

**轮换周期**:
- 加密密钥: 每 90 天
- API 密钥: 每 180 天
- JWT 密钥: 每 90 天

### 访问控制

**审查访问日志**:
```sql
-- 查看异常登录
SELECT * FROM login_logs
WHERE risk_score > 50
ORDER BY created_at DESC;

-- 查看失败的登录尝试
SELECT phone_number, COUNT(*)
FROM login_logs
WHERE success = false
GROUP BY phone_number
HAVING COUNT(*) > 5;
```

## 扩展计划

### 垂直扩展

**数据库扩展**:
- Supabase Dashboard > Settings > Database
- 升级到更大的实例
- 增加连接池大小

**缓存扩展**:
- Upstash Dashboard > Database
- 升级到更大的计划
- 增加内存和吞吐量

### 水平扩展

**Vercel Functions**:
- 自动扩展（无需配置）
- 监控并发数
- 优化冷启动时间

**数据库读副本**:
```typescript
// 配置读副本
const readClient = createClient(READ_REPLICA_URL, ANON_KEY);

// 读操作使用副本
const data = await readClient.from('food_records').select('*');

// 写操作使用主库
const result = await writeClient.from('food_records').insert(record);
```

### 容量规划

**用户增长预测**:
```
当前: 1,000 用户
月增长: 20%
6 个月后: ~3,000 用户
12 个月后: ~9,000 用户
```

**资源需求**:
```
数据库:
- 当前: 1 GB
- 6 个月: 5 GB
- 12 个月: 15 GB

API 调用:
- 当前: 10,000/天
- 6 个月: 30,000/天
- 12 个月: 90,000/天
```

---

## 联系支持

**紧急问题** (P0):
- 📞 电话: +65-xxxx-xxxx
- 📧 Email: ops@vitaai.com
- 💬 Slack: #ops-emergency

**一般问题** (P1-P3):
- 📧 Email: ops@vitaai.com
- 💬 Slack: #ops

**响应时间**:
- P0 (服务中断): 15 分钟
- P1 (严重影响): 1 小时
- P2 (中等影响): 4 小时
- P3 (轻微影响): 24 小时
