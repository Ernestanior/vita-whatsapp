# 游戏化系统（Gamification System）

社交和激励机制，包括连续打卡、成就系统、每周目标和排行榜。

## 功能概述

### 1. 连续打卡系统（Streak System）

追踪用户连续使用天数，激励用户保持健康习惯。

**功能**:
- 自动记录每日打卡
- 追踪当前连续天数
- 记录最长连续记录
- 里程碑祝贺（7天、30天、100天）

**使用示例**:
```typescript
import { getGamificationManager } from '@/lib/gamification';

const manager = getGamificationManager();

// 更新打卡（用户记录食物时自动调用）
const streakData = await manager.updateStreak(userId);

if (streakData) {
  console.log(`Current streak: ${streakData.currentStreak} days`);
  
  if (streakData.isNewRecord) {
    console.log('🎉 New record!');
  }
}

// 获取打卡数据
const streak = await manager.getUserStreak(userId);
```

### 2. 成就系统（Achievement System）

用户通过完成特定任务解锁成就，获得积分和徽章。

**预定义成就**:

| 成就代码 | 名称 | 要求 | 积分 |
|---------|------|------|------|
| `streak_7` | Week Warrior | 连续打卡7天 | 100 |
| `streak_30` | Month Master | 连续打卡30天 | 500 |
| `streak_100` | Century Champion | 连续打卡100天 | 2000 |
| `recognition_10` | Food Explorer | 识别10种食物 | 50 |
| `recognition_50` | Food Connoisseur | 识别50种食物 | 200 |
| `recognition_100` | Food Master | 识别100种食物 | 500 |
| `healthy_7` | Green Week | 连续7天健康饮食 | 150 |
| `healthy_30` | Green Month | 连续30天健康饮食 | 600 |
| `goal_1` | Goal Getter | 完成第一个目标 | 100 |
| `goal_10` | Goal Master | 完成10个目标 | 500 |

**使用示例**:
```typescript
// 检查并解锁成就
const newAchievements = await manager.checkAndUnlockAchievements(userId, language);

for (const achievement of newAchievements) {
  console.log(`🏆 Unlocked: ${achievement.name}`);
  console.log(`+${achievement.points} points`);
}

// 获取所有成就
const achievements = await manager.getUserAchievements(userId, language);
```

### 3. 每周目标系统（Weekly Goals）

用户设置每周健康目标，系统自动追踪进度。

**目标类型**:
- `meals`: 记录餐食次数
- `green_meals`: 健康餐食次数
- `exercise`: 运动次数

**使用示例**:
```typescript
// 创建每周目标
await manager.createWeeklyGoal(userId, 'meals', 21); // 每周21餐

// 更新目标进度
await manager.updateWeeklyGoalProgress(userId, 'meals', 1);

// 获取当前目标
const goals = await manager.getUserWeeklyGoals(userId);

for (const goal of goals) {
  console.log(`${goal.goalType}: ${goal.progress}%`);
  
  if (goal.status === 'completed') {
    console.log('🎉 Goal completed!');
  }
}
```

### 4. 排行榜系统（Leaderboard）

可选功能，用户可以选择加入公开排行榜。

**使用示例**:
```typescript
// 更新排行榜
await manager.updateLeaderboard(
  userId,
  healthScore,
  totalPoints,
  'John Doe',
  true // 公开
);

// 获取排行榜
const leaderboard = await manager.getLeaderboard(10);

leaderboard.forEach((entry) => {
  console.log(`${entry.rank}. ${entry.displayName} - ${entry.healthScore}`);
});
```

## WhatsApp 集成

### 打卡消息

```typescript
// 在用户记录食物后
const streakData = await manager.updateStreak(userId);

if (streakData) {
  const message = manager.generateStreakMessage(streakData, language);
  await sendWhatsAppMessage(phoneNumber, message);
}
```

### 成就通知

```typescript
// 检查新成就
const newAchievements = await manager.checkAndUnlockAchievements(userId, language);

for (const achievement of newAchievements) {
  const message = getGamificationTranslation('achievement.unlocked', language, {
    icon: achievement.icon,
    name: achievement.name,
    description: achievement.description,
    points: achievement.points.toString(),
  });
  
  await sendWhatsAppMessage(phoneNumber, message);
}
```

### 命令处理

