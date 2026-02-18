/**
 * Singapore-style Response Formatter
 * Transforms cold nutrition data into warm, actionable, addictive content
 */

import type { FoodRecognitionResult, HealthRating } from '@/types';

export interface CoachPersonality {
  id: 'uncle' | 'hardcore' | 'gentle';
  name: string;
  description: string;
}

export const COACH_PERSONALITIES: CoachPersonality[] = [
  {
    id: 'uncle',
    name: '坡县安哥',
    description: 'Singlish style, friendly and funny',
  },
  {
    id: 'hardcore',
    name: '硬核教练',
    description: 'Data-driven, efficient, no nonsense',
  },
  {
    id: 'gentle',
    name: '温柔鼓励',
    description: 'Supportive and encouraging',
  },
];

interface NutritionBudget {
  caloriesUsed: number;
  caloriesTotal: number;
  fatUsed: number;
  fatTotal: number;
  sodiumUsed: number;
  sodiumTotal: number;
}

export class ResponseFormatterSG {
  /**
   * Format response with personality and actionable insights
   */
  formatResponse(
    result: FoodRecognitionResult,
    rating: HealthRating,
    personality: CoachPersonality['id'] = 'uncle',
    budget?: NutritionBudget
  ): string {
    const score = rating.score;
    const emoji = this.getScoreEmoji(score);
    const grade = this.getGrade(score);
    
    // Build response based on personality
    switch (personality) {
      case 'uncle':
        return this.formatUncleStyle(result, rating, emoji, grade, budget);
      case 'hardcore':
        return this.formatHardcoreStyle(result, rating, emoji, grade, budget);
      case 'gentle':
        return this.formatGentleStyle(result, rating, emoji, grade, budget);
      default:
        return this.formatUncleStyle(result, rating, emoji, grade, budget);
    }
  }

  /**
   * Uncle/Auntie style - Singlish, warm, funny
   */
  private formatUncleStyle(
    result: FoodRecognitionResult,
    rating: HealthRating,
    emoji: string,
    grade: string,
    budget?: NutritionBudget
  ): string {
    const food = result.foods[0];
    const total = result.totalNutrition;
    const score = rating.score;
    
    let response = `${emoji} *${grade}* (${score}/100)\n\n`;
    
    // Personalized opening
    if (score >= 80) {
      response += `Wah! Steady lah! 👍\n`;
    } else if (score >= 60) {
      response += `Boleh lah, not bad! 😊\n`;
    } else {
      response += `Aiyoh... 😅\n`;
    }
    
    response += `\n🍽️ *${food.nameLocal || food.name}*\n`;
    response += `${total.calories.min}-${total.calories.max} kcal\n\n`;
    
    // Budget system
    if (budget) {
      const caloriePercent = Math.round((total.calories.min / budget.caloriesTotal) * 100);
      const fatPercent = Math.round((total.fat.min / budget.fatTotal) * 100);
      
      response += `💰 *Today's Budget:*\n`;
      response += `• Calories: Used ${caloriePercent}% (${budget.caloriesTotal - total.calories.min} kcal left)\n`;
      response += `• Fat: Used ${fatPercent}% (${Math.round(budget.fatTotal - total.fat.min)}g left)\n\n`;
    }
    
    // Immediate action nudge
    response += `🛠️ *Right Now Can Do:*\n`;
    response += this.getImmediateAction(result, rating);
    response += `\n\n`;
    
    // Next meal suggestion
    response += `🍴 *Next Meal Suggestion:*\n`;
    response += this.getNextMealSuggestion(result, rating);
    response += `\n\n`;
    
    // Emotional encouragement
    if (score < 60) {
      response += `💪 *Don't worry leh!*\n`;
      response += `One meal only mah. Tomorrow can balance back! 加油！\n`;
    } else if (score >= 80) {
      response += `🎉 *Shiok ah!*\n`;
      response += `Keep it up! You're doing great! 💪\n`;
    }
    
    return response;
  }

