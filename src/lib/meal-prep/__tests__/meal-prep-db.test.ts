import { describe, it, expect } from 'vitest';
import { matchMealPrep, MEAL_PREP_DB } from '@/lib/meal-prep/meal-prep-db';

describe('MEAL_PREP_DB', () => {
  it('should contain items from all brands', () => {
    const brands = new Set(MEAL_PREP_DB.map(item => item.brand));
    expect(brands).toContain('YoloFoods');
    expect(brands).toContain('Nutrify');
    expect(brands).toContain('The Lean Bento');
    expect(brands).toContain('Fitthree');
    expect(brands).toContain('Nourish');
    expect(brands).toContain('Generic');
  });

  it('should have valid nutrition data for all items', () => {
    MEAL_PREP_DB.forEach(item => {
      expect(item.nutrition.calories).toBeGreaterThan(0);
      expect(item.nutrition.protein).toBeGreaterThan(0);
      expect(item.nutrition.carbs).toBeGreaterThanOrEqual(0);
      expect(item.nutrition.fat).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('matchMealPrep - Brand Matches', () => {
  it('should match yolo teriyaki chicken', () => {
    const result = matchMealPrep('yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
    expect(result?.item.brand).toBe('YoloFoods');
    expect(result?.quantity).toBe(1);
  });

  it('should match nutrify chicken', () => {
    const result = matchMealPrep('nutrify chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.item.brand).toBe('Nutrify');
    expect(result?.quantity).toBe(1);
  });

  it('should match lean bento chicken', () => {
    const result = matchMealPrep('lean bento chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
    expect(result?.item.brand).toBe('The Lean Bento');
    expect(result?.quantity).toBe(1);
  });

  it('should match fitthree chicken', () => {
    const result = matchMealPrep('fitthree chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('fitthree-chicken');
    expect(result?.item.brand).toBe('Fitthree');
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - Partial Brand Matches', () => {
  it('should match yolo cajun', () => {
    const result = matchMealPrep('yolo cajun');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-cajun-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should match nutrify salmon', () => {
    const result = matchMealPrep('nutrify salmon');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-salmon');
    expect(result?.item.category).toBe('fish');
    expect(result?.quantity).toBe(1);
  });

  it('should match yolo beef', () => {
    const result = matchMealPrep('yolo beef');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-beef-bowl');
    expect(result?.item.category).toBe('beef');
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - Chinese Names', () => {
  it('should match yolo三文鱼', () => {
    const result = matchMealPrep('yolo三文鱼');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-salmon');
    expect(result?.item.category).toBe('fish');
    expect(result?.quantity).toBe(1);
  });

  it('should match nutrify鸡胸', () => {
    const result = matchMealPrep('nutrify鸡胸');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should match 健身餐鸡胸', () => {
    const result = matchMealPrep('健身餐鸡胸');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.item.brand).toBe('Generic');
    expect(result?.quantity).toBe(1);
  });

  it('should match yolo牛肉', () => {
    const result = matchMealPrep('yolo牛肉');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-beef-bowl');
    expect(result?.quantity).toBe(1);
  });

  it('should match fitthree鸡胸', () => {
    const result = matchMealPrep('fitthree鸡胸');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('fitthree-chicken');
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - Generic Meal Prep', () => {
  it('should match meal prep chicken', () => {
    const result = matchMealPrep('meal prep chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.item.brand).toBe('Generic');
    expect(result?.quantity).toBe(1);
  });

  it('should match 减脂餐鸡胸', () => {
    const result = matchMealPrep('减脂餐鸡胸');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should match meal prep beef', () => {
    const result = matchMealPrep('meal prep beef');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-beef');
    expect(result?.item.category).toBe('beef');
    expect(result?.quantity).toBe(1);
  });

  it('should match 健身餐牛肉', () => {
    const result = matchMealPrep('健身餐牛肉');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-beef');
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - Quantity Extraction', () => {
  it('should extract quantity from 2盒yolo chicken', () => {
    const result = matchMealPrep('2盒yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
    expect(result?.quantity).toBe(2);
  });

  it('should extract quantity from 3 boxes nutrify chicken', () => {
    const result = matchMealPrep('3 boxes nutrify chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.quantity).toBe(3);
  });

  it('should extract quantity from 两份nutrify chicken', () => {
    const result = matchMealPrep('两份nutrify chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.quantity).toBe(2);
  });

  it('should extract quantity from 三盒lean bento', () => {
    const result = matchMealPrep('三盒lean bento');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
    expect(result?.quantity).toBe(3);
  });

  it('should extract quantity from 4份meal prep chicken', () => {
    const result = matchMealPrep('4份meal prep chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.quantity).toBe(4);
  });

  it('should extract quantity from 五盒yolo salmon', () => {
    const result = matchMealPrep('五盒yolo salmon');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-salmon');
    expect(result?.quantity).toBe(5);
  });

  it('should handle 二份 (alternative for 两份)', () => {
    const result = matchMealPrep('二份fitthree chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('fitthree-chicken');
    expect(result?.quantity).toBe(2);
  });
});

describe('matchMealPrep - Quantity Cap', () => {
  it('should cap quantity at 5 for 10盒', () => {
    const result = matchMealPrep('10盒yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should cap quantity at 5 for 20 boxes', () => {
    const result = matchMealPrep('20 boxes nutrify chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should cap quantity at 5 for 100份', () => {
    const result = matchMealPrep('100份meal prep chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should allow quantity of 5', () => {
    const result = matchMealPrep('5盒yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.quantity).toBe(5);
  });

  it('should reset to 1 for quantity of 6', () => {
    const result = matchMealPrep('6盒yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - No Match', () => {
  it('should return null for mcdonalds', () => {
    const result = matchMealPrep('mcdonalds');
    expect(result).toBeNull();
  });

  it('should return null for bubble tea', () => {
    const result = matchMealPrep('bubble tea');
    expect(result).toBeNull();
  });

  it('should return null for pizza', () => {
    const result = matchMealPrep('pizza');
    expect(result).toBeNull();
  });

  it('should return null for random text', () => {
    const result = matchMealPrep('some random food item');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = matchMealPrep('');
    expect(result).toBeNull();
  });
});

describe('matchMealPrep - Case Insensitive', () => {
  it('should match YOLO TERIYAKI CHICKEN', () => {
    const result = matchMealPrep('YOLO TERIYAKI CHICKEN');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should match NuTrIfY cHiCkEn', () => {
    const result = matchMealPrep('NuTrIfY cHiCkEn');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
    expect(result?.quantity).toBe(1);
  });

  it('should match LEAN BENTO', () => {
    const result = matchMealPrep('LEAN BENTO');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
    expect(result?.quantity).toBe(1);
  });

  it('should match MEAL PREP CHICKEN', () => {
    const result = matchMealPrep('MEAL PREP CHICKEN');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
    expect(result?.quantity).toBe(1);
  });
});

describe('matchMealPrep - Longer Match Wins', () => {
  it('should prefer "yolo teriyaki chicken" over "yolo teriyaki"', () => {
    const result = matchMealPrep('yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
    // Verify it matched the longer name
    expect(result?.item.names).toContain('yolo teriyaki chicken');
  });

  it('should prefer "nutrify grilled chicken" over "nutrify chicken"', () => {
    const result = matchMealPrep('nutrify grilled chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
  });

  it('should prefer "lean bento chicken" over "lean bento"', () => {
    const result = matchMealPrep('lean bento chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
  });

  it('should prefer "meal prep chicken" over partial matches', () => {
    const result = matchMealPrep('meal prep chicken breast');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
  });
});

describe('matchMealPrep - Chinese Punctuation Stripping', () => {
  it('should strip Chinese comma (，)', () => {
    const result = matchMealPrep('yolo teriyaki，chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
  });

  it('should strip Chinese period (。)', () => {
    const result = matchMealPrep('nutrify chicken。');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('nutrify-grilled-chicken');
  });

  it('should strip Chinese exclamation (！)', () => {
    const result = matchMealPrep('lean bento！');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
  });

  it('should strip Chinese question mark (？)', () => {
    const result = matchMealPrep('meal prep chicken？');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('generic-meal-prep-chicken');
  });

  it('should strip multiple Chinese punctuation marks', () => {
    const result = matchMealPrep('yolo teriyaki。chicken！');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
  });
});

describe('matchMealPrep - Edge Cases', () => {
  it('should handle text with extra spaces', () => {
    const result = matchMealPrep('yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
  });

  it('should handle mixed English and Chinese', () => {
    const result = matchMealPrep('我吃了yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('yolo-teriyaki-chicken');
  });

  it('should handle quantity with spaces', () => {
    const result = matchMealPrep('2 盒 yolo teriyaki chicken');
    expect(result).not.toBeNull();
    expect(result?.quantity).toBe(2);
  });

  it('should match "the lean bento" full brand name', () => {
    const result = matchMealPrep('the lean bento');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('leanbento-chicken-rice');
    expect(result?.item.brand).toBe('The Lean Bento');
  });

  it('should match "fit three" with space', () => {
    const result = matchMealPrep('fit three');
    expect(result).not.toBeNull();
    expect(result?.item.id).toBe('fitthree-chicken');
  });
});
