# Phase 3 用户测试指南 / User Testing Guide

## 🚀 快速开始 / Quick Start

### 第一步：应用数据库迁移 / Step 1: Apply Database Migration

**这是最重要的一步！/ This is the most important step!**

1. 打开 Supabase Dashboard / Open Supabase Dashboard
2. 进入 SQL Editor / Go to SQL Editor
3. 复制文件内容 / Copy file contents: `migrations/011_phase3_FINAL.sql`
4. 粘贴并运行 / Paste and run
5. 等待成功消息 / Wait for success message

### 第二步：验证系统就绪 / Step 2: Verify System Ready

```bash
node verify-phase3-ready.mjs
```

如果所有检查通过，你会看到：/ If all checks pass, you'll see:
```
🎉 All critical checks passed!
✅ Phase 3 is READY for testing!
```

### 第三步：运行集成测试 / Step 3: Run Integration Tests

```bash
node test-phase3-user-journey.mjs
```

期望结果 / Expected result:
```
Total Tests: 13
Passed: 13 ✅
Failed: 0
```

---

## 📱 WhatsApp 测试场景 / WhatsApp Testing Scenarios

### 场景 1：首次记录餐食 / Scenario 1: First Meal Log

**操作 / Action**: 发送食物照片到 WhatsApp bot

**期望响应 / Expected Response**:
```
🍽️ Meal logged successfully!

📊 Nutrition:
Calories: 450 kcal
Protein: 25g
...

🎉 First meal logged! Your journey begins!
🔥 1-day streak!
```

### 场景 2：查看连续打卡 / Scenario 2: Check Streak

**操作 / Action**: 发送消息 `streak` 或 `stats`

**期望响应 / Expected Response**:
```
🔥 Your Streak Stats

Current Streak: 3 days
Longest Streak: 3 days
Total Meals: 8
Days Active: 3

🏆 Achievements Earned:
🎯 First Step - Logged your first meal
🔥 3-Day Starter - Maintained a 3-day streak

❄️ Streak Freezes: 1 available
```

### 场景 3：设置每日预算 / Scenario 3: Set Daily Budget

**操作 / Action**: 发送消息 `budget set 1800`

**期望响应 / Expected Response**:
```
✅ Daily budget set to 1800 calories

I'll help you track your intake and let you know how you're doing throughout the day.
```

### 场景 4：查看预算状态 / Scenario 4: Check Budget Status

**操作 / Action**: 发送消息 `budget status`

**期望响应 / Expected Response**:
```
📊 Budget Status

Target: 1800 kcal
Consumed: 1200 kcal
Remaining: 600 kcal

Status: On track! 👍
```

### 场景 5：学习饮食偏好 / Scenario 5: Learn Dietary Preferences

**操作 / Action**: 发送消息 `I'm vegetarian` 或 `我是素食主义者`

**期望响应 / Expected Response**:
```
✅ Got it! I've noted that you're vegetarian.

I'll keep this in mind for future meal suggestions.
```

### 场景 6：过敏原警告 / Scenario 6: Allergen Warning

**操作 1 / Action 1**: 发送消息 `I'm allergic to peanuts`

**操作 2 / Action 2**: 记录含花生的餐食 / Log a meal with peanuts

**期望响应 / Expected Response**:
```
⚠️ ALLERGEN WARNING

This meal contains: peanuts
Severity: SEVERE

Please double-check before consuming!
```

### 场景 7：功能发现 / Scenario 7: Feature Discovery

**第 2 天 / Day 2**: 系统建议提醒功能 / System suggests reminders
```
💡 Tip: Want to stay consistent? 

You can set daily reminders to help you remember to log your meals. Just type "reminders on" to get started!
```

**第 3 天 / Day 3**: 系统建议预算追踪 / System suggests budget tracking
```
💡 Tip: Track your daily calorie budget

Set a daily calorie goal and I'll help you stay on track. Try "budget set 1800" to get started!
```