  /**
   * Hardcore style - Data-driven, efficient
   */
  private formatHardcoreStyle(
    result: FoodRecognitionResult,
    rating: HealthRating,
    emoji: string,
    grade: string,
    budget?: NutritionBudget
  ): string {
    const food = result.foods[0];
    const total = result.totalNutrition;
    const score = rating.score;
    
    let response = `${emoji} ${score}/100\n\n`;
    response += `*${food.nameLocal || food.name}*\n`;
    response += `${total.calories.min}kcal | P${total.protein.min}g C${total.carbs.min}g F${total.fat.min}g\n\n`;
    
    if (budget) {
      response += `Budget: ${Math.round((total.calories.min / budget.caloriesTotal) * 100)}% used\n\n`;
    }
    
    response += `*Action:*\n`;
    response += this.getImmediateAction(result, rating);
    response += `\n\n*Next:*\n`;
    response += this.getNextMealSuggestion(result, rating);
    
    return response;
  }

  /**
   * Gentle style - Supportive and encouraging
   */
  private formatGentleStyle(
    result: FoodRecognitionResult,
    rating: HealthRating,
    emoji: string,
    grade: string,
    budget?: NutritionBudget
  ): string {
    const food = result.foods[0];
    const total = result.totalNutrition;
    const score = rating.score;
    
    let response = `${emoji} *${grade}* (${score}/100)\n\n`;
    response += `I see you had *${food.nameLocal || food.name}*! 😊\n`;
    response += `${total.calories.min}-${total.calories.max} calories\n\n`;
    
    if (budget) {
      response += `💝 You've used ${Math.round((total.calories.min / budget.caloriesTotal) * 100)}% of today's calories.\n\n`;
    }
    
    response += `💡 *Here's what you can do:*\n`;
    response += this.getImmediateAction(result, rating);
    response += `\n\n🌟 *For your next meal:*\n`;
    response += this.getNextMealSuggestion(result, rating);
    response += `\n\n`;
    
    if (score < 60) {
      response += `Remember, every meal is a new opportunity! You're doing great by tracking. 💪\n`;
    } else {
      response += `You're making wonderful choices! Keep it up! 🎉\n`;
    }
    
    return response;
  }

  /**
   * Get immediate actionable advice
   */
  private getImmediateAction(result: FoodRecognitionResult, rating: HealthRating): string {
    const actions: string[] = [];
    
    // Check factors for issues
    const poorFactors = rating.factors.filter(f => f.status === 'poor');
    const moderateFactors = rating.factors.filter(f => f.status === 'moderate');
    
    // High sodium
    if (poorFactors.some(f => f.message.toLowerCase().includes('sodium') || f.message.includes('钠')) ||
        moderateFactors.some(f => f.message.toLowerCase().includes('sodium') || f.message.includes('钠'))) {
      actions.push('• Drink 500ml water now to flush sodium');
      actions.push('• 现在喝 500ml 水冲淡钠含量');
    }
    
    // High fat
    if (poorFactors.some(f => f.message.toLowerCase().includes('fat') || f.message.includes('脂肪')) ||
        moderateFactors.some(f => f.message.toLowerCase().includes('fat') || f.message.includes('脂肪'))) {
      actions.push('• Take a 10-min walk after eating');
      actions.push('• 饭后走 10 分钟');
    }
    
    // High calories
    if (result.totalNutrition.calories.min > 600) {
      actions.push('• Skip afternoon snack today');
      actions.push('• 今天下午茶可以 skip 了');
    }
    
    if (actions.length === 0) {
      actions.push('• Keep up the good work!');
      actions.push('• 继续保持！');
    }
    
    return actions.slice(0, 2).join('\n');
  }

  /**
   * Get next meal suggestion
   */
  private getNextMealSuggestion(result: FoodRecognitionResult, _rating: HealthRating): string {
    const total = result.totalNutrition;
    const suggestions: string[] = [];
    
    // High fat meal → suggest low fat next
    if (total.fat.min > 20) {
      suggestions.push('• Yong Tau Foo (soup, no fried items)');
      suggestions.push('• Fish Soup with vegetables');
      suggestions.push('• 酿豆腐汤（不要油炸）');
    }
    // High carb → suggest protein
    else if (total.carbs.min > 60) {
      suggestions.push('• Grilled chicken with salad');
      suggestions.push('• Steamed fish with veggies');
      suggestions.push('• 烤鸡配沙拉');
    }
    // Balanced meal
    else {
      suggestions.push('• Continue with balanced meals');
      suggestions.push('• 继续保持均衡饮食');
    }
    
    return suggestions.slice(0, 2).join('\n');
  }

  /**
   * Get score emoji
   */
  private getScoreEmoji(score: number): string {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  }

  /**
   * Get grade
   */
  private getGrade(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Boleh Lah';
    return 'Can Improve';
  }
}

export const responseFormatterSG = new ResponseFormatterSG();
