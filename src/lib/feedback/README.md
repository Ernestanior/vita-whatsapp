# 用户反馈系统

用户反馈系统允许用户对食物识别结果提供反馈，帮助改进系统准确性。

## 功能

### 1. 反馈收集

用户可以提供以下类型的反馈：

- **accurate**: 识别准确
- **inaccurate**: 识别不准确
- **general**: 一般反馈
- **suggestion**: 功能建议

### 2. 反馈统计

系统自动统计：
- 总反馈数
- 准确反馈数
- 不准确反馈数
- 平均评分

### 3. 月度分析

生成月度反馈分析报告：
- 各类型反馈数量
- 平均评分
- 常见问题

### 4. 改进建议

基于反馈数据生成改进建议：
- 识别准确率分析
- 高频问题识别
- 优化建议

## 使用方法

### 提交反馈

```typescript
import { getFeedbackManager } from '@/lib/feedback';

const feedbackManager = getFeedbackManager();

// 提交反馈
const result = await feedbackManager.submitFeedback({
  userId: 'user-uuid',
  foodRecordId: 'record-uuid', // 可选
  feedbackType: 'accurate',
  rating: 5,
  comment: 'Very accurate!',
  metadata: {
    recognitionTime: 5.2,
    confidence: 0.95,
  },
});

if (result.success) {
  console.log('Feedback submitted:', result.feedbackId);
}
```

### 获取用户统计

```typescript
const stats = await feedbackManager.getUserFeedbackStats('user-uuid');

console.log('Total feedback:', stats.totalFeedback);
console.log('Accuracy rate:', 
  (stats.accurateCount / stats.totalFeedback * 100).toFixed(1) + '%'
);
```

### 生成改进报告

```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');

const report = await feedbackManager.generateImprovementReport(startDate, endDate);

console.log('Summary:', report.summary);
console.log('Top issues:', report.topIssues);
console.log('Recommendations:', report.recommendations);
```

## API 端点

### POST /api/feedback/submit

提交用户反馈

**请求体**:
```json
{
  "userId": "user-uuid",
  "foodRecordId": "record-uuid",
  "feedbackType": "accurate",
  "rating": 5,
  "comment": "Very accurate!",
  "metadata": {}
}
```

**响应**:
```json
{
  "success": true,
  "feedbackId": "feedback-uuid",
  "message": "Thank you for your feedback!"
}
```

### GET /api/feedback/stats?userId=xxx

获取用户反馈统计

**响应**:
```json
{
  "totalFeedback": 50,
  "accurateCount": 45,
  "inaccurateCount": 5,
  "avgRating": 4.5
}
```

### GET /api/feedback/report?startDate=2024-01-01&endDate=2024-01-31

生成反馈改进报告

**响应**:
```json
{
  "summary": "Period: 1/1/2024 - 1/31/2024\nTotal Feedback: 500\nAccuracy Rate: 90.0%\nAverage Rating: 4.5",
  "topIssues": [
    { "issue": "portion", "count": 15 },
    { "issue": "similar", "count": 12 }
  ],
  "recommendations": [
    "Improve food recognition model accuracy",
    "Address top issue: portion"
  ]
}
```

## WhatsApp 集成

### 在识别结果中添加反馈按钮

```typescript
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// 发送识别结果时添加反馈按钮
await sendWhatsAppMessage(phoneNumber, {
  type: 'interactive',
  interactive: {
    type: 'button',
    body: {
      text: recognitionResult,
    },
    action: {
      buttons: [
        {
          type: 'reply',
          reply: {
            id: `feedback_accurate_${recordId}`,
            title: '✅ Accurate',
          },
        },
        {
          type: 'reply',
          reply: {
            id: `feedback_inaccurate_${recordId}`,
            title: '❌ Inaccurate',
          },
        },
      ],
    },
  },
});
```

### 处理反馈按钮点击

```typescript
// 在 InteractiveHandler 中
if (buttonId.startsWith('feedback_')) {
  const [, type, recordId] = buttonId.split('_');
  
  await feedbackManager.submitFeedback({
    userId: user.id,
    foodRecordId: recordId,
    feedbackType: type as FeedbackType,
  });
  
  return 'Thank you for your feedback! 🙏';
}
```

### /feedback 命令

```typescript
// 在 TextHandler 中
if (command === '/feedback') {
  return `📝 Feedback Options:

1. Reply with feedback on a specific food record
2. Use the feedback buttons after recognition
3. Send general feedback: /feedback <your message>

Your feedback helps us improve! 🙏`;
}
```

## 数据库 Schema

### user_feedback 表

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户 ID |
| food_record_id | UUID | 食物记录 ID（可选） |
| feedback_type | VARCHAR | 反馈类型 |
| rating | INTEGER | 评分（1-5） |
| comment | TEXT | 反馈内容 |
| metadata | JSONB | 额外元数据 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 索引

- `idx_user_feedback_user_id`: 用户 ID
- `idx_user_feedback_food_record_id`: 食物记录 ID
- `idx_user_feedback_type`: 反馈类型
- `idx_user_feedback_created_at`: 创建时间

## 分析和报告

### 准确率计算

```
准确率 = (总反馈数 - 不准确反馈数) / 总反馈数 × 100%
```

### 高频问题识别

系统自动分析不准确反馈中的关键词，识别最常见的问题。

### 改进建议

基于以下指标生成建议：
- 准确率 < 85%: 改进模型
- 高频问题: 针对性优化
- 平均评分 < 3: 改进用户体验

## 最佳实践

1. **及时收集**: 在每次识别后立即提供反馈选项
2. **简化流程**: 使用按钮而不是文本输入
3. **感谢用户**: 收到反馈后立即感谢
4. **定期分析**: 每月生成改进报告
5. **采取行动**: 根据反馈优化系统

## 监控指标

- 反馈提交率: 目标 > 20%
- 准确率: 目标 > 85%
- 平均评分: 目标 > 4.0
- 响应时间: < 1 秒

## 未来改进

- [ ] 使用 NLP 自动分类反馈
- [ ] 实现反馈趋势分析
- [ ] 添加图片标注功能
- [ ] 集成 A/B 测试
- [ ] 自动化改进流程