```typescript
// /streak 命令
if (command === '/streak') {
  const streak = await manager.getUserStreak(userId);
  const message = getGamificationTranslation('streak.stats', language, {
    current: streak.currentStreak.toString(),
    longest: streak.longestStreak.toString(),
    total: streak.totalCheckins.toString(),
  });
  return message;
}

// /achievements 命令
if (command === '/achievements') {
  const achievements = await manager.getUserAchievements(userId, language);
  
  if (achievements.length === 0) {
    return getGamificationTranslation('achievement.empty', language);
  }
  
  const achievementList = achievements
    .map((a) => `${a.icon} ${a.name} (+${a.points})`)
    .join('\n');
    
  return getGamificationTranslation('achievement.list', language, {
    count: achievements.length.toString(),
    achievements: achievementList,
  });
}

// /goals 命令
if (command === '/goals') {
  const goals = await manager.getUserWeeklyGoals(userId);
  
  if (goals.length === 0) {
    return getGamificationTranslation('goal.empty', language);
  }
  
  const goalList = goals
    .map((g) => `${g.goalType}: ${g.currentValue}/${g.targetValue} (${g.progress.toFixed(0)}%)`)
    .join('\n');
    
  return getGamificationTranslation('goal.list', language, {
    goals: goalList,
  });
}
```

## 数据库 Schema

### user_streaks 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| current_streak | INTEGER | 当前连续天数 |
| longest_streak | INTEGER | 最长连续天数 |
| last_checkin_date | DATE | 最后打卡日期 |
| total_checkins | INTEGER | 总打卡次数 |

### achievements 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| code | VARCHAR | 成就代码 |
| name_* | VARCHAR | 多语言名称 |
| description_* | TEXT | 多语言描述 |
| icon | VARCHAR | 图标 emoji |
| category | VARCHAR | 分类 |
| requirement_type | VARCHAR | 要求类型 |
| requirement_value | INTEGER | 要求值 |
| points | INTEGER | 积分 |

### user_achievements 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| achievement_id | UUID | 成就 ID |
| unlocked_at | TIMESTAMP | 解锁时间 |
| notified | BOOLEAN | 是否已通知 |

### weekly_goals 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| week_start_date | DATE | 周开始日期 |
| goal_type | VARCHAR | 目标类型 |
| target_value | INTEGER | 目标值 |
| current_value | INTEGER | 当前值 |
| status | VARCHAR | 状态 |

### leaderboard 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| display_name | VARCHAR | 显示名称 |
| health_score | INTEGER | 健康评分 |
| total_points | INTEGER | 总积分 |
| rank | INTEGER | 排名 |
| is_public | BOOLEAN | 是否公开 |

## 自动化流程

### 1. 每日打卡

```typescript
// 在用户记录食物时自动触发
async function onFoodRecorded(userId: string, language: string) {
  // 更新打卡
  const streakData = await manager.updateStreak(userId);
  
  // 检查成就
  const newAchievements = await manager.checkAndUnlockAchievements(userId, language);
  
  // 更新目标进度
  await manager.updateWeeklyGoalProgress(userId, 'meals', 1);
  
  // 发送通知
  if (streakData) {
    const message = manager.generateStreakMessage(streakData, language);
    await sendWhatsAppMessage(phoneNumber, message);
  }
  
  for (const achievement of newAchievements) {
    // 发送成就通知
  }
}
```

### 2. 每周目标检查

```typescript
// 每周一重置目标
async function resetWeeklyGoals() {
  // 标记上周未完成的目标为 'failed'
  // 用户需要重新设置本周目标
}
```

### 3. 排行榜更新

```typescript
// 每天更新排行榜
async function updateDailyLeaderboard() {
  // 计算所有用户的健康评分
  // 更新排名
}
```

## 最佳实践

1. **及时反馈**: 用户完成动作后立即显示打卡和成就
2. **渐进式难度**: 成就从简单到困难，保持用户动力
3. **个性化目标**: 允许用户设置适合自己的目标
4. **隐私保护**: 排行榜默认匿名，用户可选择公开
5. **正向激励**: 使用鼓励性语言，避免负面反馈

## 监控指标

- 打卡率: 目标 > 60%
- 平均连续天数: 目标 > 7 天
- 成就解锁率: 目标 > 30%
- 目标完成率: 目标 > 50%

## 未来改进

- [ ] 添加更多成就类型
- [ ] 实现好友系统
- [ ] 添加团队挑战
- [ ] 实现成就分享功能
- [ ] 添加季节性活动
- [ ] 实现虚拟奖励商店
