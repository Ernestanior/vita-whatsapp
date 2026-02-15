/**
 * RatingEngine Tests
 * 
 * Tests the health rating evaluation logic including:
 * - Daily target calculations (Mifflin-St Jeor formula)
 * - Individual factor evaluations (calories, sodium, fat, balance)
 * - Overall score calculation
 * - Personalized suggestion generation
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { RatingEngine } from '../rating-engine';
import type {
  HealthProfile,
  FoodRecognitionResult,
} from '@/types';

describe('RatingEngine', () => {
  const engine = new RatingEngine();

  // Sample health profiles for testing
  const loseWeightProfile: HealthProfile = {
    userId: 'test-user-1',
    height: 170,
    weight: 80,
    age: 30,
    gender: 'male',
    goal: 'lose-weight',
    activityLevel: 'light',
    digestTime: '21:00:00',
    quickMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const gainMuscleProfile: HealthProfile = {
    userId: 'test-user-2',
    height: 175,
    weight: 70,
    age: 25,
    gender: 'male',
    goal: 'gain-muscle',
    activityLevel: 'moderate',
    digestTime: '21:00:00',
    quickMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const controlSugarProfile: HealthProfile = {
    userId: 'test-user-3',
    height: 165,
    weight: 75,
    age: 45,
    gender: 'female',
    goal: 'control-sugar',
    activityLevel: 'light',
    digestTime: '21:00:00',
    quickMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Sample food recognition results
  const healthyChickenRice: FoodRecognitionResult = {
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

  const unhealthyFriedFood: FoodRecognitionResult = {
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

  const balancedMeal: FoodRecognitionResult = {
    foods: [
      {
        name: 'Grilled Salmon with Vegetables',
        nameLocal: '烤三文鱼配蔬菜',
        confidence: 92,
        portion: '1 plate',
        nutrition: {
          calories: { min: 450, max: 550 },
          protein: { min: 35, max: 40 },
          carbs: { min: 40, max: 50 },
          fat: { min: 15, max: 20 },
          sodium: { min: 400, max: 600 },
        },
      },
    ],
    totalNutrition: {
      calories: { min: 450, max: 550 },
      protein: { min: 35, max: 40 },
      carbs: { min: 40, max: 50 },
      fat: { min: 15, max: 20 },
      sodium: { min: 400, max: 600 },
    },
    mealContext: 'dinner',
  };

  describe('calculateDailyTarget', () => {
    it('should calculate daily targets using Mifflin-St Jeor formula', () => {
      const target = engine.calculateDailyTarget(loseWeightProfile);

      // Verify BMR calculation for male
      // BMR = 10 * weight + 6.25 * height - 5 * age + 5
      // BMR = 10 * 80 + 6.25 * 170 - 5 * 30 + 5 = 800 + 1062.5 - 150 + 5 = 1717.5
      // TDEE = BMR * 1.375 (light activity) = 2362.5625
      // Goal adjustment: -500 (lose weight) = 1862.5625
      expect(target.calories).toBeCloseTo(1863, 0);

      // Protein: 1.2g per kg for weight loss
      expect(target.protein).toBeCloseTo(80 * 1.2, 1);

      // Carbs: 50% of calories / 4
      expect(target.carbs).toBeCloseTo((1863 * 0.5) / 4, 1);

      // Fat: 25% of calories / 9
      expect(target.fat).toBeCloseTo((1863 * 0.25) / 9, 1);

      // Sodium: WHO recommendation
      expect(target.sodium).toBe(2000);
    });

    it('should adjust protein target for muscle gain goal', () => {
      const target = engine.calculateDailyTarget(gainMuscleProfile);

      // Protein: 2.0g per kg for muscle gain
      expect(target.protein).toBeCloseTo(70 * 2.0, 1);
    });

    it('should adjust calories for different goals', () => {
      const loseWeightTarget = engine.calculateDailyTarget(loseWeightProfile);
      const gainMuscleTarget = engine.calculateDailyTarget(gainMuscleProfile);
      const maintainProfile = { ...loseWeightProfile, goal: 'maintain' as const };
      const maintainTarget = engine.calculateDailyTarget(maintainProfile);

      // Lose weight should have lower calories (TDEE - 500)
      // Gain muscle should have higher calories (TDEE + 300)
      // Maintain should be at TDEE
      expect(loseWeightTarget.calories).toBeLessThan(maintainTarget.calories);
      expect(gainMuscleTarget.calories).toBeGreaterThan(maintainTarget.calories);
    });

    it('should calculate different targets for male vs female', () => {
      const maleProfile = loseWeightProfile;
      const femaleProfile = { ...loseWeightProfile, gender: 'female' as const };

      const maleTarget = engine.calculateDailyTarget(maleProfile);
      const femaleTarget = engine.calculateDailyTarget(femaleProfile);

      // Male BMR formula adds +5, female subtracts -161
      // So male should have higher calorie target
      expect(maleTarget.calories).toBeGreaterThan(femaleTarget.calories);
    });

    it('should adjust for different activity levels', () => {
      const sedentaryProfile = { ...loseWeightProfile, activityLevel: 'sedentary' as const };
      const activeProfile = { ...loseWeightProfile, activityLevel: 'active' as const };

      const sedentaryTarget = engine.calculateDailyTarget(sedentaryProfile);
      const activeTarget = engine.calculateDailyTarget(activeProfile);

      // Active should have higher calorie target
      expect(activeTarget.calories).toBeGreaterThan(sedentaryTarget.calories);
    });
  });

  describe('evaluate', () => {
    it('should return complete health rating with all required fields', async () => {
      const rating = await engine.evaluate(healthyChickenRice, loseWeightProfile);

      // Verify structure
      expect(rating).toHaveProperty('overall');
      expect(rating).toHaveProperty('score');
      expect(rating).toHaveProperty('factors');
      expect(rating).toHaveProperty('suggestions');

      // Verify overall rating is valid
      expect(['green', 'yellow', 'red']).toContain(rating.overall);

      // Verify score is in range
      expect(rating.score).toBeGreaterThanOrEqual(0);
      expect(rating.score).toBeLessThanOrEqual(100);

      // Verify factors
      expect(rating.factors).toHaveLength(4);
      expect(rating.factors.map(f => f.name)).toEqual([
        'Calories',
        'Sodium',
        'Fat',
        'Balance',
      ]);

      // Each factor should have required fields
      for (const factor of rating.factors) {
        expect(factor).toHaveProperty('name');
        expect(factor).toHaveProperty('status');
        expect(factor).toHaveProperty('message');
        expect(['good', 'moderate', 'poor']).toContain(factor.status);
      }

      // Verify suggestions
      expect(Array.isArray(rating.suggestions)).toBe(true);
    });

    it('should give green rating for healthy balanced meal', async () => {
      const rating = await engine.evaluate(balancedMeal, loseWeightProfile);

      expect(rating.overall).toBe('green');
      expect(rating.score).toBeGreaterThanOrEqual(80);
    });

    it('should give red rating for unhealthy high-fat high-sodium meal', async () => {
      const rating = await engine.evaluate(unhealthyFriedFood, loseWeightProfile);

      expect(rating.overall).toBe('red');
      expect(rating.score).toBeLessThan(60);
    });

    it('should provide suggestions when rating is yellow or red', async () => {
      const rating = await engine.evaluate(unhealthyFriedFood, loseWeightProfile);

      expect(rating.suggestions.length).toBeGreaterThan(0);
      
      // Should have specific suggestions for high sodium and fat
      const suggestionText = rating.suggestions.join(' ').toLowerCase();
      expect(
        suggestionText.includes('sodium') ||
        suggestionText.includes('fat') ||
        suggestionText.includes('fried')
      ).toBe(true);
    });

    it('should personalize rating based on user goal - lose weight', async () => {
      // High calorie meal
      const highCalorieMeal: FoodRecognitionResult = {
        ...healthyChickenRice,
        totalNutrition: {
          calories: { min: 800, max: 900 },
          protein: { min: 30, max: 35 },
          carbs: { min: 100, max: 110 },
          fat: { min: 20, max: 25 },
          sodium: { min: 600, max: 800 },
        },
      };

      const loseWeightRating = await engine.evaluate(highCalorieMeal, loseWeightProfile);
      const maintainProfile = { ...loseWeightProfile, goal: 'maintain' as const };
      const maintainRating = await engine.evaluate(highCalorieMeal, maintainProfile);

      // For lose-weight goal, high calories should be penalized more
      expect(loseWeightRating.score).toBeLessThanOrEqual(maintainRating.score);
    });

    it('should personalize rating based on user goal - gain muscle', async () => {
      // High protein, high calorie meal
      const highProteinMeal: FoodRecognitionResult = {
        ...healthyChickenRice,
        totalNutrition: {
          calories: { min: 700, max: 800 },
          protein: { min: 50, max: 60 },
          carbs: { min: 60, max: 70 },
          fat: { min: 20, max: 25 },
          sodium: { min: 600, max: 800 },
        },
      };

      const gainMuscleRating = await engine.evaluate(highProteinMeal, gainMuscleProfile);
      const loseWeightRating = await engine.evaluate(highProteinMeal, loseWeightProfile);

      // For gain-muscle goal, higher calories should be more acceptable
      expect(gainMuscleRating.score).toBeGreaterThanOrEqual(loseWeightRating.score);
    });

    it('should evaluate sodium correctly', async () => {
      // Low sodium meal
      const lowSodiumMeal: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          ...balancedMeal.totalNutrition,
          sodium: { min: 300, max: 400 },
        },
      };

      // High sodium meal
      const highSodiumMeal: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          ...balancedMeal.totalNutrition,
          sodium: { min: 1200, max: 1500 },
        },
      };

      const lowSodiumRating = await engine.evaluate(lowSodiumMeal, loseWeightProfile);
      const highSodiumRating = await engine.evaluate(highSodiumMeal, loseWeightProfile);

      // Low sodium should score better
      expect(lowSodiumRating.score).toBeGreaterThan(highSodiumRating.score);

      // High sodium should have warning in factors
      const sodiumFactor = highSodiumRating.factors.find(f => f.name === 'Sodium');
      expect(sodiumFactor?.status).toBe('poor');
    });

    it('should evaluate fat content correctly', async () => {
      // Low fat meal
      const lowFatMeal: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          calories: { min: 500, max: 600 },
          protein: { min: 35, max: 40 },
          carbs: { min: 70, max: 80 },
          fat: { min: 10, max: 15 }, // ~20% of calories
          sodium: { min: 400, max: 600 },
        },
      };

      // High fat meal
      const highFatMeal: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          calories: { min: 700, max: 800 },
          protein: { min: 30, max: 35 },
          carbs: { min: 50, max: 60 },
          fat: { min: 40, max: 50 }, // ~50% of calories
          sodium: { min: 400, max: 600 },
        },
      };

      const lowFatRating = await engine.evaluate(lowFatMeal, loseWeightProfile);
      const highFatRating = await engine.evaluate(highFatMeal, loseWeightProfile);

      // Low fat should score better
      expect(lowFatRating.score).toBeGreaterThan(highFatRating.score);

      // High fat should have warning
      const fatFactor = highFatRating.factors.find(f => f.name === 'Fat');
      expect(fatFactor?.status).toBe('poor');
    });

    it('should evaluate nutritional balance correctly', async () => {
      // Balanced meal (P:20% C:50% F:30%)
      const balancedNutrition: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          calories: { min: 600, max: 600 },
          protein: { min: 30, max: 30 }, // 120 cal = 20%
          carbs: { min: 75, max: 75 }, // 300 cal = 50%
          fat: { min: 20, max: 20 }, // 180 cal = 30%
          sodium: { min: 400, max: 600 },
        },
      };

      // Unbalanced meal (P:10% C:70% F:20%)
      const unbalancedNutrition: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          calories: { min: 600, max: 600 },
          protein: { min: 15, max: 15 }, // 60 cal = 10%
          carbs: { min: 105, max: 105 }, // 420 cal = 70%
          fat: { min: 13, max: 13 }, // 120 cal = 20%
          sodium: { min: 400, max: 600 },
        },
      };

      const balancedRating = await engine.evaluate(balancedNutrition, loseWeightProfile);
      const unbalancedRating = await engine.evaluate(unbalancedNutrition, loseWeightProfile);

      // Balanced should score better
      expect(balancedRating.score).toBeGreaterThan(unbalancedRating.score);

      // Check balance factor
      const balancedFactor = balancedRating.factors.find(f => f.name === 'Balance');
      const unbalancedFactor = unbalancedRating.factors.find(f => f.name === 'Balance');

      expect(balancedFactor?.status).toBe('good');
      expect(unbalancedFactor?.status).not.toBe('good');
    });

    it('should consider meal context when evaluating calories', async () => {
      const breakfastMeal: FoodRecognitionResult = {
        ...healthyChickenRice,
        mealContext: 'breakfast',
      };

      const dinnerMeal: FoodRecognitionResult = {
        ...healthyChickenRice,
        mealContext: 'dinner',
      };

      const breakfastRating = await engine.evaluate(breakfastMeal, loseWeightProfile);
      const dinnerRating = await engine.evaluate(dinnerMeal, loseWeightProfile);

      // Same food should be evaluated differently based on meal context
      // 550 kcal is high for breakfast (25% of daily) but appropriate for dinner (30% of daily)
      const breakfastCalorieFactor = breakfastRating.factors.find(f => f.name === 'Calories');

      // Breakfast should have worse calorie rating than dinner
      expect(breakfastCalorieFactor?.status).not.toBe('good');
      
      // Dinner rating should be better overall
      expect(dinnerRating.score).toBeGreaterThanOrEqual(breakfastRating.score);
    });

    it('should generate goal-specific suggestions', async () => {
      const loseWeightRating = await engine.evaluate(unhealthyFriedFood, loseWeightProfile);
      const gainMuscleRating = await engine.evaluate(unhealthyFriedFood, gainMuscleProfile);
      const controlSugarRating = await engine.evaluate(unhealthyFriedFood, controlSugarProfile);

      // Each should have goal-specific tips
      const loseWeightSuggestions = loseWeightRating.suggestions.join(' ');
      const gainMuscleSuggestions = gainMuscleRating.suggestions.join(' ');
      const controlSugarSuggestions = controlSugarRating.suggestions.join(' ');

      expect(loseWeightSuggestions.toLowerCase()).toContain('80% full');
      expect(gainMuscleSuggestions.toLowerCase()).toContain('protein');
      expect(controlSugarSuggestions.toLowerCase()).toContain('sugar');
    });

    it('should limit suggestions to 4 items', async () => {
      const rating = await engine.evaluate(unhealthyFriedFood, loseWeightProfile);

      expect(rating.suggestions.length).toBeLessThanOrEqual(4);
    });
  });

  describe('edge cases', () => {
    it('should handle meals with very low calories', async () => {
      const lowCalorieMeal: FoodRecognitionResult = {
        ...balancedMeal,
        totalNutrition: {
          calories: { min: 100, max: 150 },
          protein: { min: 10, max: 15 },
          carbs: { min: 15, max: 20 },
          fat: { min: 2, max: 3 },
          sodium: { min: 200, max: 300 },
        },
        mealContext: 'snack',
      };

      const rating = await engine.evaluate(lowCalorieMeal, loseWeightProfile);

      expect(rating).toHaveProperty('overall');
      expect(rating.score).toBeGreaterThanOrEqual(0);
      expect(rating.score).toBeLessThanOrEqual(100);
    });

    it('should handle meals with very high calories', async () => {
      const highCalorieMeal: FoodRecognitionResult = {
        ...unhealthyFriedFood,
        totalNutrition: {
          calories: { min: 1500, max: 2000 },
          protein: { min: 50, max: 60 },
          carbs: { min: 150, max: 180 },
          fat: { min: 80, max: 100 },
          sodium: { min: 2500, max: 3000 },
        },
      };

      const rating = await engine.evaluate(highCalorieMeal, loseWeightProfile);

      expect(rating.overall).toBe('red');
      expect(rating.score).toBeLessThan(60);
      expect(rating.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle profile with default values', async () => {
      const minimalProfile: HealthProfile = {
        userId: 'test-user',
        height: 170,
        weight: 70,
        goal: 'maintain',
        activityLevel: 'light',
        digestTime: '21:00:00',
        quickMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const rating = await engine.evaluate(healthyChickenRice, minimalProfile);

      expect(rating).toHaveProperty('overall');
      expect(rating.score).toBeGreaterThanOrEqual(0);
    });
  });
});
