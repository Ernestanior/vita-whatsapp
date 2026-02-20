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

export class RatingEngine {
  /**
   * Evaluate food and generate health rating
   */
  async evaluate(
    food: FoodRecognitionResult,
    profile: HealthProfile
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

    // 3. Calculate overall score
    const score = this.calculateScore(factors);

    // 4. Determine overall rating
    const overall = this.getOverallRating(score);

    // 5. Generate suggestions
    const suggestions = this.generateSuggestions(factors, profile, food);

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

    // Calculate macronutrient targets
    // Protein: 1.2-2.0g per kg body weight (higher for muscle gain)
    const proteinMultiplier = profile.goal === 'gain-muscle' ? 2.0 : 1.2;
    const protein = profile.weight * proteinMultiplier;

    // Carbs: 50% of calories (4 cal/g)
    const carbs = (calories * 0.5) / 4;

    // Fat: 25% of calories (9 cal/g)
    const fat = (calories * 0.25) / 9;

    // Sodium: WHO recommendation is 2000mg/day
    const sodium = 2000;

    return {
      calories,
      protein,
      carbs,
      fat,
      sodium,
    };
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
   */
  private calculateScore(factors: FactorEvaluation[]): number {
    // Weighted average
    const weights: Record<string, number> = {
      Calories: 0.25,
      Sodium: 0.20,
      Fat: 0.15,
      Balance: 0.15,
      'Nutri-Grade': 0.15,
      'GI Level': 0.10,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      const weight = weights[factor.name as keyof typeof weights] || 0;
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
    food: FoodRecognitionResult
  ): string[] {
    const suggestions: string[] = [];
    const addedSuggestions = new Set<string>();

    const addUniqueSuggestion = (text: string) => {
      if (!addedSuggestions.has(text)) {
        suggestions.push(text);
        addedSuggestions.has(text);
        addedSuggestions.add(text);
      }
    };

    // Analyze each factor and provide specific suggestions
    for (const factor of factors) {
      if (factor.status === 'poor' || factor.status === 'moderate') {
        switch (factor.name) {
          case 'Calories':
            if (factor.message.includes('high')) {
              if (profile.goal === 'lose-weight') {
                addUniqueSuggestion('Consider smaller portions to support your weight loss goal');
              } else {
                addUniqueSuggestion('This meal is calorie-dense - balance with lighter meals today');
              }
            } else if (factor.message.includes('low')) {
              if (profile.goal === 'gain-muscle') {
                addUniqueSuggestion('Add protein-rich foods to support muscle growth');
              }
            }
            break;

          case 'Sodium':
            if (factor.status === 'poor') {
              addUniqueSuggestion('Reduce soy sauce, soup, and salty condiments');
              addUniqueSuggestion('Drink plenty of water to help flush excess sodium');
            } else if (factor.status === 'moderate') {
              addUniqueSuggestion('Watch sodium intake for the rest of the day');
            }
            break;

          case 'Fat':
            if (factor.status === 'poor') {
              addUniqueSuggestion('Remove visible fat and chicken skin');
              addUniqueSuggestion('Choose steamed or grilled options instead of fried');
            } else if (factor.status === 'moderate') {
              addUniqueSuggestion('Balance with lower-fat meals later today');
            }
            break;

          case 'Balance':
            if (factor.status === 'poor') {
              // Check which macro is out of range
              const avgProtein =
                (food.totalNutrition.protein.min +
                  food.totalNutrition.protein.max) /
                2;
              const avgCarbs =
                (food.totalNutrition.carbs.min +
                  food.totalNutrition.carbs.max) /
                2;
              const avgFat = 
                (food.totalNutrition.fat.min +
                  food.totalNutrition.fat.max) /
                2;

              const proteinCal = avgProtein * 4;
              const carbsCal = avgCarbs * 4;
              const fatCal = avgFat * 9;
              const totalCal = proteinCal + carbsCal + fatCal;

              if (totalCal > 0) {
                const proteinPercent = (proteinCal / totalCal) * 100;
                const carbsPercent = (carbsCal / totalCal) * 100;

                if (proteinPercent < 15) {
                  addUniqueSuggestion('Add more protein (lean meat, tofu, eggs) for better balance');
                }
                if (carbsPercent > 65) {
                  addUniqueSuggestion('Reduce rice/noodles and add more vegetables');
                }
              }
            }
            break;
          case 'GI Level':
            if (factor.status === 'poor') {
              addUniqueSuggestion('💡 Tip: Swap white rice/noodles for whole grains or add more vegetables to lower GI');
            }
            break;

          case 'Nutri-Grade': {
            const worstGrade = food.foods.map(f => f.nutriGrade).filter(Boolean).sort().reverse()[0];
            if (worstGrade === 'C' || worstGrade === 'D') {
              addUniqueSuggestion('💡 Tip: Choose "Siu Dai" (less sugar) or water to improve Nutri-Grade');
            }
            break;
          }
        }
      }
    }

    const hasHawkerFood = food.foods.some(f => f.isHawkerFood);
    if (hasHawkerFood) {
      addUniqueSuggestion('💡 Hawker Tip: Ask for less gravy and more bean sprouts');
      
      // Add specific improvement tips from AI recognition
      food.foods.forEach(f => {
        if (f.improvementTip) {
          addUniqueSuggestion(`💡 Tip for ${f.nameLocal || f.name}: ${f.improvementTip}`);
        }
      });
    }

    // Goal-specific suggestions
    if (profile.goal === 'lose-weight') {
      addUniqueSuggestion('💡 Tip: Eat slowly and stop when 80% full');
    } else if (profile.goal === 'gain-muscle') {
      addUniqueSuggestion('💡 Tip: Ensure adequate protein intake throughout the day');
    } else if (profile.goal === 'control-sugar') {
      addUniqueSuggestion('💡 Tip: Choose whole grains and avoid sugary drinks');
    }

    // Limit to top 3-4 most relevant suggestions
    return suggestions.slice(0, 4);
  }
}

// Singleton instance
export const ratingEngine = new RatingEngine();
