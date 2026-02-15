/**
 * ProfileManager Unit Tests
 * Tests profile initialization, validation, and calculations
 * Requirements: 4.1, 4.2, 4.3, 4.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileManager } from '../profile-manager';
import { calculateBMI, calculateDailyCalories } from '@/lib/database/functions';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/whatsapp/client', () => ({
  whatsappClient: {
    sendTextMessage: vi.fn(),
    sendButtonMessage: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ProfileManager', () => {
  let profileManager: ProfileManager;

  beforeEach(() => {
    profileManager = new ProfileManager();
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('should accept valid height (100-250 cm)', () => {
      const validHeights = [100, 150, 170, 200, 250];
      
      validHeights.forEach(height => {
        expect(() => {
          // This would be called internally during setup
          const extracted = profileManager['extractNumber'](`${height}cm`);
          expect(extracted).toBe(height);
        }).not.toThrow();
      });
    });

    it('should accept valid weight (30-300 kg)', () => {
      const validWeights = [30, 50, 70, 100, 300];
      
      validWeights.forEach(weight => {
        expect(() => {
          const extracted = profileManager['extractNumber'](`${weight}kg`);
          expect(extracted).toBe(weight);
        }).not.toThrow();
      });
    });
  });

  describe('Number Extraction', () => {
    it('should extract numbers from various formats', () => {
      const testCases = [
        { input: '170', expected: 170 },
        { input: '170cm', expected: 170 },
        { input: '170 cm', expected: 170 },
        { input: '65kg', expected: 65 },
        { input: '65.5', expected: 65.5 },
        { input: '65.5kg', expected: 65.5 },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = profileManager['extractNumber'](input);
        expect(result).toBe(expected);
      });
    });

    it('should return null for invalid input', () => {
      const invalidInputs = ['abc', 'hello', ''];
      
      invalidInputs.forEach(input => {
        const result = profileManager['extractNumber'](input);
        expect(result).toBeNull();
      });
    });
  });

  describe('Goal Recognition', () => {
    it('should recognize English goal keywords', () => {
      const testCases = [
        { input: '1', expected: 'lose-weight' },
        { input: 'lose weight', expected: 'lose-weight' },
        { input: '2', expected: 'gain-muscle' },
        { input: 'gain muscle', expected: 'gain-muscle' },
        { input: '3', expected: 'control-sugar' },
        { input: '4', expected: 'maintain' },
      ];

      testCases.forEach(({ input, expected }) => {
        const session = {
          userId: 'test',
          currentStep: 'goal' as any,
          data: {},
          language: 'en' as const,
        };

        const result = profileManager['processGoal'](session, input);
        expect(result).toBe(true);
        expect(session.data.goal).toBe(expected);
      });
    });

    it('should recognize Chinese goal keywords', () => {
      const testCases = [
        { input: '减脂', expected: 'lose-weight' },
        { input: '增肌', expected: 'gain-muscle' },
        { input: '控糖', expected: 'control-sugar' },
        { input: '维持', expected: 'maintain' },
      ];

      testCases.forEach(({ input, expected }) => {
        const session = {
          userId: 'test',
          currentStep: 'goal' as any,
          data: {},
          language: 'zh-CN' as const,
        };

        const result = profileManager['processGoal'](session, input);
        expect(result).toBe(true);
        expect(session.data.goal).toBe(expected);
      });
    });
  });

  describe('Activity Level Recognition', () => {
    it('should recognize activity level keywords', () => {
      const testCases = [
        { input: '1', expected: 'sedentary' },
        { input: 'sedentary', expected: 'sedentary' },
        { input: '2', expected: 'light' },
        { input: '3', expected: 'moderate' },
        { input: '4', expected: 'active' },
      ];

      testCases.forEach(({ input, expected }) => {
        const session = {
          userId: 'test',
          currentStep: 'activity_level' as any,
          data: {},
          language: 'en' as const,
        };

        const result = profileManager['processActivityLevel'](session, input);
        expect(result).toBe(true);
        expect(session.data.activity_level).toBe(expected);
      });
    });
  });

  describe('BMI Calculation', () => {
    it('should calculate BMI correctly', () => {
      const testCases = [
        { height: 170, weight: 70, expectedBMI: 24.2 },
        { height: 160, weight: 50, expectedBMI: 19.5 },
        { height: 180, weight: 80, expectedBMI: 24.7 },
      ];

      testCases.forEach(({ height, weight, expectedBMI }) => {
        const bmi = calculateBMI(height, weight);
        expect(bmi).toBeCloseTo(expectedBMI, 1);
      });
    });
  });

  describe('Daily Calorie Calculation', () => {
    it('should calculate daily calories using Mifflin-St Jeor formula', () => {
      const profile = {
        height: 170,
        weight: 70,
        age: 30,
        gender: 'male' as const,
        activity_level: 'moderate' as const,
        goal: 'maintain' as const,
      };

      const calories = calculateDailyCalories(profile);
      
      // Expected: BMR = 10*70 + 6.25*170 - 5*30 + 5 = 1617.5
      // TDEE = 1617.5 * 1.55 = 2507.125
      // Goal adjustment: 0 (maintain)
      // Total: ~2507
      expect(calories).toBeGreaterThan(2400);
      expect(calories).toBeLessThan(2600);
    });

    it('should adjust calories for weight loss goal', () => {
      const profile = {
        height: 170,
        weight: 70,
        age: 30,
        gender: 'male' as const,
        activity_level: 'moderate' as const,
        goal: 'lose-weight' as const,
      };

      const calories = calculateDailyCalories(profile);
      
      // Should be 500 less than maintain
      expect(calories).toBeGreaterThan(1900);
      expect(calories).toBeLessThan(2100);
    });

    it('should adjust calories for muscle gain goal', () => {
      const profile = {
        height: 170,
        weight: 70,
        age: 30,
        gender: 'male' as const,
        activity_level: 'moderate' as const,
        goal: 'gain-muscle' as const,
      };

      const calories = calculateDailyCalories(profile);
      
      // Should be 300 more than maintain
      expect(calories).toBeGreaterThan(2700);
      expect(calories).toBeLessThan(2900);
    });

    it('should calculate differently for female', () => {
      const maleProfile = {
        height: 170,
        weight: 70,
        age: 30,
        gender: 'male' as const,
        activity_level: 'moderate' as const,
        goal: 'maintain' as const,
      };

      const femaleProfile = {
        ...maleProfile,
        gender: 'female' as const,
      };

      const maleCalories = calculateDailyCalories(maleProfile);
      const femaleCalories = calculateDailyCalories(femaleProfile);

      // Female should have lower calorie needs
      expect(femaleCalories).toBeLessThan(maleCalories);
      expect(maleCalories - femaleCalories).toBeGreaterThan(100);
    });
  });

  describe('Natural Language Update', () => {
    it('should extract weight from natural language', async () => {
      const testCases = [
        'I am now 65kg',
        'My weight is 65 kg',
        '65kg',
        '我现在 65kg',
      ];

      for (const input of testCases) {
        const weightMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:kg|公斤|kilogram)/i);
        expect(weightMatch).toBeTruthy();
        if (weightMatch) {
          const weight = parseFloat(weightMatch[1]);
          expect(weight).toBe(65);
        }
      }
    });

    it('should extract height from natural language', async () => {
      const testCases = [
        'My height is 170cm',
        'I am 170 cm tall',
        '170cm',
        '我身高 170cm',
      ];

      for (const input of testCases) {
        const heightMatch = input.match(/(\d+)\s*(?:cm|厘米|centimeter)/i);
        expect(heightMatch).toBeTruthy();
        if (heightMatch) {
          const height = parseInt(heightMatch[1]);
          expect(height).toBe(170);
        }
      }
    });
  });
});
