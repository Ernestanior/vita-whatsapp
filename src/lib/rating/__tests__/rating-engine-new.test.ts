import { RatingEngine } from '../rating-engine';
import type {
  HealthProfile,
  FoodRecognitionResult,
} from '@/types';

describe('RatingEngine - New Features', () => {
  const engine = new RatingEngine();

  const standardProfile: HealthProfile = {
    userId: 'test-user',
    height: 170,
    weight: 70,
    age: 30,
    gender: 'male',
    goal: 'maintain',
    activityLevel: 'moderate',
    digestTime: '21:00:00',
    quickMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('evaluateNutriGrade', () => {
    it('should evaluate Nutri-Grade A correctly', async () => {
      const food: FoodRecognitionResult = {
        foods: [{
          name: 'Green Tea',
          nameLocal: '绿茶',
          confidence: 90,
          portion: '1 cup',
          nutriGrade: 'A',
          nutrition: {
            calories: { min: 0, max: 5 },
            protein: { min: 0, max: 0 },
            carbs: { min: 0, max: 0 },
            fat: { min: 0, max: 0 },
            sodium: { min: 0, max: 5 },
          }
        }],
        totalNutrition: {
          calories: { min: 0, max: 5 },
          protein: { min: 0, max: 0 },
          carbs: { min: 0, max: 0 },
          fat: { min: 0, max: 0 },
          sodium: { min: 0, max: 5 },
        },
        mealContext: 'snack'
      };

      const rating = await engine.evaluate(food, standardProfile);
      const nutriFactor = rating.factors.find(f => f.name === 'Nutri-Grade');
      expect(nutriFactor?.status).toBe('good');
      expect(nutriFactor?.score).toBe(100);
    });

    it('should penalize Nutri-Grade D', async () => {
      const food: FoodRecognitionResult = {
        foods: [{
          name: 'Coke',
          nameLocal: '可乐',
          confidence: 95,
          portion: '1 can',
          nutriGrade: 'D',
          nutrition: {
            calories: { min: 140, max: 150 },
            protein: { min: 0, max: 0 },
            carbs: { min: 35, max: 40 },
            fat: { min: 0, max: 0 },
            sodium: { min: 30, max: 50 },
          }
        }],
        totalNutrition: {
          calories: { min: 140, max: 150 },
          protein: { min: 0, max: 0 },
          carbs: { min: 35, max: 40 },
          fat: { min: 0, max: 0 },
          sodium: { min: 30, max: 50 },
        },
        mealContext: 'snack'
      };

      const rating = await engine.evaluate(food, standardProfile);
      const nutriFactor = rating.factors.find(f => f.name === 'Nutri-Grade');
      expect(nutriFactor?.status).toBe('poor');
      expect(nutriFactor?.score).toBe(30);
      expect(rating.suggestions.some(s => s.includes('Siu Dai'))).toBe(true);
    });
  });

  describe('evaluateGI', () => {
    it('should penalize High GI foods', async () => {
      const food: FoodRecognitionResult = {
        foods: [{
          name: 'White Rice',
          nameLocal: '白饭',
          confidence: 90,
          portion: '1 bowl',
          giLevel: 'High',
          nutrition: {
            calories: { min: 200, max: 250 },
            protein: { min: 4, max: 5 },
            carbs: { min: 45, max: 50 },
            fat: { min: 0, max: 1 },
            sodium: { min: 0, max: 5 },
          }
        }],
        totalNutrition: {
          calories: { min: 200, max: 250 },
          protein: { min: 4, max: 5 },
          carbs: { min: 45, max: 50 },
          fat: { min: 0, max: 1 },
          sodium: { min: 0, max: 5 },
        },
        mealContext: 'lunch'
      };

      const rating = await engine.evaluate(food, standardProfile);
      const giFactor = rating.factors.find(f => f.name === 'GI Level');
      expect(giFactor?.status).toBe('poor');
      expect(giFactor?.score).toBe(40);
      expect(rating.suggestions.some(s => s.includes('whole grains'))).toBe(true);
    });
  });

  describe('Hawker Specific Logic', () => {
    it('should include hawker-specific tips when isHawkerFood is true', async () => {
      const food: FoodRecognitionResult = {
        foods: [{
          name: 'Laksa',
          nameLocal: '叻沙',
          confidence: 90,
          portion: '1 bowl',
          isHawkerFood: true,
          improvementTip: 'Choose bee hoon instead of thick bee hoon',
          nutrition: {
            calories: { min: 600, max: 700 },
            protein: { min: 15, max: 20 },
            carbs: { min: 60, max: 70 },
            fat: { min: 30, max: 40 },
            sodium: { min: 1500, max: 2000 },
          }
        }],
        totalNutrition: {
          calories: { min: 600, max: 700 },
          protein: { min: 15, max: 20 },
          carbs: { min: 60, max: 70 },
          fat: { min: 30, max: 40 },
          sodium: { min: 1500, max: 2000 },
        },
        mealContext: 'lunch'
      };

      const rating = await engine.evaluate(food, standardProfile);
      expect(rating.suggestions.some(s => s.includes('Hawker Tip'))).toBe(true);
      expect(rating.suggestions.some(s => s.includes('Choose bee hoon'))).toBe(true);
    });
  });
});
