import { describe, it, expect } from 'vitest';
import { matchSupplement, SUPPLEMENT_DB } from '@/lib/supplement/supplement-db';

describe('SUPPLEMENT_DB', () => {
  it('should have entries with required fields', () => {
    expect(SUPPLEMENT_DB.length).toBeGreaterThan(0);
    SUPPLEMENT_DB.forEach(entry => {
      expect(entry.id).toBeDefined();
      expect(entry.names).toBeInstanceOf(Array);
      expect(entry.names.length).toBeGreaterThan(0);
      expect(entry.category).toBeDefined();
      expect(entry.defaultServing).toBeDefined();
      expect(entry.nutrition).toBeDefined();
    });
  });
});

describe('matchSupplement', () => {
  describe('exact brand matches', () => {
    it('should match ON Gold Standard', () => {
      const result = matchSupplement('on gold standard');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.entry.brand).toBe('Optimum Nutrition');
      expect(result?.quantity).toBe(1);
    });

    it('should match MyProtein', () => {
      const result = matchSupplement('myprotein');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('myprotein-impact-whey');
      expect(result?.entry.brand).toBe('Myprotein');
      expect(result?.quantity).toBe(1);
    });

    it('should match Quest Bar', () => {
      const result = matchSupplement('quest bar');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('quest-bar');
      expect(result?.entry.brand).toBe('Quest');
      expect(result?.quantity).toBe(1);
    });

    it('should match MuscleTech Nitrotech', () => {
      const result = matchSupplement('nitrotech');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('muscletech-nitrotech');
      expect(result?.entry.brand).toBe('MuscleTech');
      expect(result?.quantity).toBe(1);
    });

    it('should match RXBAR', () => {
      const result = matchSupplement('rxbar');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('rxbar');
      expect(result?.entry.brand).toBe('RXBAR');
      expect(result?.quantity).toBe(1);
    });
  });

  describe('generic matches', () => {
    it('should match whey', () => {
      const result = matchSupplement('whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match protein powder', () => {
      const result = matchSupplement('protein powder');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match 蛋白粉', () => {
      const result = matchSupplement('蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match creatine', () => {
      const result = matchSupplement('creatine');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
      expect(result?.quantity).toBe(1);
    });

    it('should match bcaa', () => {
      const result = matchSupplement('bcaa');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('bcaa');
      expect(result?.quantity).toBe(1);
    });

    it('should match protein bar', () => {
      const result = matchSupplement('protein bar');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-protein-bar');
      expect(result?.quantity).toBe(1);
    });

    it('should match casein', () => {
      const result = matchSupplement('casein');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('casein');
      expect(result?.quantity).toBe(1);
    });

    it('should match mass gainer', () => {
      const result = matchSupplement('mass gainer');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('mass-gainer');
      expect(result?.quantity).toBe(1);
    });
  });

  describe('Chinese name matches', () => {
    it('should match 肌酸', () => {
      const result = matchSupplement('肌酸');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
      expect(result?.quantity).toBe(1);
    });

    it('should match 支链氨基酸', () => {
      const result = matchSupplement('支链氨基酸');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('bcaa');
      expect(result?.quantity).toBe(1);
    });

    it('should match 氮泵', () => {
      const result = matchSupplement('氮泵');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('preworkout');
      expect(result?.quantity).toBe(1);
    });

    it('should match 蛋白棒', () => {
      const result = matchSupplement('蛋白棒');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-protein-bar');
      expect(result?.quantity).toBe(1);
    });

    it('should match 增肌粉', () => {
      const result = matchSupplement('增肌粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('mass-gainer');
      expect(result?.quantity).toBe(1);
    });

    it('should match 乳清蛋白', () => {
      const result = matchSupplement('乳清蛋白');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match 酪蛋白', () => {
      const result = matchSupplement('酪蛋白');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('casein');
      expect(result?.quantity).toBe(1);
    });

    it('should match ON金标', () => {
      const result = matchSupplement('on金标');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.quantity).toBe(1);
    });
  });

  describe('quantity extraction', () => {
    it('should extract quantity from "2 scoops whey"', () => {
      const result = matchSupplement('2 scoops whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(2);
    });

    it('should extract quantity from "3勺蛋白粉"', () => {
      const result = matchSupplement('3勺蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(3);
    });

    it('should extract quantity from "两杯"', () => {
      const result = matchSupplement('两杯蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(2);
    });

    it('should extract quantity from "三勺"', () => {
      const result = matchSupplement('三勺蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(3);
    });

    it('should extract quantity from "5 servings protein"', () => {
      const result = matchSupplement('5 servings protein powder');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(5);
    });

    it('should extract quantity from "2条蛋白棒"', () => {
      const result = matchSupplement('2条蛋白棒');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-protein-bar');
      expect(result?.quantity).toBe(2);
    });

    it('should extract quantity from "3 bars quest"', () => {
      const result = matchSupplement('3 bars quest');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('quest-bar');
      expect(result?.quantity).toBe(3);
    });

    it('should extract quantity from "4杯"', () => {
      const result = matchSupplement('4杯whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(4);
    });

    it('should handle "二勺" as 2', () => {
      const result = matchSupplement('二勺蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(2);
    });

    it('should handle "四份" as 4', () => {
      const result = matchSupplement('四份蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(4);
    });

    it('should handle "五条" as 5', () => {
      const result = matchSupplement('五条蛋白棒');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-protein-bar');
      expect(result?.quantity).toBe(5);
    });
  });

  describe('quantity cap', () => {
    it('should cap quantity at 10 - "15 scoops whey" returns quantity 1', () => {
      const result = matchSupplement('15 scoops whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should cap quantity at 10 - "20杯蛋白粉" returns quantity 1', () => {
      const result = matchSupplement('20杯蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should cap quantity at 10 - "100 servings" returns null (no match for "protein" alone)', () => {
      const result = matchSupplement('100 servings protein');
      expect(result).toBeNull();
    });

    it('should allow quantity 10', () => {
      const result = matchSupplement('10 scoops whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(10);
    });
  });

  describe('no match cases', () => {
    it('should return null for "pizza"', () => {
      const result = matchSupplement('pizza');
      expect(result).toBeNull();
    });

    it('should return null for "chicken rice"', () => {
      const result = matchSupplement('chicken rice');
      expect(result).toBeNull();
    });

    it('should return null for "apple"', () => {
      const result = matchSupplement('apple');
      expect(result).toBeNull();
    });

    it('should return null for "coffee"', () => {
      const result = matchSupplement('coffee');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = matchSupplement('');
      expect(result).toBeNull();
    });

    it('should return null for random text', () => {
      const result = matchSupplement('xyz123abc');
      expect(result).toBeNull();
    });
  });

  describe('case insensitive matching', () => {
    it('should match "ON GOLD STANDARD"', () => {
      const result = matchSupplement('ON GOLD STANDARD');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.quantity).toBe(1);
    });

    it('should match "MYPROTEIN"', () => {
      const result = matchSupplement('MYPROTEIN');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('myprotein-impact-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match "WhEy PrOtEiN"', () => {
      const result = matchSupplement('WhEy PrOtEiN');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should match "CREATINE"', () => {
      const result = matchSupplement('CREATINE');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
      expect(result?.quantity).toBe(1);
    });

    it('should match "Quest BAR"', () => {
      const result = matchSupplement('Quest BAR');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('quest-bar');
      expect(result?.quantity).toBe(1);
    });
  });

  describe('longer match wins', () => {
    it('should match "on gold standard whey" to ON Gold Standard, not generic whey', () => {
      const result = matchSupplement('on gold standard whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.entry.brand).toBe('Optimum Nutrition');
    });

    it('should match "gold standard whey" to ON Gold Standard', () => {
      const result = matchSupplement('gold standard whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
    });

    it('should match "impact whey" to MyProtein, not generic whey', () => {
      const result = matchSupplement('impact whey');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('myprotein-impact-whey');
    });

    it('should match "quest bar" to Quest Bar, not generic protein bar', () => {
      const result = matchSupplement('quest bar');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('quest-bar');
    });

    it('should match "protein powder" to generic whey (longer than just "protein")', () => {
      const result = matchSupplement('protein powder');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
    });

    it('should match "creatine monohydrate" to creatine with longer name', () => {
      const result = matchSupplement('creatine monohydrate');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
    });
  });

  describe('Chinese punctuation stripping', () => {
    it('should strip "，" and match "蛋白粉，两勺"', () => {
      const result = matchSupplement('蛋白粉，两勺');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(2);
    });

    it('should strip "。" and match "蛋白粉。"', () => {
      const result = matchSupplement('蛋白粉。');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(1);
    });

    it('should strip "！" and match "肌酸！"', () => {
      const result = matchSupplement('肌酸！');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
      expect(result?.quantity).toBe(1);
    });

    it('should strip "？" and match "蛋白棒？"', () => {
      const result = matchSupplement('蛋白棒？');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-protein-bar');
      expect(result?.quantity).toBe(1);
    });

    it('should handle multiple punctuation marks', () => {
      const result = matchSupplement('蛋白粉，，。！？三勺');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(3);
    });
  });

  describe('complex real-world scenarios', () => {
    it('should handle "I had 2 scoops of ON Gold Standard"', () => {
      const result = matchSupplement('I had 2 scoops of ON Gold Standard');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.quantity).toBe(2);
    });

    it('should handle "今天喝了三勺蛋白粉"', () => {
      const result = matchSupplement('今天喝了三勺蛋白粉');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('generic-whey');
      expect(result?.quantity).toBe(3);
    });

    it('should handle "ate 2 quest bars"', () => {
      const result = matchSupplement('ate 2 quest bars');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('quest-bar');
      expect(result?.quantity).toBe(1); // quantity not extracted because "quest" is between "2" and "bars"
    });

    it('should handle "5g creatine"', () => {
      const result = matchSupplement('5g creatine');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('creatine');
      expect(result?.quantity).toBe(1); // no quantity pattern matched
    });

    it('should handle "myprotein impact whey 2 scoops"', () => {
      const result = matchSupplement('myprotein impact whey 2 scoops');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('myprotein-impact-whey');
      expect(result?.quantity).toBe(2);
    });

    it('should handle mixed language "ON金标 2勺"', () => {
      const result = matchSupplement('ON金标 2勺');
      expect(result).not.toBeNull();
      expect(result?.entry.id).toBe('on-gold-standard');
      expect(result?.quantity).toBe(2);
    });
  });
});
