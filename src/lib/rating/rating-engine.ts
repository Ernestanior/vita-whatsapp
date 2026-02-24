/**
 * RatingEngine - Evaluates food nutrition and provides health ratings
 * 
 * Responsibilities:
 * - Calculate daily nutritional targets based on user health profile
 * - Evaluate individual factors (calories, sodium, fat, balance)
 * - Calculate overall health score (0-100)
 * - Generate personalized suggestions based on user goals
 * - Return rating with red/yellow/green light system
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { calculateDailyCalories } from '@/lib/database/functions';
import type {
  HealthProfile,
  FoodRecognitionResult,
  HealthRating,
  RatingLevel,
  FactorStatus,
} from '@/types';

/**
 * Daily nutritional targets
 */
export interface DailyTarget {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  sodium: number; // mg
}

/**
 * Factor evaluation result
 */
interface FactorEvaluation {
  name: string;
  status: FactorStatus;
  message: string;
  score: number; // 0-100
}

type Lang = 'en' | 'zh-CN' | 'zh-TW';

/** Bilingual suggestion helper — keeps rating engine i18n-aware */
const suggestionI18n: Record<string, Record<Lang, string>> = {
  'smaller-portions-lose': {
    'en': 'Consider smaller portions to support your weight loss goal',
    'zh-CN': '建议减少份量，帮助减重目标',
    'zh-TW': '建議減少份量，幫助減重目標',
  },
  'calorie-dense': {
    'en': 'This meal is calorie-dense - balance with lighter meals today',
    'zh-CN': '这餐热量较高，今天其他餐吃清淡些',
    'zh-TW': '這餐熱量較高，今天其他餐吃清淡些',
  },
  'add-protein-muscle': {
    'en': 'Add protein-rich foods to support muscle growth',
    'zh-CN': '增加高蛋白食物来支持增肌',
    'zh-TW': '增加高蛋白食物來支持增肌',
  },
  'reduce-soy-sauce': {
    'en': 'Reduce soy sauce, soup, and salty condiments',
    'zh-CN': '减少酱油、汤和咸味调料',
    'zh-TW': '減少醬油、湯和鹹味調料',
  },
  'drink-water-sodium': {
    'en': 'Drink plenty of water to help flush excess sodium',
    'zh-CN': '多喝水帮助排出多余钠',
    'zh-TW': '多喝水幫助排出多餘鈉',
  },
  'watch-sodium': {
    'en': 'Watch sodium intake for the rest of the day',
    'zh-CN': '今天剩余时间注意控制钠摄入',
    'zh-TW': '今天剩餘時間注意控制鈉攝入',
  },
  'remove-fat-skin': {
    'en': 'Remove visible fat and chicken skin',
    'zh-CN': '去掉可见脂肪和鸡皮',
    'zh-TW': '去掉可見脂肪和雞皮',
  },
  'choose-steamed': {
    'en': 'Choose steamed or grilled options instead of fried',
    'zh-CN': '选择蒸或烤代替油炸',
    'zh-TW': '選擇蒸或烤代替油炸',
  },
  'balance-lower-fat': {
    'en': 'Balance with lower-fat meals later today',
    'zh-CN': '今天后面的餐选低脂的',
    'zh-TW': '今天後面的餐選低脂的',
  },
  'add-protein-balance': {
    'en': 'Add more protein (lean meat, tofu, eggs) for better balance',
    'zh-CN': '增加蛋白质（瘦肉、豆腐、鸡蛋）让营养更均衡',
    'zh-TW': '增加蛋白質（瘦肉、豆腐、雞蛋）讓營養更均衡',
  },
  'reduce-rice': {
    'en': 'Reduce rice/noodles and add more vegetables',
    'zh-CN': '减少饭/面，多加蔬菜',
    'zh-TW': '減少飯/麵，多加蔬菜',
  },
  'swap-whole-grains': {
    'en': '💡 Tip: Swap white rice/noodles for whole grains or add more vegetables to lower GI',
    'zh-CN': '💡 建议：用全谷物替代白饭/面条，或多加蔬菜降低 GI',
    'zh-TW': '💡 建議：用全穀物替代白飯/麵條，或多加蔬菜降低 GI',
  },
  'siu-dai': {
    'en': '💡 Tip: Choose "Siu Dai" (less sugar) or water to improve Nutri-Grade',
    'zh-CN': '💡 建议：选"少糖"或白水来改善 Nutri-Grade',
    'zh-TW': '💡 建議：選"少糖"或白水來改善 Nutri-Grade',
  },
  'hawker-less-gravy': {
    'en': '💡 Hawker Tip: Ask for less gravy and more bean sprouts',
    'zh-CN': '💡 小贩中心建议：少酱汁，多豆芽',
    'zh-TW': '💡 小販中心建議：少醬汁，多豆芽',
  },
  'eat-slowly': {
    'en': '💡 Tip: Eat slowly and stop when 80% full',
    'zh-CN': '💡 建议：细嚼慢咽，八分饱即可',
    'zh-TW': '💡 建議：細嚼慢嚥，八分飽即可',
  },
  'adequate-protein': {
    'en': '💡 Tip: Ensure adequate protein intake throughout the day',
    'zh-CN': '💡 建议：确保全天蛋白质摄入充足',
    'zh-TW': '💡 建議：確保全天蛋白質攝入充足',
  },
  'whole-grains-sugar': {
    'en': '💡 Tip: Choose whole grains and avoid sugary drinks',
    'zh-CN': '💡 建议：选全谷物，避免含糖饮料',
    'zh-TW': '💡 建議：選全穀物，避免含糖飲料',
  },
};

