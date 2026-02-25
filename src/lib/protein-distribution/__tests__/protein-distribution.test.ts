import { describe, it, expect } from 'vitest';
import {
  classifyMealSlot,
  analyzeProteinDistribution,
  formatDistribution,
  type ProteinDistribution,
  type MealSlot,
} from '@/lib/protein-distribution';

describe('classifyMealSlot', () => {
  it('classifies breakfast hours (5-10)', () => {
    expect(classifyMealSlot(5)).toBe('breakfast');
    expect(classifyMealSlot(7)).toBe('breakfast');
    expect(classifyMealSlot(10)).toBe('breakfast');
  });

  it('classifies lunch hours (11-14)', () => {
    expect(classifyMealSlot(11)).toBe('lunch');
    expect(classifyMealSlot(12)).toBe('lunch');
    expect(classifyMealSlot(14)).toBe('lunch');
  });

  it('classifies dinner hours (17-21)', () => {
    expect(classifyMealSlot(17)).toBe('dinner');
    expect(classifyMealSlot(19)).toBe('dinner');
    expect(classifyMealSlot(21)).toBe('dinner');
  });

  it('classifies snack hours (all other times)', () => {
    expect(classifyMealSlot(0)).toBe('snack');
    expect(classifyMealSlot(4)).toBe('snack');
    expect(classifyMealSlot(15)).toBe('snack');
    expect(classifyMealSlot(16)).toBe('snack');
    expect(classifyMealSlot(22)).toBe('snack');
    expect(classifyMealSlot(23)).toBe('snack');
  });
});

