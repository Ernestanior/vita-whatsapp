# Daily Digest Module

This module generates personalized daily health summaries for users based on their food intake throughout the day.

## Features

- **Data Aggregation**: Collects and aggregates all food records for a specific date
- **Nutrition Analysis**: Calculates total calories, macronutrients, and sodium intake
- **Health Scoring**: Computes average health score and rating distribution
- **Personalized Insights**: Generates insights based on user goals and daily targets
- **Smart Recommendations**: Provides actionable recommendations for improvement
- **Exercise Suggestions**: Calculates exercise needed to burn excess calories
- **Multi-language Support**: Formats messages in English, Simplified Chinese, and Traditional Chinese

## Requirements

Implements the following requirements from the spec:
- **6.2**: Aggregate daily food data and calculate totals
- **6.3**: Generate insights comparing actual vs target intake
- **6.4**: Provide personalized recommendations based on user goals
- **6.5**: Calculate exercise suggestions for excess calories

## Usage

### Generate Daily Digest

```typescript
import { dailyDigestGenerator } from '@/lib/digest';

// Generate digest for a specific date
const digest = await dailyDigestGenerator.generateDigest(
  userId,
  '2024-01-15' // YYYY-MM-DD format
);

console.log(digest);
// {
//   userId: '...',
//   date: '2024-01-15',
//   summary: {
//     totalCalories: 1850,
//     mealsCount: 3,
//     nutritionBreakdown: { protein: 85, carbs: 220, fat: 60, sodium: 1800 },
//     healthScore: 78,
//     ratingDistribution: { green: 2, yellow: 1, red: 0 }
//   },
//   insights: [...],
//   recommendations: [...],
//   exerciseSuggestion: '...'
// }
```

### Format for WhatsApp

```typescript
// Format digest as WhatsApp message
const message = dailyDigestGenerator.formatDigestMessage(
  digest,
  'en' // or 'zh-CN', 'zh-TW'
);

// Send via WhatsApp
await whatsappClient.sendTextMessage(userId, message);
```

## Data Structure

### DailyDigest

```typescript
interface DailyDigest {
  userId: string;
  date: string; // YYYY-MM-DD
  summary: {
    totalCalories: number;
    mealsCount: number;
    nutritionBreakdown: {
      protein: number;
      carbs: number;
      fat: number;
      sodium: number;
    };
    healthScore: number; // 0-100
    ratingDistribution: {
      green: number;
      yellow: number;
      red: number;
    };
  };
  insights: string[];
  recommendations: string[];
  exerciseSuggestion?: string;
}
```

## Insight Generation

The digest generator analyzes the following factors:

1. **Calorie Comparison**: Compares actual intake vs daily target
2. **Protein Analysis**: Checks if protein intake meets requirements
3. **Sodium Analysis**: Warns if sodium exceeds WHO recommendations (2000mg)
4. **Health Score**: Evaluates overall health score for the day
5. **Rating Distribution**: Analyzes green/yellow/red meal distribution
6. **Goal-Specific**: Provides insights tailored to user's health goal

## Recommendation Logic

Recommendations are generated based on:

1. **Calorie Deviation**: Suggests portion control or additional meals
2. **Protein Deficiency**: Recommends protein-rich foods
3. **High Sodium**: Suggests reducing salty foods and drinking water
4. **Macronutrient Balance**: Recommends balancing protein, carbs, and fats
5. **Poor Ratings**: Suggests meal planning and home cooking
6. **Goal-Specific**: Provides tips aligned with user's health goal

## Exercise Calculations

Exercise suggestions are calculated for excess calories (>100 kcal over target):

- **Running**: ~60 kcal per km
- **Walking**: ~40 kcal per 1000 steps
- **Cycling**: ~50 kcal per km

Example: 300 excess calories = 5 km run, 7500 steps, or 6 km cycling

## Empty Day Handling

When no meals are recorded:
- Returns a digest with zero values
- Provides encouraging messages
- Suggests starting to track meals tomorrow

## Multi-language Support

All messages are available in three languages:
- **English** (`en`)
- **Simplified Chinese** (`zh-CN`)
- **Traditional Chinese** (`zh-TW`)

The format includes:
- Emoji indicators for visual appeal
- Clear section headers
- Numbered recommendations
- Encouraging closing messages

## Integration

This module integrates with:
- **ProfileManager**: Gets user health profile and daily targets
- **RatingEngine**: Calculates daily nutritional targets
- **Supabase**: Queries food records from database
- **WhatsApp Client**: Sends formatted digest messages

## Example Output

### English

```
📅 Daily Health Summary - 2024-01-15

📊 Today's Overview:
• Meals tracked: 3
• Total calories: 1850 kcal
• Health score: 78/100
• Ratings: 🟢2 🟡1 🔴0

🍽️ Nutrition Breakdown:
• Protein: 85g
• Carbs: 220g
• Fat: 60g
• Sodium: 1800mg

💡 Key Insights:
✅ Great job! Your calorie intake (1850 kcal) is right on target.
🥩 Excellent protein intake (85g)!
🧂 Good job keeping sodium low (1800mg)!
💪 Decent health score (78/100). Room for improvement!

🎯 Recommendations:
1. Balance your meals with more protein and healthy fats
2. Choose whole grains over refined carbs
3. Eat slowly and stop when 80% full

Keep up the great work! 🌟
```

### Chinese (Simplified)

```
📅 每日健康总结 - 2024-01-15

📊 今日概览：
• 记录餐数：3
• 总卡路里：1850 千卡
• 健康评分：78/100
• 评级分布：🟢2 🟡1 🔴0

🍽️ 营养摄入：
• 蛋白质：85克
• 碳水化合物：220克
• 脂肪：60克
• 钠：1800毫克

💡 关键洞察：
✅ 很好！您的卡路里摄入（1850千卡）正好达标。
🥩 蛋白质摄入优秀（85克）！
🧂 钠含量控制得很好（1800毫克）！
💪 健康评分不错（78/100）。还有提升空间！

🎯 建议：
1. 平衡膳食，增加蛋白质和健康脂肪
2. 选择全谷物而非精制碳水
3. 慢慢吃，八分饱即可

继续保持！🌟
```

## Testing

To test the digest generator:

```typescript
// Test with sample data
const testUserId = 'test-user-123';
const testDate = '2024-01-15';

const digest = await dailyDigestGenerator.generateDigest(testUserId, testDate);

// Verify structure
expect(digest.userId).toBe(testUserId);
expect(digest.date).toBe(testDate);
expect(digest.summary).toBeDefined();
expect(digest.insights.length).toBeGreaterThan(0);
expect(digest.recommendations.length).toBeGreaterThan(0);

// Test formatting
const message = dailyDigestGenerator.formatDigestMessage(digest, 'en');
expect(message).toContain('Daily Health Summary');
expect(message).toContain('Today\'s Overview');
```

## Performance Considerations

- Queries are optimized with date range filters
- Uses indexed `created_at` column for fast lookups
- Aggregation is done in-memory (efficient for daily data)
- Caching can be added for frequently accessed digests

## Future Enhancements

1. **Weekly/Monthly Summaries**: Aggregate data over longer periods
2. **Trend Analysis**: Compare current week vs previous weeks
3. **Goal Progress**: Track progress towards long-term health goals
4. **Achievements**: Award badges for consistent healthy eating
5. **Comparative Insights**: Compare with similar users (anonymized)
6. **AI-Enhanced Insights**: Use GPT to generate more personalized insights
