# RatingEngine

The RatingEngine evaluates food nutrition and provides personalized health ratings using a red/yellow/green light system.

## Features

- **Daily Target Calculation**: Uses Mifflin-St Jeor formula to calculate personalized daily nutritional targets
- **Multi-Factor Evaluation**: Evaluates calories, sodium, fat content, and nutritional balance
- **Personalized Ratings**: Adjusts evaluation based on user's health goal, activity level, and profile
- **Actionable Suggestions**: Generates specific, actionable health improvement suggestions

## Requirements Implemented

- **3.1**: Red/Yellow/Green health rating system
- **3.2**: Health tips and factor-specific messages
- **3.3**: Improvement suggestions based on evaluation
- **3.4**: Personalized evaluation based on user health profile

## Usage

```typescript
import { ratingEngine } from '@/lib/rating/rating-engine';
import type { HealthProfile, FoodRecognitionResult } from '@/types';

// User's health profile
const profile: HealthProfile = {
  userId: 'user-123',
  height: 170,
  weight: 70,
  age: 30,
  gender: 'male',
  goal: 'lose-weight',
  activityLevel: 'light',
  // ... other fields
};

// Food recognition result
const food: FoodRecognitionResult = {
  foods: [/* ... */],
  totalNutrition: {
    calories: { min: 500, max: 600 },
    protein: { min: 30, max: 35 },
    carbs: { min: 60, max: 70 },
    fat: { min: 15, max: 20 },
    sodium: { min: 600, max: 800 },
  },
  mealContext: 'lunch',
};

// Evaluate food
const rating = await ratingEngine.evaluate(food, profile);

console.log(rating);
// {
//   overall: 'green',
//   score: 85,
//   factors: [
//     { name: 'Calories', status: 'good', message: '...' },
//     { name: 'Sodium', status: 'good', message: '...' },
//     { name: 'Fat', status: 'good', message: '...' },
//     { name: 'Balance', status: 'good', message: '...' }
//   ],
//   suggestions: ['💡 Tip: Eat slowly and stop when 80% full']
// }
```

## Daily Target Calculation

The engine calculates personalized daily nutritional targets using the **Mifflin-St Jeor equation**:

### BMR (Basal Metabolic Rate)

**For Males:**
```
BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
```

**For Females:**
```
BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
```

### TDEE (Total Daily Energy Expenditure)

```
TDEE = BMR × Activity Multiplier
```

Activity multipliers:
- Sedentary: 1.2
- Light: 1.375
- Moderate: 1.55
- Active: 1.725

### Goal Adjustments

- **Lose Weight**: TDEE - 500 kcal
- **Gain Muscle**: TDEE + 300 kcal
- **Control Sugar**: TDEE (no adjustment)
- **Maintain**: TDEE (no adjustment)

### Macronutrient Targets

- **Protein**: 
  - Weight loss/maintain: 1.2g per kg body weight
  - Muscle gain: 2.0g per kg body weight
- **Carbs**: 50% of daily calories ÷ 4 (cal/g)
- **Fat**: 25% of daily calories ÷ 9 (cal/g)
- **Sodium**: 2000mg (WHO recommendation)

## Evaluation Factors

### 1. Calories

Evaluates if calorie content is appropriate for the meal context:

- **Breakfast**: 25% of daily target
- **Lunch**: 35% of daily target
- **Dinner**: 30% of daily target
- **Snack**: 10% of daily target

Scoring:
- **Good**: Within ±10% of expected
- **Moderate**: Within ±20% of expected
- **Poor**: More than ±20% deviation

### 2. Sodium

Evaluates sodium content against WHO recommendations:

- **Good**: < 500mg per meal
- **Moderate**: 500-1000mg per meal
- **Poor**: > 1000mg per meal

### 3. Fat

Evaluates fat as percentage of total calories:

- **Good**: < 25% of calories from fat
- **Moderate**: 25-35% of calories from fat
- **Poor**: > 35% of calories from fat

### 4. Balance

Evaluates macronutrient distribution:

Ideal ranges:
- Protein: 15-30% of calories
- Carbs: 45-65% of calories
- Fat: 20-35% of calories

Scoring:
- **Good**: All 3 macros in range
- **Moderate**: 2 macros in range
- **Poor**: < 2 macros in range

## Overall Rating

The overall score (0-100) is calculated as a weighted average:

- Calories: 35%
- Sodium: 25%
- Fat: 20%
- Balance: 20%

Rating levels:
- **Green**: Score ≥ 80 (Healthy)
- **Yellow**: Score 60-79 (Moderate)
- **Red**: Score < 60 (Unhealthy)

## Personalization

The engine personalizes ratings based on:

1. **Health Goal**:
   - Lose weight: Penalizes high calories
   - Gain muscle: More lenient on high calories, emphasizes protein
   - Control sugar: Emphasizes balanced carbs
   - Maintain: Balanced evaluation

2. **Activity Level**:
   - Adjusts daily calorie target
   - Higher activity = higher calorie needs

3. **Meal Context**:
   - Different calorie expectations for breakfast/lunch/dinner/snack
   - Adjusts evaluation accordingly

## Suggestions

The engine generates up to 4 personalized suggestions based on:

- Poor or moderate factor scores
- User's health goal
- Specific nutritional issues detected

Example suggestions:
- "Consider smaller portions to support your weight loss goal"
- "Reduce soy sauce, soup, and salty condiments"
- "Remove visible fat and chicken skin"
- "Add more protein (lean meat, tofu, eggs) for better balance"
- "💡 Tip: Eat slowly and stop when 80% full"

## Testing

Run the test script to verify calculations:

```bash
npx tsx scripts/test-rating-engine-simple.ts
```

This will verify:
- BMR calculation (Mifflin-St Jeor formula)
- TDEE calculation with activity multipliers
- Goal-based adjustments
- Macronutrient target calculations
- Gender and activity level differences

## Implementation Notes

- All calculations use metric units (kg, cm, mg)
- Nutrition ranges (min/max) are averaged for evaluation
- Suggestions are limited to 4 most relevant items
- The engine is stateless and can be used as a singleton

## Future Enhancements

Potential improvements:
- Support for dietary restrictions (vegetarian, halal, etc.)
- Micronutrient evaluation (vitamins, minerals)
- Meal timing optimization
- Historical trend analysis
- AI-powered suggestion refinement