function s(key: string, lang: Lang): string {
  return suggestionI18n[key]?.[lang] ?? suggestionI18n[key]?.['en'] ?? key;
}

export class RatingEngine {
  /**
   * Evaluate food and generate health rating
   */
  async evaluate(
    food: FoodRecognitionResult,
    profile: HealthProfile,
    language: Lang = 'en'
  ): Promise<HealthRating> {
    // 1. Calculate daily target
    const dailyTarget = this.calculateDailyTarget(profile);

    // 2. Evaluate individual factors
    const factors = [
      this.evaluateCalories(food, dailyTarget, profile.goal),
      this.evaluateSodium(food),
      this.evaluateFat(food),
      this.evaluateBalance(food),
      this.evaluateNutriGrade(food),
      this.evaluateGI(food),
    ];

    // 3. Calculate overall score (weighted by user goal)
    const score = this.calculateScore(factors, profile.goal);

    // 4. Determine overall rating
    const overall = this.getOverallRating(score);

    // 5. Generate suggestions (language-aware)
    const suggestions = this.generateSuggestions(factors, profile, food, language);

    return {
      overall,
      score,
      factors: factors.map(f => ({
        name: f.name,
        status: f.status,
        message: f.message,
      })),
      suggestions,
    };
  }

  /**
   * Calculate daily nutritional targets based on user profile
   * Uses Mifflin-St Jeor formula for calorie calculation
   */
  calculateDailyTarget(profile: HealthProfile): DailyTarget {
    // Calculate daily calories using Mifflin-St Jeor formula
    const calories = calculateDailyCalories({
      height: profile.height,
      weight: profile.weight,
      age: profile.age || 30,
      gender: profile.gender || 'male',
      activity_level: profile.activityLevel,
      goal: profile.goal,
    });

    // ── Protein target ──
    let protein: number;
    if (profile.proteinTarget) {
      protein = profile.proteinTarget;
    } else {
      let proteinPerKg: number;
      const training = profile.trainingType || 'none';
      switch (profile.goal) {
        case 'gain-muscle':
          proteinPerKg = training === 'strength' ? 2.2 : 2.0;
          break;
        case 'lose-weight':
          proteinPerKg = 1.6; // high protein to preserve muscle
          break;
        case 'control-sugar':
          proteinPerKg = 1.2;
          break;
        default: // maintain
          proteinPerKg = training === 'none' ? 1.0 : 1.4;
      }
      protein = profile.weight * proteinPerKg;
    }

    // ── Carb target ──
    let carbs: number;
    if (profile.carbTarget) {
      carbs = profile.carbTarget;
    } else {
      let carbPercent: number;
      switch (profile.goal) {
        case 'gain-muscle': carbPercent = 0.50; break;
        case 'lose-weight': carbPercent = 0.35; break;
        case 'control-sugar': carbPercent = 0.30; break;
        default: carbPercent = 0.45;
      }
      carbs = (calories * carbPercent) / 4;
    }

    // ── Fat: fill remaining calories (min 30g) ──
    const fatCalories = calories - (protein * 4) - (carbs * 4);
    const fat = Math.max(fatCalories / 9, 30);

    // Sodium: WHO recommendation is 2000mg/day
    const sodium = 2000;

    return { calories, protein, carbs, fat, sodium };
  }

