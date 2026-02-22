/**
 * Singapore-style Response Formatter
 * Unified friendly + professional style with optional Singlish flavor
 * Default response is concise; full details available via "Details" button
 */

import type { FoodRecognitionResult, HealthRating } from '@/types';

export interface Phase3Data {
  streak?: {
    current: number;
    longest: number;
  };
  budget?: NutritionBudget;
}

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
   * Concise response: rating + food name + calories + one tip
   */
  formatResponse(
    result: FoodRecognitionResult,
    rating: HealthRating,
    phase3Data?: Phase3Data
  ): string {
    const score = rating.score;
    const emoji = this.getScoreEmoji(score);
    const food = result.foods[0];
    const total = result.totalNutrition;
    const avgCal = Math.round((total.calories.min + total.calories.max) / 2);
    const avgProtein = Math.round((total.protein.min + total.protein.max) / 2);
    const avgCarbs = Math.round((total.carbs.min + total.carbs.max) / 2);

    let response = `${emoji} *${food.nameLocal || food.name}*\n`;
    if (food.modifiers && food.modifiers.length > 0) {
      response += `✨ ${food.modifiers.join(', ')}\n`;
    }
    response += `${avgCal} kcal · P${avgProtein}g · C${avgCarbs}g · ${score}/100\n`;

    // Streak (one line max)
    if (phase3Data?.streak && phase3Data.streak.current > 0) {
      response += `🔥 ${phase3Data.streak.current} day streak\n`;
    }

    // Budget remaining (one line)
    if (phase3Data?.budget) {
      const left = phase3Data.budget.caloriesTotal - phase3Data.budget.caloriesUsed - avgCal;
      if (left > 0) {
        response += `💰 ${left} kcal left today\n`;
      } else {
        response += `⚠️ Over budget by ${Math.abs(left)} kcal\n`;
      }
    }

    // One actionable tip
    const tip = this.getTopTip(result, rating);
    if (tip) {
      response += `\n💡 ${tip}`;
    }

    return response;
  }

  /**
   * Detailed response: full nutrition breakdown + all factors + suggestions
   * Sent when user clicks "Details" button
   */
  formatDetailResponse(
    result: FoodRecognitionResult,
    rating: HealthRating
  ): string {
    const total = result.totalNutrition;
    const avg = (n: { min: number; max: number }) => Math.round((n.min + n.max) / 2);

    let response = `📊 *Nutrition Details*\n\n`;

    // All food items
    for (const food of result.foods) {
      response += `*${food.nameLocal || food.name}* (${food.portion})\n`;
      if (food.modifiers && food.modifiers.length > 0) {
        response += `✨ ${food.modifiers.join(', ')}\n`;
      }
      response += `${avg(food.nutrition.calories)} kcal`;
      if (food.nutriGrade) response += ` · Nutri-Grade ${food.nutriGrade}`;
      if (food.giLevel) response += ` · GI: ${food.giLevel}`;
      response += `\n`;
    }
    // Macros total
    response += `\n*Total:*\n`;
    response += `• Calories: ${avg(total.calories)} kcal\n`;
    response += `• Protein: ${avg(total.protein)}g\n`;
    response += `• Carbs: ${avg(total.carbs)}g\n`;
    response += `• Fat: ${avg(total.fat)}g\n`;
    response += `• Sodium: ${avg(total.sodium)}mg\n`;

    // Health factors
    if (rating.factors.length > 0) {
      response += `\n*Health Analysis:*\n`;
      for (const factor of rating.factors) {
        const icon = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
        response += `${icon} ${factor.message}\n`;
      }
    }

    // Suggestions
    if (rating.suggestions.length > 0) {
      response += `\n*Suggestions:*\n`;
      for (const s of rating.suggestions) {
        response += `• ${s}\n`;
      }
    }

    // Improvement tips from food items
    const tips = result.foods
      .filter(f => f.improvementTip)
      .map(f => `• ${f.name}: ${f.improvementTip}`);
    if (tips.length > 0) {
      response += `\n*Next Time Try:*\n${tips.join('\n')}\n`;
    }

    return response;
  }

  /**
   * Pick the single most relevant tip
   */
  private getTopTip(result: FoodRecognitionResult, rating: HealthRating): string | null {
    // Priority: poor factors > improvement tips > suggestions
    const poorFactor = rating.factors.find(f => f.status === 'poor');
    if (poorFactor) {
      if (poorFactor.message.toLowerCase().includes('sodium') || poorFactor.message.includes('钠')) {
        return 'Drink water to flush sodium';
      }
      if (poorFactor.message.toLowerCase().includes('fat') || poorFactor.message.includes('脂肪')) {
        return 'Take a short walk after eating';
      }
    }

    const tip = result.foods[0]?.improvementTip;
    if (tip) return tip;

    if (rating.suggestions.length > 0) return rating.suggestions[0];

    if (rating.score >= 80) return 'Great choice, keep it up!';
    return null;
  }

  private getScoreEmoji(score: number): string {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  }
}

export const responseFormatterSG = new ResponseFormatterSG();
