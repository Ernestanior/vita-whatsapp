# Migration 011 修复指南

## 问题

执行 `migrations/011_phase3_personalization_gamification.sql` 时出现错误：

```
ERROR: 42P01: relation "user_streaks" does not exist
```

## 原因

原始的 `011` 迁移文件假设 `user_streaks` 表已经存在（由 `005_gamification_complete.sql` 创建），但如果该迁移没有执行，表就不存在。

## 解决方案

我创建了一个修复版本：`migrations/011_phase3_personalization_gamification_fixed.sql`

### 修复内容

1. **创建 user_streaks 表（如果不存在）**
   - 使用 `CREATE TABLE IF NOT EXISTS`
   - 包含所有基础列
   - 创建必要的索引和 RLS 策略

2. **使用条件策略创建**
   - 使用 `DO $$ ... END $$` 块检查策略是否存在
   - 避免重复创建策略的错误

3. **所有表都使用 IF NOT EXISTS**
   - 确保迁移可以重复运行
   - 不会因为表已存在而失败

## 使用方法

### 选项 1：使用修复版本（推荐）

在 Supabase Dashboard SQL Editor 中执行：

```sql
-- 执行修复版本
migrations/011_phase3_personalization_gamification_fixed.sql
```

### 选项 2：先执行 gamification 迁移

如果您想保持原始迁移顺序：

```sql
-- 1. 先执行 gamification 迁移
migrations/005_gamification_complete.sql

-- 2. 然后执行 Phase 3 迁移（原始版本）
migrations/011_phase3_personalization_gamification.sql
```

## 修复版本的优势

1. ✅ **独立运行** - 不依赖其他迁移
2. ✅ **幂等性** - 可以安全地重复执行
3. ✅ **向后兼容** - 如果表已存在，不会报错
4. ✅ **完整性** - 包含所有必要的表和函数

## 创建的表

修复版本会创建/确保以下表存在：

- ✅ `user_streaks` - 用户打卡记录（基础 + Phase 3 扩展）
- ✅ `daily_budgets` - 每日预算追踪
- ✅ `achievements` - 用户成就记录
- ✅ `reminders` - 提醒设置
- ✅ `visual_cards` - 可视化卡片
- ✅ `feature_discovery` - 功能发现
- ✅ `user_engagement_metrics` - 参与度指标

## 扩展的表

- ✅ `user_preferences` - 添加饮食偏好、过敏原等
- ✅ `user_streaks` - 添加冻结、复出连续等
- ✅ `food_records` - 添加餐食上下文

## 创建的函数

- ✅ `get_budget_status(user_id, date)` - 获取预算状态
- ✅ `update_engagement_metrics(user_id)` - 更新参与度指标

## 验证

执行后，运行以下查询验证：

```sql
-- 检查所有表是否创建
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_streaks',
  'daily_budgets',
  'achievements',
  'reminders',
  'visual_cards',
  'feature_discovery',
  'user_engagement_metrics'
);

-- 检查 user_streaks 的列
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_streaks';

-- 检查函数是否创建
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_budget_status', 'update_engagement_metrics');
```

## 下一步

执行修复版本后：

1. ✅ 运行集成测试：`node test-phase3-user-journey.mjs`
2. ✅ 或访问：`http://localhost:3000/api/test-phase3-complete`
3. ✅ 测试 WhatsApp 命令：`streak`, `budget`, `preferences`

---

**创建时间**: 2026-02-18
**状态**: ✅ 已修复，可以执行
**文件**: `migrations/011_phase3_personalization_gamification_fixed.sql`