  /**
   * Evaluate calorie content
   */
  private evaluateCalories(
    food: FoodRecognitionResult,
    target: DailyTarget,
    goal: HealthProfile['goal']
  ): FactorEvaluation {
    // Use average of min/max for evaluation
    const avgCalories =
      (food.totalNutrition.calories.min + food.totalNutrition.calories.max) / 2;

    // Calculate percentage of daily target
    const percentOfDaily = (avgCalories / target.calories) * 100;

    // Determine meal context multiplier
    const mealMultipliers = {
      breakfast: 0.25, // 25% of daily
      lunch: 0.35, // 35% of daily
      dinner: 0.30, // 30% of daily
      snack: 0.10, // 10% of daily
    };

    const expectedPercent = mealMultipliers[food.mealContext] * 100;
    const deviation = Math.abs(percentOfDaily - expectedPercent);

    // Score based on deviation from expected
    let score: number;
    let status: FactorStatus;
    let message: string;

    if (deviation < 10) {
      score = 100;
      status = 'good';
      message = `Calorie content is appropriate for ${food.mealContext} (${Math.round(avgCalories)} kcal)`;
    } else if (deviation < 20) {
      score = 70;
      status = 'moderate';
      if (percentOfDaily > expectedPercent) {
        message = `Slightly high in calories for ${food.mealContext} (${Math.round(avgCalories)} kcal)`;
      } else {
        message = `Slightly low in calories for ${food.mealContext} (${Math.round(avgCalories)} kcal)`;
      }
    } else {
      score = 40;
      status = 'poor';
      if (percentOfDaily > expectedPercent) {
        message = `Too high in calories for ${food.mealContext} (${Math.round(avgCalories)} kcal)`;
      } else {
        message = `Too low in calories for ${food.mealContext} (${Math.round(avgCalories)} kcal)`;
      }
    }

    // Adjust for goal
    if (goal === 'lose-weight' && percentOfDaily < expectedPercent) {
      // Lower calories is good for weight loss
      score = Math.min(100, score + 10);
      status = score >= 80 ? 'good' : status;
    } else if (goal === 'gain-muscle' && percentOfDaily > expectedPercent) {
      // Higher calories is acceptable for muscle gain
      score = Math.min(100, score + 10);
      status = score >= 80 ? 'good' : status;
    }

    return {
      name: 'Calories',
      status,
      message,
      score,
    };
  }

  /**
   * Evaluate sodium content
   */
  private evaluateSodium(food: FoodRecognitionResult): FactorEvaluation {
    // Use average of min/max
    const avgSodium =
      (food.totalNutrition.sodium.min + food.totalNutrition.sodium.max) / 2;

    // WHO recommends < 2000mg/day
    // A single meal should be < 700mg (35% of daily)
    let score: number;
    let status: FactorStatus;
    let message: string;

    if (avgSodium < 500) {
      score = 100;
      status = 'good';
      message = `Low sodium content (${Math.round(avgSodium)}mg)`;
    } else if (avgSodium < 700) {
      score = 80;
      status = 'good';
      message = `Moderate sodium content (${Math.round(avgSodium)}mg)`;
    } else if (avgSodium < 1000) {
      score = 60;
      status = 'moderate';
      message = `High sodium content (${Math.round(avgSodium)}mg) - consider reducing`;
    } else {
      score = 30;
      status = 'poor';
      message = `Very high sodium content (${Math.round(avgSodium)}mg) - exceeds recommended limit`;
    }

    return {
      name: 'Sodium',
      status,
      message,
      score,
    };
  }

  /**
   * Evaluate fat content
   */
  private evaluateFat(food: FoodRecognitionResult): FactorEvaluation {
    // Use average of min/max
    const avgFat =
      (food.totalNutrition.fat.min + food.totalNutrition.fat.max) / 2;
    const avgCalories =
      (food.totalNutrition.calories.min + food.totalNutrition.calories.max) / 2;

    // Calculate fat percentage of total calories
    // 1g fat = 9 calories
    const fatCalories = avgFat * 9;
    const fatPercent = (fatCalories / avgCalories) * 100;

    let score: number;
    let status: FactorStatus;
    let message: string;

    if (fatPercent < 25) {
      score = 100;
      status = 'good';
      message = `Healthy fat content (${Math.round(avgFat)}g, ${Math.round(fatPercent)}% of calories)`;
    } else if (fatPercent < 35) {
      score = 70;
      status = 'moderate';
      message = `Moderate fat content (${Math.round(avgFat)}g, ${Math.round(fatPercent)}% of calories)`;
    } else {
      score = 40;
      status = 'poor';
      message = `High fat content (${Math.round(avgFat)}g, ${Math.round(fatPercent)}% of calories)`;
    }

    return {
      name: 'Fat',
      status,
      message,
      score,
    };
  }