describe('analyzeProteinDistribution', () => {
  it('calculates even distribution with high evenness score', () => {
    const records = [
      { protein: 30, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 30, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 30, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(30);
    expect(result.lunch).toBe(30);
    expect(result.dinner).toBe(30);
    expect(result.snack).toBe(0);
    expect(result.evenness).toBe(100); // Perfect distribution
  });

  it('calculates uneven distribution with low evenness score', () => {
    const records = [
      { protein: 5, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 5, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 80, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(5);
    expect(result.lunch).toBe(5);
    expect(result.dinner).toBe(80);
    expect(result.snack).toBe(0);
    expect(result.evenness).toBeLessThan(30); // Very uneven
  });

  it('handles single meal edge case', () => {
    const records = [
      { protein: 60, createdAt: new Date('2026-02-25T12:00:00') }, // lunch only
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(0);
    expect(result.lunch).toBe(60);
    expect(result.dinner).toBe(0);
    expect(result.snack).toBe(0);
    expect(result.evenness).toBe(0); // Uneven since other meals are 0
  });

  it('handles empty meals edge case', () => {
    const records: Array<{ protein: number; createdAt: Date }> = [];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(0);
    expect(result.lunch).toBe(0);
    expect(result.dinner).toBe(0);
    expect(result.snack).toBe(0);
    expect(result.evenness).toBe(0);
  });

  it('aggregates multiple meals in same slot', () => {
    const records = [
      { protein: 15, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 15, createdAt: new Date('2026-02-25T09:00:00') }, // breakfast
      { protein: 30, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 30, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(30); // 15 + 15
    expect(result.lunch).toBe(30);
    expect(result.dinner).toBe(30);
    expect(result.evenness).toBe(100); // Even after aggregation
  });

  it('includes snacks in distribution', () => {
    const records = [
      { protein: 30, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 30, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 30, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
      { protein: 10, createdAt: new Date('2026-02-25T15:00:00') }, // snack
      { protein: 10, createdAt: new Date('2026-02-25T22:00:00') }, // snack
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(30);
    expect(result.lunch).toBe(30);
    expect(result.dinner).toBe(30);
    expect(result.snack).toBe(20); // 10 + 10
    expect(result.evenness).toBe(100); // Snacks don't affect evenness
  });

  it('rounds protein values correctly', () => {
    const records = [
      { protein: 30.4, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 30.5, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 30.6, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(30); // rounds down
    expect(result.lunch).toBe(31); // rounds up
    expect(result.dinner).toBe(31); // rounds up
  });

  it('calculates moderate evenness score correctly', () => {
    const records = [
      { protein: 20, createdAt: new Date('2026-02-25T08:00:00') }, // breakfast
      { protein: 30, createdAt: new Date('2026-02-25T12:00:00') }, // lunch
      { protein: 40, createdAt: new Date('2026-02-25T19:00:00') }, // dinner
    ];

    const result = analyzeProteinDistribution(records);

    expect(result.breakfast).toBe(20);
    expect(result.lunch).toBe(30);
    expect(result.dinner).toBe(40);
    expect(result.evenness).toBeGreaterThan(50);
    expect(result.evenness).toBeLessThan(80);
  });
});

describe('formatDistribution', () => {
  const evenDist: ProteinDistribution = {
    breakfast: 30,
    lunch: 30,
    dinner: 30,
    snack: 0,
    evenness: 100,
  };

  const unevenDist: ProteinDistribution = {
    breakfast: 5,
    lunch: 5,
    dinner: 80,
    snack: 0,
    evenness: 10,
  };

  const moderateDist: ProteinDistribution = {
    breakfast: 20,
    lunch: 30,
    dinner: 40,
    snack: 10,
    evenness: 65,
  };

  const emptyDist: ProteinDistribution = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
    evenness: 0,
  };

  describe('English formatting', () => {
    it('formats even distribution with positive feedback', () => {
      const result = formatDistribution(evenDist, 'en');

      expect(result).toContain('Protein Spread');
      expect(result).toContain('Bkfst');
      expect(result).toContain('Lunch');
      expect(result).toContain('Dinner');
      expect(result).toContain('30g');
      expect(result).toContain('✅ Well spread — great for MPS');
      expect(result).not.toContain('Snack'); // No snacks
    });

    it('formats uneven distribution with warning', () => {
      const result = formatDistribution(unevenDist, 'en');

      expect(result).toContain('Protein Spread');
      expect(result).toContain('5g');
      expect(result).toContain('80g');
      expect(result).toContain('🔴 Uneven — aim for ≥20g protein per meal');
    });

    it('formats moderate distribution with caution', () => {
      const result = formatDistribution(moderateDist, 'en');

      expect(result).toContain('Protein Spread');
      expect(result).toContain('⚠️ Okay spread — try to balance meals');
      expect(result).toContain('Snack'); // Has snacks
      expect(result).toContain('10g');
    });

    it('returns empty string for empty distribution', () => {
      const result = formatDistribution(emptyDist, 'en');

      expect(result).toBe('');
    });
  });

  describe('Chinese (Simplified) formatting', () => {
    it('formats even distribution with positive feedback', () => {
      const result = formatDistribution(evenDist, 'zh-CN');

      expect(result).toContain('蛋白质分布');
      expect(result).toContain('早餐');
      expect(result).toContain('午餐');
      expect(result).toContain('晚餐');
      expect(result).toContain('30g');
      expect(result).toContain('✅ 分布均匀，利于肌肉合成');
      expect(result).not.toContain('加餐'); // No snacks
    });

    it('formats uneven distribution with warning', () => {
      const result = formatDistribution(unevenDist, 'zh-CN');

      expect(result).toContain('蛋白质分布');
      expect(result).toContain('5g');
      expect(result).toContain('80g');
      expect(result).toContain('🔴 分布不均，建议每餐摄入≥20g蛋白质');
    });

    it('formats moderate distribution with caution', () => {
      const result = formatDistribution(moderateDist, 'zh-CN');

      expect(result).toContain('蛋白质分布');
      expect(result).toContain('⚠️ 分布尚可，建议三餐更均匀');
      expect(result).toContain('加餐'); // Has snacks
      expect(result).toContain('10g');
    });

    it('returns empty string for empty distribution', () => {
      const result = formatDistribution(emptyDist, 'zh-CN');

      expect(result).toBe('');
    });
  });

  describe('Chinese (Traditional) formatting', () => {
    it('formats even distribution with positive feedback', () => {
      const result = formatDistribution(evenDist, 'zh-TW');

      expect(result).toContain('蛋白质分布');
      expect(result).toContain('早餐');
      expect(result).toContain('午餐');
      expect(result).toContain('晚餐');
      expect(result).toContain('✅ 分布均匀，利于肌肉合成');
    });
  });

  describe('Visual bar rendering', () => {
    it('renders bars proportional to protein amounts', () => {
      const result = formatDistribution(evenDist, 'en');

      // Each meal has equal protein, so bars should be similar
      const lines = result.split('\n');
      const bkfstLine = lines.find(l => l.includes('Bkfst'));
      const lunchLine = lines.find(l => l.includes('Lunch'));
      const dinnerLine = lines.find(l => l.includes('Dinner'));

      expect(bkfstLine).toBeDefined();
      expect(lunchLine).toBeDefined();
      expect(dinnerLine).toBeDefined();

      // Count filled blocks (▓)
      const bkfstFilled = (bkfstLine?.match(/▓/g) || []).length;
      const lunchFilled = (lunchLine?.match(/▓/g) || []).length;
      const dinnerFilled = (dinnerLine?.match(/▓/g) || []).length;

      expect(bkfstFilled).toBeGreaterThan(0);
      expect(bkfstFilled).toBe(lunchFilled);
      expect(lunchFilled).toBe(dinnerFilled);
    });

    it('renders different bar lengths for uneven distribution', () => {
      const result = formatDistribution(unevenDist, 'en');

      const lines = result.split('\n');
      const bkfstLine = lines.find(l => l.includes('Bkfst'));
      const dinnerLine = lines.find(l => l.includes('Dinner'));

      const bkfstFilled = (bkfstLine?.match(/▓/g) || []).length;
      const dinnerFilled = (dinnerLine?.match(/▓/g) || []).length;

      // Dinner should have more filled blocks than breakfast
      expect(dinnerFilled).toBeGreaterThan(bkfstFilled);
    });

    it('omits snack line when snack is 0', () => {
      const result = formatDistribution(evenDist, 'en');

      expect(result).not.toContain('Snack');
    });

    it('includes snack line when snack > 0', () => {
      const result = formatDistribution(moderateDist, 'en');

      expect(result).toContain('Snack');
      expect(result).toContain('10g');
    });
  });

  describe('Evenness score thresholds', () => {
    it('shows positive message for evenness >= 80', () => {
      const dist = { ...evenDist, evenness: 80 };
      const resultEn = formatDistribution(dist, 'en');
      const resultZh = formatDistribution(dist, 'zh-CN');

      expect(resultEn).toContain('✅ Well spread — great for MPS');
      expect(resultZh).toContain('✅ 分布均匀，利于肌肉合成');
    });

    it('shows caution message for evenness 50-79', () => {
      const dist = { ...evenDist, evenness: 50 };
      const resultEn = formatDistribution(dist, 'en');
      const resultZh = formatDistribution(dist, 'zh-CN');

      expect(resultEn).toContain('⚠️ Okay spread — try to balance meals');
      expect(resultZh).toContain('⚠️ 分布尚可，建议三餐更均匀');
    });

    it('shows warning message for evenness < 50', () => {
      const dist = { ...evenDist, evenness: 49 };
      const resultEn = formatDistribution(dist, 'en');
      const resultZh = formatDistribution(dist, 'zh-CN');

      expect(resultEn).toContain('🔴 Uneven — aim for ≥20g protein per meal');
      expect(resultZh).toContain('🔴 分布不均，建议每餐摄入≥20g蛋白质');
    });
  });
});
