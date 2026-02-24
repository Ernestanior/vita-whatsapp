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

type Lang = 'en' | 'zh-CN' | 'zh-TW';

export class ResponseFormatterSG {
  /**
   * Concise response: rating + food name + calories + one tip
   */
  formatResponse(
    result: FoodRecognitionResult,
    rating: HealthRating,
    phase3Data?: Phase3Data,
    language: Lang = 'en'
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

    // Streak
    if (phase3Data?.streak && phase3Data.streak.current > 0) {
      const streakLabel = language === 'en' ? 'day streak' : '天连续';
      response += `🔥 ${phase3Data.streak.current} ${streakLabel}\n`;
    }

    // Budget remaining
    if (phase3Data?.budget) {
      const left = phase3Data.budget.caloriesTotal - phase3Data.budget.caloriesUsed - avgCal;
      if (left > 0) {
        const label = language === 'en' ? 'kcal left today' : 'kcal 今日剩余';
        response += `💰 ${left} ${label}\n`;
      } else {
        const label = language === 'en' ? 'Over budget by' : '超出预算';
        response += `⚠️ ${label} ${Math.abs(left)} kcal\n`;
      }
    }

    // One actionable tip (language-aware)
    const tip = this.getTopTip(result, rating, language);
    if (tip) {
      response += `\n💡 ${tip}`;
    }

    return response;
  }

  /**
   * Detailed response: full nutrition breakdown + all factors + suggestions
   */
  formatDetailResponse(
    result: FoodRecognitionResult,
    rating: HealthRating,
    language: Lang = 'en'
  ): string {
    const total = result.totalNutrition;
    const avg = (n: { min: number; max: number }) => Math.round((n.min + n.max) / 2);

    const t = {
      title: { 'en': 'Nutrition Details', 'zh-CN': '营养详情', 'zh-TW': '營養詳情' },
      total: { 'en': 'Total:', 'zh-CN': '合计：', 'zh-TW': '合計：' },
      analysis: { 'en': 'Health Analysis:', 'zh-CN': '健康分析：', 'zh-TW': '健康分析：' },
      suggestions: { 'en': 'Suggestions:', 'zh-CN': '建议：', 'zh-TW': '建議：' },
      nextTime: { 'en': 'Next Time Try:', 'zh-CN': '下次试试：', 'zh-TW': '下次試試：' },
    };

    let response = `📊 *${t.title[language]}*\n\n`;

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

    response += `\n*${t.total[language]}*\n`;
    response += `• Calories: ${avg(total.calories)} kcal\n`;
    response += `• Protein: ${avg(total.protein)}g\n`;
    response += `• Carbs: ${avg(total.carbs)}g\n`;
    response += `• Fat: ${avg(total.fat)}g\n`;
    response += `• Sodium: ${avg(total.sodium)}mg\n`;

    if (rating.factors.length > 0) {
      response += `\n*${t.analysis[language]}*\n`;
      for (const factor of rating.factors) {
        const icon = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
        response += `${icon} ${factor.message}\n`;
      }
    }

    if (rating.suggestions.length > 0) {
      response += `\n*${t.suggestions[language]}*\n`;
      for (const sg of rating.suggestions) {
        response += `• ${sg}\n`;
      }
    }

    const tips = result.foods
      .filter(f => f.improvementTip)
      .map(f => `• ${f.nameLocal || f.name}: ${f.improvementTip}`);
    if (tips.length > 0) {
      response += `\n*${t.nextTime[language]}*\n${tips.join('\n')}\n`;
    }

    return response;
  }

  /**
   * Pick the single most relevant tip (language-aware)
   */
  private getTopTip(result: FoodRecognitionResult, rating: HealthRating, lang: Lang): string | null {
    const poorFactor = rating.factors.find(f => f.status === 'poor');
    if (poorFactor) {
      if (poorFactor.message.toLowerCase().includes('sodium') || poorFactor.message.includes('钠')) {
        return lang === 'en' ? 'Drink water to flush sodium' :
               lang === 'zh-CN' ? '多喝水帮助排钠' : '多喝水幫助排鈉';
      }
      if (poorFactor.message.toLowerCase().includes('fat') || poorFactor.message.includes('脂肪')) {
        return lang === 'en' ? 'Take a short walk after eating' :
               lang === 'zh-CN' ? '饭后散步消化一下' : '飯後散步消化一下';
      }
    }

    const tip = result.foods[0]?.improvementTip;
    if (tip) return tip;

    if (rating.suggestions.length > 0) return rating.suggestions[0];

    if (rating.score >= 80) {
      return lang === 'en' ? 'Great choice, keep it up!' :
             lang === 'zh-CN' ? '选得不错，继续保持！' : '選得不錯，繼續保持！';
    }
    return null;
  }

  private getScoreEmoji(score: number): string {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  }
}

export const responseFormatterSG = new ResponseFormatterSG();