**第 7 天 / Day 7**: 系统提及社交功能 / System mentions social features
```
💡 Tip: Share your progress

You can generate beautiful summary cards to share your achievements. Try "card daily" to see your progress!
```

---

## 🎮 可用命令 / Available Commands

### 核心命令 / Core Commands (Production Ready)

| 命令 / Command | 功能 / Function | 示例 / Example |
|---------------|----------------|---------------|
| `streak` | 查看连续打卡和成就 / View streak and achievements | `streak` |
| `stats` | 同上 / Same as streak | `stats` |
| `budget set <amount>` | 设置每日卡路里预算 / Set daily calorie budget | `budget set 1800` |
| `budget status` | 查看预算状态 / Check budget status | `budget status` |
| `budget disable` | 关闭预算追踪 / Disable budget tracking | `budget disable` |
| `preferences` | 查看学习到的偏好 / View learned preferences | `preferences` |
| `settings` | 同上 / Same as preferences | `settings` |

### 占位命令 / Placeholder Commands (Coming Soon)

| 命令 / Command | 功能 / Function | 状态 / Status |
|---------------|----------------|--------------|
| `card daily` | 生成每日总结卡片 / Generate daily summary card | 🚧 开发中 / In development |
| `card weekly` | 生成每周总结卡片 / Generate weekly summary card | 🚧 开发中 / In development |
| `reminders on` | 开启提醒 / Enable reminders | 🚧 开发中 / In development |
| `reminders off` | 关闭提醒 / Disable reminders | 🚧 开发中 / In development |
| `compare` | 周对比 / Week-over-week comparison | 🚧 开发中 / In development |
| `progress` | 同上 / Same as compare | 🚧 开发中 / In development |

---

## 🏆 成就系统 / Achievement System

### 里程碑成就 / Milestone Achievements

| 成就 / Achievement | 条件 / Condition | 等级 / Tier |
|-------------------|-----------------|------------|
| 🎯 First Step | 记录第一餐 / Log first meal | Bronze |
| 🔥 3-Day Starter | 连续 3 天 / 3-day streak | Bronze |
| ⚔️ Week Warrior | 连续 7 天 / 7-day streak | Silver |
| 🏅 Two Week Champion | 连续 14 天 / 14-day streak | Silver |
| 🦸 Three Week Hero | 连续 21 天 / 21-day streak | Gold |
| 👑 Month Master | 连续 30 天 / 30-day streak | Gold |
| 🌟 Two Month Legend | 连续 60 天 / 60-day streak | Platinum |
| 🚀 Three Month Titan | 连续 90 天 / 90-day streak | Platinum |

### 快速成就 / Quick Win Achievements

| 成就 / Achievement | 条件 / Condition | 等级 / Tier |
|-------------------|-----------------|------------|
| 💪 Strong Start | 第一天记录 3 餐 / Log 3 meals on first day | Bronze |
| 💫 Comeback Kid | 中断后重新连续 3 天 / 3-day streak after break | Silver |
| 🎖️ Weekend Warrior | 周末两天都记录 / Log on both weekend days | Bronze |
| 🌞 Full Day | 一天记录 3 餐 / Log 3 meals in one day | Bronze |

---

## 🧪 测试清单 / Testing Checklist

### 基础功能 / Basic Features
- [ ] 记录第一餐，获得首次成就 / Log first meal, get first achievement
- [ ] 连续记录，查看连续打卡增长 / Log consecutively, see streak grow
- [ ] 使用 `streak` 命令查看统计 / Use `streak` command to view stats
- [ ] 设置每日预算 / Set daily budget
- [ ] 查看预算状态 / Check budget status
- [ ] 超过预算，收到支持性消息 / Exceed budget, get supportive message

### 偏好学习 / Preference Learning
- [ ] 发送 "I'm vegetarian"，系统记录 / Send "I'm vegetarian", system records
- [ ] 发送 "I'm allergic to peanuts"，系统记录 / Send "I'm allergic to peanuts", system records
- [ ] 记录含过敏原的餐食，收到警告 / Log meal with allergen, get warning
- [ ] 使用 `preferences` 命令查看 / Use `preferences` command to view

