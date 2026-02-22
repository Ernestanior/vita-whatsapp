# Context Understanding Module

智能上下文理解模块，提供用餐场景推断、用户偏好学习、智能推荐和饮食模式学习功能。

## 功能特性

### 1. 用餐场景推断 (Meal Scene Inference)

基于时间自动推断用餐场景：
- **早餐 (Breakfast)**: 6:00 AM - 10:00 AM
- **午餐 (Lunch)**: 11:00 AM - 2:00 PM
- **晚餐 (Dinner)**: 5:00 PM - 9:00 PM
- **加餐 (Snack)**: 其他时间

```typescript
import { getContextManager } from '@/lib/context';

const contextManager = getContextManager();

// 推断当前时间的用餐场景
const sceneInfo = contextManager.inferMealScene();
console.log(sceneInfo);
// {
//   scene: 'lunch',
//   confidence: 0.92,
//   timeRange: '11:00 AM - 2:00 PM'
// }

// 推断特定时间的用餐场景
const customTime = new Date('2024-01-15T19:30:00');
const dinnerScene = contextManager.inferMealScene(customTime);
```

### 2. 用户偏好学习 (User Preference Learning)

记录和分析用户常吃的食物：

```typescript
// 记录用户偏好
await contextManager.recordUserPreference(
  userId,
  'Chicken Rice',
  4 // 评分 1-5
);

// 获取用户偏好列表
const preferences = await contextManager.getUserPreferences(userId, 10);
console.log(preferences);
// [
//   {
//     foodName: 'Chicken Rice',
//     frequency: 15,
//     lastEaten: '2024-01-15T12:30:00Z',
//     avgRating: 4.2
//   },
//   ...
// ]

// 检查是否为偏好食物（吃过3次以上）
const isPreferred = await contextManager.isPreferredFood(userId, 'Chicken Rice');
```

### 3. 智能推荐 (Smart Recommendations)

基于用户偏好和营养缺口推荐食物：

```typescript
// 生成推荐
const recommendations = await contextManager.generateRecommendations(
  userId,
  'lunch', // 用餐场景
  3 // 推荐数量
);

console.log(recommendations);
// [
//   {
//     foodName: 'Chicken Rice',
//     reason: "You've enjoyed this 15 times before",
//     estimatedCalories: 500
//   },
//   {
//     foodName: 'Mixed Vegetable Rice',
//     reason: 'Rich in fiber and vegetables',
//     nutritionGap: 'fiber',
//     estimatedCalories: 450
//   }
// ]
```

### 4. 饮食模式学习 (Dietary Pattern Learning)

分析用户的饮食习惯并提供提醒：

```typescript
// 学习用户饮食模式（基于最近30天数据）
const pattern = await contextManager.learnDietaryPattern(userId);
console.log(pattern);
// {
//   userId: 'xxx',
//   typicalBreakfastTime: '08:00',
//   typicalLunchTime: '12:30',
//   typicalDinnerTime: '19:00',
//   avgMealsPerDay: 2.8,
//   lastUpdated: '2024-01-15T10:00:00Z'
// }

// 检查是否需要提醒用户
const reminder = await contextManager.checkMealReminder(userId);
if (reminder.shouldRemind) {
  console.log(reminder.message);
  // "Haven't logged your lunch yet. Don't forget to track your meal!"
}
```

## 数据库表结构

### user_preferences 表

存储用户食物偏好：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| food_name | VARCHAR(200) | 食物名称 |
| frequency | INTEGER | 食用频率 |
| avg_rating | NUMERIC(3,2) | 平均评分 |
| last_eaten | TIMESTAMP | 最后食用时间 |

### dietary_patterns 表

存储用户饮食模式：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| typical_breakfast_time | TIME | 典型早餐时间 |
| typical_lunch_time | TIME | 典型午餐时间 |
| typical_dinner_time | TIME | 典型晚餐时间 |
| avg_meals_per_day | NUMERIC(3,1) | 平均每日用餐次数 |

### food_records 表新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| meal_scene | VARCHAR(20) | 用餐场景 (breakfast/lunch/dinner/snack) |

## WhatsApp 集成示例

### 场景1: 自动推断用餐场景

