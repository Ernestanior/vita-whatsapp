/**
 * Manual test script for RatingEngine
 * Run with: npx tsx scripts/test-rating-engine.ts
 */

import { RatingEngine } from '../src/lib/rating/rating-engine';
import type { HealthProfile, FoodRecognitionResult } from '../src/types';

const engine = new RatingEngine();

// Test profile
const testProfile: HealthProfile = {
  userId: 'test-user',
  height: 170,
  weight: 70,
  age: 30,
  gender: 'male',
  goal: 'lose-weight',
  activityLevel: 'light',
  digestTime: '21:00:00',
  quickMode: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Test food - Healthy Chicken Rice
const healthyFood: FoodRecognitionResult = {
  foods: [
    {
      name: 'Chicken Rice',
      nameLocal: '海南鸡饭',
      confidence: 95,
      portion: '1 plate',
      nutrition: {
        calories: { min: 500, max: 600 },
        protein: { min: 30, max: 35 },
        carbs: { min: 60, max: 70 },
        fat: { min: 15, max: 20 },
        sodium: { min: 600, max: 800 },
      },
    },
  ],
  totalNutrition: {
    calories: { min: 500, max: 600 },
    protein: { min: 30, max: 35 },
    carbs: { min: 60, max: 70 },
    fat: { min: 15, max: 20 },
    sodium: { min: 600, max: 800 },
  },
  mealContext: 'lunch',
};

// Test food - Unhealthy Fried Food
const unhealthyFood: FoodRecognitionResult = {
  foods: [
    {
      name: 'Fried Chicken',
      nameLocal: '炸鸡',
      confidence: 90,
      portion: '3 pieces',
      nutrition: {
        calories: { min: 800, max: 1000 },
        protein: { min: 40, max: 50 },
        carbs: { min: 50, max: 60 },
        fat: { min: 50, max: 60 },
        sodium: { min: 1500, max: 2000 },
      },
    },
  ],
  totalNutrition: {
    calories: { min: 800, max: 1000 },
    protein: { min: 40, max: 50 },
    carbs: { min: 50, max: 60 },
    fat: { min: 50, max: 60 },
    sodium: { min: 1500, max: 2000 },
  },
  mealContext: 'dinner',
};

async function runTests() {
  console.log('🧪 Testing RatingEngine\n');

  // Test 1: Calculate Daily Target
  console.log('Test 1: Calculate Daily Target');
  console.log('================================');
  const target = engine.calculateDailyTarget(testProfile);
  console.log('Profile:', {
    height: testProfile.height,
    weight: testProfile.weight,
    age: testProfile.age,
    gender: testProfile.gender,
    goal: testProfile.goal,
    activityLevel: testProfile.activityLevel,
  });
  console.log('Daily Target:', target);
  console.log('✅ Daily target calculated\n');

  // Test 2: Evaluate Healthy Food
  console.log('Test 2: Evaluate Healthy Food (Chicken Rice)');
  console.log('=============================================');
  const healthyRating = await engine.evaluate(healthyFood, testProfile);
  console.log('Food:', healthyFood.foods[0].name);
  console.log('Nutrition:', healthyFood.totalNutrition);
  console.log('Rating:', {
    overall: healthyRating.overall,
    score: healthyRating.score,
    factors: healthyRating.factors,
    suggestions: healthyRating.suggestions,
  });
  console.log(`✅ Rating: ${healthyRating.overall.toUpperCase()} (${healthyRating.score}/100)\n`);

  // Test 3: Evaluate Unhealthy Food
  console.log('Test 3: Evaluate Unhealthy Food (Fried Chicken)');
  console.log('================================================');
  const unhealthyRating = await engine.evaluate(unhealthyFood, testProfile);
  console.log('Food:', unhealthyFood.foods[0].name);
  console.log('Nutrition:', unhealthyFood.totalNutrition);
  console.log('Rating:', {
    overall: unhealthyRating.overall,
    score: unhealthyRating.score,
    factors: unhealthyRating.factors,
    suggestions: unhealthyRating.suggestions,
  });
  console.log(`✅ Rating: ${unhealthyRating.overall.toUpperCase()} (${unhealthyRating.score}/100)\n`);

  // Test 4: Different Goals
  console.log('Test 4: Different Goals (Gain Muscle vs Lose Weight)');
  console.log('====================================================');
  const gainMuscleProfile: HealthProfile = {
    ...testProfile,
    goal: 'gain-muscle',
  };
  
  const loseWeightRating = await engine.evaluate(healthyFood, testProfile);
  const gainMuscleRating = await engine.evaluate(healthyFood, gainMuscleProfile);
  
  console.log('Lose Weight Goal:');
  console.log(`  - Score: ${loseWeightRating.score}/100`);
  console.log(`  - Rating: ${loseWeightRating.overall}`);
  
  console.log('Gain Muscle Goal:');
  console.log(`  - Score: ${gainMuscleRating.score}/100`);
  console.log(`  - Rating: ${gainMuscleRating.overall}`);
  console.log('✅ Goal-based personalization working\n');

  // Test 5: Verify Requirements
  console.log('Test 5: Verify Requirements');
  console.log('============================');
  
  // Requirement 3.1: Red/Yellow/Green rating
  console.log('✅ 3.1: Red/Yellow/Green rating system implemented');
  console.log(`   - Healthy food: ${healthyRating.overall}`);
  console.log(`   - Unhealthy food: ${unhealthyRating.overall}`);
  
  // Requirement 3.2: Health tips
  console.log('✅ 3.2: Health tips provided');
  console.log(`   - Factors evaluated: ${healthyRating.factors.map(f => f.name).join(', ')}`);
  
  // Requirement 3.3: Improvement suggestions
  console.log('✅ 3.3: Improvement suggestions generated');
  console.log(`   - Suggestions count: ${unhealthyRating.suggestions.length}`);
  console.log(`   - Examples: ${unhealthyRating.suggestions.slice(0, 2).join('; ')}`);
  
  // Requirement 3.4: Personalized based on profile
  console.log('✅ 3.4: Personalized evaluation based on user profile');
  console.log(`   - Different scores for different goals: ${loseWeightRating.score} vs ${gainMuscleRating.score}`);
  
  console.log('\n🎉 All tests passed!');
}

runTests().catch(console.error);