### 功能发现 / Feature Discovery
- [ ] 第 2 天收到提醒功能建议 / Day 2: Get reminder suggestion
- [ ] 第 3 天收到预算功能建议 / Day 3: Get budget suggestion
- [ ] 第 7 天收到社交功能提及 / Day 7: Get social feature mention

### 成就系统 / Achievement System
- [ ] 获得 "First Step" 成就 / Earn "First Step" achievement
- [ ] 获得 "3-Day Starter" 成就 / Earn "3-Day Starter" achievement
- [ ] 查看成就列表 / View achievement list

### 双语支持 / Bilingual Support
- [ ] 英文命令正常工作 / English commands work
- [ ] 中文命令正常工作 / Chinese commands work
- [ ] 响应语言匹配用户语言 / Response language matches user language

---

## 🐛 已知问题 / Known Issues

### 已修复 / Fixed ✅
- ~~Streak Manager 列名不匹配~~ / ~~Streak Manager column name mismatch~~
- ~~Logger pino-pretty 错误~~ / ~~Logger pino-pretty error~~
- ~~数据库迁移语法错误~~ / ~~Database migration syntax errors~~

### 当前问题 / Current Issues
1. **卡片生成功能未实现** / Card generation not implemented
   - 状态 / Status: 占位实现 / Stub implementation
   - 优先级 / Priority: 低 / Low (视觉增强，非核心功能 / Visual enhancement, not core)

2. **提醒服务未实现** / Reminder service not implemented
   - 状态 / Status: 占位实现 / Stub implementation
   - 优先级 / Priority: 中 / Medium (需要后台任务基础设施 / Requires background job infrastructure)

3. **对比引擎未实现** / Comparison engine not implemented
   - 状态 / Status: 占位实现 / Stub implementation
   - 优先级 / Priority: 中 / Medium (周对比统计 / Week-over-week stats)

---

## 📞 需要帮助？/ Need Help?

### 如果测试失败 / If Tests Fail

1. **检查数据库迁移** / Check database migration
   ```bash
   node verify-phase3-ready.mjs
   ```

2. **查看服务器日志** / Check server logs
   - 开发服务器应该在运行 / Dev server should be running
   - 查看控制台错误 / Check console for errors

3. **重启开发服务器** / Restart dev server
   ```bash
   npm run dev
   ```

### 常见问题 / Common Issues

**Q: 命令不响应 / Commands not responding**
A: 确保命令格式正确，支持英文和中文 / Ensure command format is correct, supports English and Chinese

**Q: 连续打卡没有更新 / Streak not updating**
A: 检查数据库迁移是否成功应用 / Check if database migration was successfully applied

**Q: 预算追踪不工作 / Budget tracking not working**
A: 先使用 `budget set <amount>` 启用 / First enable with `budget set <amount>`

---

## 🎯 测试目标 / Testing Goals

### 主要目标 / Primary Goals
1. ✅ 验证核心功能正常工作 / Verify core features work
2. ✅ 确认用户体验流畅 / Confirm smooth user experience
3. ✅ 测试双语支持 / Test bilingual support
4. ✅ 验证数据持久化 / Verify data persistence

### 次要目标 / Secondary Goals
1. 收集用户反馈 / Collect user feedback
2. 识别边缘情况 / Identify edge cases
3. 优化响应消息 / Optimize response messages
4. 改进功能发现时机 / Improve feature discovery timing

---

## 📊 反馈表单 / Feedback Form

测试完成后，请提供反馈：/ After testing, please provide feedback:

1. **哪些功能运行良好？** / What features work well?
2. **哪些功能需要改进？** / What features need improvement?
3. **响应消息是否清晰？** / Are response messages clear?
4. **功能发现时机是否合适？** / Is feature discovery timing appropriate?
5. **还需要哪些功能？** / What other features are needed?

---

生成时间 / Generated: 2026-02-18
状态 / Status: 准备测试 / Ready for Testing
版本 / Version: Phase 3 MVP