```typescript
import { getContextManager } from '@/lib/context';

// 用户发送食物照片
const contextManager = getContextManager();
const sceneInfo = contextManager.inferMealScene();

// 在识别结果中包含场景信息
const message = `
🍽️ Meal Scene: ${sceneInfo.scene.toUpperCase()}
⏰ Time: ${sceneInfo.timeRange}

[食物识别结果...]
`;
```

### 场景2: 用户询问"今天吃什么"

```typescript
// 检测到用户询问
if (userMessage.includes('what to eat') || userMessage.includes('今天吃什么')) {
  const sceneInfo = contextManager.inferMealScene();
  const recommendations = await contextManager.generateRecommendations(
    userId,
    sceneInfo.scene,
    3
  );

  let message = `🤔 Here are some suggestions for ${sceneInfo.scene}:\n\n`;
  
  recommendations.forEach((rec, index) => {
    message += `${index + 1}. ${rec.foodName}\n`;
    message += `   💡 ${rec.reason}\n`;
    if (rec.estimatedCalories > 0) {
      message += `   🔥 ~${rec.estimatedCalories} cal\n`;
    }
    message += '\n';
  });

  await sendWhatsAppMessage(phoneNumber, message);
}
```

### 场景3: 饮食模式提醒

```typescript
// 定时任务：每天检查用户是否需要提醒
import { getContextManager } from '@/lib/context';

async function checkMealReminders() {
  const contextManager = getContextManager();
  
  // 获取所有活跃用户
  const users = await getActiveUsers();
  
  for (const user of users) {
    const reminder = await contextManager.checkMealReminder(user.id);
    
    if (reminder.shouldRemind) {
      await sendWhatsAppMessage(user.phone_number, reminder.message);
    }
  }
}

// 每小时运行一次
setInterval(checkMealReminders, 60 * 60 * 1000);
```

### 场景4: 记录偏好并提供个性化评价

```typescript
// 在保存食物记录后
await contextManager.recordUserPreference(
  userId,
  foodName,
  healthRating // 使用健康评分作为偏好评分
);

// 检查是否为偏好食物
const isPreferred = await contextManager.isPreferredFood(userId, foodName);

if (isPreferred) {
  message += '\n\n💚 This is one of your favorite foods!';
}
```

## 配置要求

### 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
```

### 数据库迁移

运行迁移脚本创建必要的表：

```bash
psql -h your_host -U your_user -d your_db -f migrations/006_context_understanding.sql
```

## 性能优化

1. **缓存用户偏好**: 使用 Redis 缓存高频访问的用户偏好数据
2. **批量处理**: 在生成推荐时批量查询数据库
3. **异步学习**: 饮食模式学习可以异步执行，不阻塞主流程
4. **索引优化**: 已为常用查询字段创建索引

## 隐私和安全

1. **RLS 策略**: 所有表都启用了 Row Level Security
2. **数据脱敏**: 日志中不包含敏感的食物偏好信息
3. **用户控制**: 用户可以选择是否启用智能推荐功能

## 测试

```typescript
// 测试用餐场景推断
describe('ContextManager - Meal Scene Inference', () => {
  it('should infer breakfast correctly', () => {
    const morning = new Date('2024-01-15T08:00:00');
    const scene = contextManager.inferMealScene(morning);
    expect(scene.scene).toBe('breakfast');
    expect(scene.confidence).toBeGreaterThan(0.8);
  });
});

// 测试用户偏好
describe('ContextManager - User Preferences', () => {
  it('should record and retrieve preferences', async () => {
    await contextManager.recordUserPreference(userId, 'Chicken Rice', 4);
    const prefs = await contextManager.getUserPreferences(userId);
    expect(prefs[0].foodName).toBe('Chicken Rice');
  });
});
```

## 未来扩展

1. **位置推荐**: 集成地图 API，推荐附近的健康餐厅
2. **社交推荐**: 基于相似用户的偏好推荐
3. **季节性推荐**: 根据季节推荐应季食物
4. **预算推荐**: 考虑用户预算的推荐
5. **过敏原检测**: 基于用户过敏信息过滤推荐

## 相关需求

- 需求 16.1: 用餐场景推断
- 需求 16.2: 用户偏好学习
- 需求 16.3: 智能推荐（基于偏好）
- 需求 16.4: 智能推荐（基于营养缺口）
- 需求 16.5: 位置推荐（可选）
- 需求 16.6: 饮食模式学习和提醒