  /**
   * Evaluate nutritional balance
   */
  private evaluateBalance(food: FoodRecognitionResult): FactorEvaluation {
    // Calculate macronutrient distribution
    const avgProtein =
      (food.totalNutrition.protein.min + food.totalNutrition.protein.max) / 2;
    const avgCarbs =
      (food.totalNutrition.carbs.min + food.totalNutrition.carbs.max) / 2;
    const avgFat =
      (food.totalNutrition.fat.min + food.totalNutrition.fat.max) / 2;

    // Calculate calories from each macro
    const proteinCal = avgProtein * 4;
    const carbsCal = avgCarbs * 4;
    const fatCal = avgFat * 9;
    const totalCal = proteinCal + carbsCal + fatCal;

    // Calculate percentages
    const proteinPercent = (proteinCal / totalCal) * 100;
    const carbsPercent = (carbsCal / totalCal) * 100;
    const fatPercent = (fatCal / totalCal) * 100;

    // Ideal ranges:
    // Protein: 15-30%
    // Carbs: 45-65%
    // Fat: 20-35%
    const proteinInRange = proteinPercent >= 15 && proteinPercent <= 30;
    const carbsInRange = carbsPercent >= 45 && carbsPercent <= 65;
    const fatInRange = fatPercent >= 20 && fatPercent <= 35;

    const inRangeCount = [proteinInRange, carbsInRange, fatInRange].filter(
      Boolean
    ).length;

    let score: number;
    let status: FactorStatus;
    let message: string;

    if (inRangeCount === 3) {
      score = 100;
      status = 'good';
      message = `Well-balanced meal (P:${Math.round(proteinPercent)}% C:${Math.round(carbsPercent)}% F:${Math.round(fatPercent)}%)`;
    } else if (inRangeCount === 2) {
      score = 70;
      status = 'moderate';
      message = `Moderately balanced (P:${Math.round(proteinPercent)}% C:${Math.round(carbsPercent)}% F:${Math.round(fatPercent)}%)`;
    } else {
      score = 40;
      status = 'poor';
      message = `Unbalanced meal (P:${Math.round(proteinPercent)}% C:${Math.round(carbsPercent)}% F:${Math.round(fatPercent)}%)`;
    }

    return {
      name: 'Balance',
      status,
      message,
      score,
    };
  }

  /**
   * Evaluate Nutri-Grade
   */
  private evaluateNutriGrade(food: FoodRecognitionResult): FactorEvaluation {
    const grades = food.foods.map(f => f.nutriGrade).filter(Boolean);
    if (grades.length === 0) {
      return { name: 'Nutri-Grade', status: 'good', message: 'N/A', score: 100 };
    }

    // Use the worst grade as the overall grade
    const worstGrade = grades.sort().reverse()[0];
    
    let score = 100;
    let status: FactorStatus = 'good';
    let message = `Nutri-Grade: ${worstGrade}`;

    if (worstGrade === 'C') {
      score = 60;
      status = 'moderate';
      message += ' - High in sugar/saturated fat';
    } else if (worstGrade === 'D') {
      score = 30;
      status = 'poor';
      message += ' - Very high in sugar/saturated fat';
    }

    return { name: 'Nutri-Grade', status, message, score };
  }

  /**
   * Evaluate GI Level
   */
  private evaluateGI(food: FoodRecognitionResult): FactorEvaluation {
    const levels = food.foods.map(f => f.giLevel).filter(Boolean);
    if (levels.length === 0) {
      return { name: 'GI Level', status: 'good', message: 'N/A', score: 100 };
    }

    const hasHighGI = levels.includes('High');
    
    let score = 100;
    let status: FactorStatus = 'good';
    let message = 'Healthy GI level';

    if (hasHighGI) {
      score = 40;
      status = 'poor';
      message = 'High Glycemic Index - may cause blood sugar spikes';
    }

    return { name: 'GI Level', status, message, score };
  }

  /**
   * Calculate overall score from factor evaluations
   * Weights shift based on user goal for more relevant scoring
   */
  private calculateScore(factors: FactorEvaluation[], goal: HealthProfile['goal']): number {
    // Goal-specific weight profiles
    const weightProfiles: Record<HealthProfile['goal'], Record<string, number>> = {
      'maintain': {
        Calories: 0.25, Sodium: 0.20, Fat: 0.15,
        Balance: 0.15, 'Nutri-Grade': 0.15, 'GI Level': 0.10,
      },
      'lose-weight': {
        Calories: 0.30, Sodium: 0.15, Fat: 0.20,
        Balance: 0.10, 'Nutri-Grade': 0.10, 'GI Level': 0.15,
      },
      'gain-muscle': {
        Calories: 0.10, Sodium: 0.15, Fat: 0.10,
        Balance: 0.35, 'Nutri-Grade': 0.10, 'GI Level': 0.20,
      },
      'control-sugar': {
        Calories: 0.15, Sodium: 0.15, Fat: 0.10,
        Balance: 0.10, 'Nutri-Grade': 0.25, 'GI Level': 0.25,
      },
    };

    const weights = weightProfiles[goal] || weightProfiles['maintain'];

    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const weight = weights[factor.name] || 0;
      totalScore += factor.score * weight;
      totalWeight += weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Determine overall rating from score
   */
  private getOverallRating(score: number): RatingLevel {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  }

  /**
   * Generate personalized suggestions
   */
  private generateSuggestions(
    factors: FactorEvaluation[],
    profile: HealthProfile,
    food: FoodRecognitionResult,
    lang: Lang = 'en'
  ): string[] {
    const suggestions: string[] = [];
    const addedKeys = new Set<string>();

    const add = (key: string) => {
      if (!addedKeys.has(key)) {
        addedKeys.add(key);
        suggestions.push(s(key, lang));
      }
    };

    // Analyze each factor and provide specific suggestions
    for (const factor of factors) {
      if (factor.status === 'poor' || factor.status === 'moderate') {
        switch (factor.name) {
          case 'Calories':
            if (factor.message.includes('high')) {
              add(profile.goal === 'lose-weight' ? 'smaller-portions-lose' : 'calorie-dense');
            } else if (factor.message.includes('low') && profile.goal === 'gain-muscle') {
              add('add-protein-muscle');
            }
            break;

          case 'Sodium':
            if (factor.status === 'poor') {
              add('reduce-soy-sauce');
              add('drink-water-sodium');
            } else {
              add('watch-sodium');
            }
            break;

          case 'Fat':
            if (factor.status === 'poor') {
              add('remove-fat-skin');
              add('choose-steamed');
            } else {
              add('balance-lower-fat');
            }
            break;

          case 'Balance':
            if (factor.status === 'poor') {
              const avgProtein = (food.totalNutrition.protein.min + food.totalNutrition.protein.max) / 2;
              const avgCarbs = (food.totalNutrition.carbs.min + food.totalNutrition.carbs.max) / 2;
              const avgFat = (food.totalNutrition.fat.min + food.totalNutrition.fat.max) / 2;
              const proteinCal = avgProtein * 4;
              const carbsCal = avgCarbs * 4;
              const fatCal = avgFat * 9;
              const totalCal = proteinCal + carbsCal + fatCal;

              if (totalCal > 0) {
                if ((proteinCal / totalCal) * 100 < 15) add('add-protein-balance');
                if ((carbsCal / totalCal) * 100 > 65) add('reduce-rice');
              }
            }
            break;
          case 'GI Level':
            if (factor.status === 'poor') add('swap-whole-grains');
            break;

          case 'Nutri-Grade': {
            const worstGrade = food.foods.map(f => f.nutriGrade).filter(Boolean).sort().reverse()[0];
            if (worstGrade === 'C' || worstGrade === 'D') add('siu-dai');
            break;
          }
        }
      }
    }

    const hasHawkerFood = food.foods.some(f => f.isHawkerFood);
    if (hasHawkerFood) {
      add('hawker-less-gravy');
      // AI-generated improvement tips are already language-aware
      food.foods.forEach(f => {
        if (f.improvementTip) {
          const label = f.nameLocal || f.name;
          const tip = `💡 ${label}: ${f.improvementTip}`;
          if (!suggestions.includes(tip)) suggestions.push(tip);
        }
      });
    }

    // Goal-specific suggestions
    if (profile.goal === 'lose-weight') add('eat-slowly');
    else if (profile.goal === 'gain-muscle') add('adequate-protein');
    else if (profile.goal === 'control-sugar') add('whole-grains-sugar');

    return suggestions.slice(0, 4);
  }
}

// Singleton instance
export const ratingEngine = new RatingEngine();
