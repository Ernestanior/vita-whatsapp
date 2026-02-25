/**
 * DailyDigestGenerator - Generates personalized daily health summaries
 * 
 * Responsibilities:
 * - Aggregate daily food records
 * - Calculate nutrition totals and health score
 * - Generate insights based on user goals
 * - Provide personalized recommendations
 * - Calculate exercise suggestions for excess calories
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */

import { createClient } from '@/lib/supabase/server';
import { profileManager } from '@/lib/profile/profile-manager';
import { ratingEngine } from '@/lib/rating/rating-engine';
import { analyzeProteinDistribution, formatDistribution } from '@/lib/protein-distribution';
import { logger } from '@/utils/logger';
import type { DailyDigest, HealthProfile, FoodRecognitionResult, HealthRating } from '@/types';

export interface FoodRecordData {
  id: string;
  userId: string;
  recognitionResult: FoodRecognitionResult;
  healthRating: HealthRating;
  createdAt: Date;
}

export class DailyDigestGenerator {
  /**
   * Generate daily digest for a user
   * Requirements: 6.2, 6.3, 6.4, 6.5
   */
  async generateDigest(userId: string, date: string): Promise<DailyDigest> {
    logger.info({ userId, date }, 'Generating daily digest');

    try {
      // 1. Get user's food records for the day
      const records = await this.getFoodRecords(userId, date);

      // 2. If no records, return empty day message
      if (records.length === 0) {
        return this.generateEmptyDayDigest(userId, date);
      }

      // 3. Get user profile
      const dbProfile = await profileManager.getProfile(userId);
      if (!dbProfile) {
        throw new Error('User profile not found');
      }

      // Convert database profile to expected format
      const profile: HealthProfile = {
        userId: dbProfile.user_id,
        height: dbProfile.height,
        weight: dbProfile.weight,
        age: dbProfile.age || undefined,
        gender: dbProfile.gender || undefined,
        goal: dbProfile.goal,
        activityLevel: dbProfile.activity_level,
        trainingType: dbProfile.training_type || 'none',
        proteinTarget: dbProfile.protein_target || undefined,
        carbTarget: dbProfile.carb_target || undefined,
        digestTime: dbProfile.digest_time,
        quickMode: dbProfile.quick_mode,
        createdAt: dbProfile.created_at,
        updatedAt: dbProfile.updated_at,
      };

      // 4. Calculate daily target
      const target = ratingEngine.calculateDailyTarget(profile);

      // 5. Aggregate nutrition data
      const summary = this.aggregateData(records);

      // 6. Generate insights
      const insights = this.generateInsights(summary, target, profile);

      // 7. Generate recommendations
      const recommendations = this.generateRecommendations(summary, target, profile);

      // 8. Generate exercise suggestion
      const exerciseSuggestion = this.generateExerciseSuggestion(
        summary.totalCalories,
        target.calories
      );

      // 9. Protein distribution analysis
      const proteinDistribution = analyzeProteinDistribution(
        records.map(r => ({
          protein: (r.recognitionResult.totalNutrition.protein.min + r.recognitionResult.totalNutrition.protein.max) / 2,
          createdAt: r.createdAt,
        }))
      );

      // 10. Add protein distribution insight
      if (proteinDistribution.evenness < 40 && summary.nutritionBreakdown.protein > 0) {
        insights.push('⚖️ Protein is unevenly spread — try to distribute it more evenly across meals for better absorption.');
      } else if (proteinDistribution.evenness >= 80 && summary.nutritionBreakdown.protein > 0) {
        insights.push('⚖️ Great protein distribution across meals!');
      }

      logger.info({ userId, date, mealsCount: records.length }, 'Daily digest generated');

      return {
        userId,
        date,
        summary,
        insights,
        recommendations,
        exerciseSuggestion,
        target: {
          calories: target.calories,
          protein: target.protein,
          carbs: target.carbs,
        },
        proteinDistribution,
      };
    } catch (error) {
      logger.error({ error, userId, date }, 'Failed to generate daily digest');
      throw error;
    }
  }

  /**
   * Get food records for a specific date
   */
  private async getFoodRecords(userId: string, date: string): Promise<FoodRecordData[]> {
    const supabase: any = await createClient();

    // Parse date and get start/end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('food_records')
      .select('id, user_id, recognition_result, health_rating, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch food records: ${error.message}`);
    }

    return (data || []).map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      recognitionResult: record.recognition_result,
      healthRating: record.health_rating,
      createdAt: new Date(record.created_at),
    }));
  }

  /**
   * Aggregate nutrition data from all records
   */
  private aggregateData(records: FoodRecordData[]): DailyDigest['summary'] {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalSodium = 0;

    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;

    let totalScore = 0;

    for (const record of records) {
      const nutrition = record.recognitionResult.totalNutrition;
      const rating = record.healthRating;

      // Use average of min/max for totals
      totalCalories += (nutrition.calories.min + nutrition.calories.max) / 2;
      totalProtein += (nutrition.protein.min + nutrition.protein.max) / 2;
      totalCarbs += (nutrition.carbs.min + nutrition.carbs.max) / 2;
      totalFat += (nutrition.fat.min + nutrition.fat.max) / 2;
      totalSodium += (nutrition.sodium.min + nutrition.sodium.max) / 2;

      // Count ratings
      if (rating.overall === 'green') greenCount++;
      else if (rating.overall === 'yellow') yellowCount++;
      else if (rating.overall === 'red') redCount++;

      // Sum scores
      totalScore += rating.score;
    }

    // Calculate average health score
    const healthScore = Math.round(totalScore / records.length);

    return {
      totalCalories: Math.round(totalCalories),
      mealsCount: records.length,
      nutritionBreakdown: {
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat),
        sodium: Math.round(totalSodium),
      },
      healthScore,
      ratingDistribution: {
        green: greenCount,
        yellow: yellowCount,
        red: redCount,
      },
    };
  }

  /**
   * Generate insights based on data and user profile
   * Requirements: 6.3
   */
  private generateInsights(
    summary: DailyDigest['summary'],
    target: any,
    profile: HealthProfile
  ): string[] {
    const insights: string[] = [];

    // 1. Calorie comparison
    const caloriesDiff = summary.totalCalories - target.calories;
    const caloriesPercent = (Math.abs(caloriesDiff) / target.calories) * 100;

    if (Math.abs(caloriesDiff) < target.calories * 0.1) {
      // Within 10% of target
      insights.push(`✅ Great job! Your calorie intake (${summary.totalCalories} kcal) is right on target.`);
    } else if (caloriesDiff > 0) {
      // Over target
      insights.push(
        `📊 You consumed ${Math.abs(Math.round(caloriesDiff))} kcal more than your target (${Math.round(caloriesPercent)}% over).`
      );
    } else {
      // Under target
      insights.push(
        `📊 You consumed ${Math.abs(Math.round(caloriesDiff))} kcal less than your target (${Math.round(caloriesPercent)}% under).`
      );
    }

    // 2. Protein analysis
    const proteinDiff = summary.nutritionBreakdown.protein - target.protein;
    if (proteinDiff < -10) {
      insights.push(`🥩 Protein intake is low (${summary.nutritionBreakdown.protein}g vs ${Math.round(target.protein)}g target).`);
    } else if (proteinDiff > 10) {
      insights.push(`🥩 Excellent protein intake (${summary.nutritionBreakdown.protein}g)!`);
    }

    // 3. Sodium analysis
    if (summary.nutritionBreakdown.sodium > 2000) {
      const excess = summary.nutritionBreakdown.sodium - 2000;
      insights.push(`🧂 Sodium intake is high (${summary.nutritionBreakdown.sodium}mg, ${excess}mg over WHO recommendation).`);
    } else if (summary.nutritionBreakdown.sodium < 1500) {
      insights.push(`🧂 Good job keeping sodium low (${summary.nutritionBreakdown.sodium}mg)!`);
    }

    // 4. Health score analysis
    if (summary.healthScore >= 80) {
      insights.push(`⭐ Excellent health score today (${summary.healthScore}/100)! Keep it up!`);
    } else if (summary.healthScore >= 60) {
      insights.push(`💪 Decent health score (${summary.healthScore}/100). Room for improvement!`);
    } else {
      insights.push(`⚠️ Health score needs attention (${summary.healthScore}/100). Let's do better tomorrow!`);
    }

    // 5. Rating distribution
    if (summary.ratingDistribution.green === summary.mealsCount) {
      insights.push(`🟢 Perfect! All ${summary.mealsCount} meals were healthy choices!`);
    } else if (summary.ratingDistribution.red > summary.mealsCount / 2) {
      insights.push(`🔴 More than half of your meals were unhealthy. Focus on better choices tomorrow.`);
    }

    // 6. Goal-specific insights
    if (profile.goal === 'lose-weight') {
      if (caloriesDiff <= 0) {
        insights.push(`🎯 You're on track with your weight loss goal! Calorie deficit achieved.`);
      } else {
        insights.push(`🎯 To support weight loss, try to stay within your calorie target.`);
      }
    } else if (profile.goal === 'gain-muscle') {
      if (summary.nutritionBreakdown.protein >= target.protein) {
        insights.push(`🎯 Great protein intake for muscle building!`);
      } else {
        insights.push(`🎯 Increase protein intake to support muscle growth.`);
      }
    } else if (profile.goal === 'control-sugar') {
      if (summary.nutritionBreakdown.carbs < target.carbs * 0.9) {
        insights.push(`🎯 Good carb control today!`);
      }
    }

    return insights;
  }

  /**
   * Generate personalized recommendations
   * Requirements: 6.4
   */
  private generateRecommendations(
    summary: DailyDigest['summary'],
    target: any,
    profile: HealthProfile
  ): string[] {
    const recommendations: string[] = [];

    // 1. Calorie-based recommendations
    const caloriesDiff = summary.totalCalories - target.calories;

    if (caloriesDiff > 200) {
      recommendations.push('Consider smaller portions or lighter meals tomorrow');
      recommendations.push('Increase vegetable intake to feel full with fewer calories');
    } else if (caloriesDiff < -200) {
      recommendations.push('Make sure you\'re eating enough to maintain energy levels');
      if (profile.goal === 'gain-muscle') {
        recommendations.push('Add healthy snacks between meals to reach your calorie target');
      }
    }

    // 2. Protein recommendations
    if (summary.nutritionBreakdown.protein < target.protein * 0.8) {
      recommendations.push('Add more protein sources: lean meat, fish, tofu, eggs, or legumes');
    }

    // 3. Sodium recommendations
    if (summary.nutritionBreakdown.sodium > 2000) {
      recommendations.push('Reduce soy sauce, soup, and processed foods');
      recommendations.push('Drink plenty of water to help flush excess sodium');
    }

    // 4. Balance recommendations
    const totalMacros = summary.nutritionBreakdown.protein + summary.nutritionBreakdown.carbs + summary.nutritionBreakdown.fat;
    const carbsPercent = (summary.nutritionBreakdown.carbs / totalMacros) * 100;

    if (carbsPercent > 60) {
      recommendations.push('Balance your meals with more protein and healthy fats');
      recommendations.push('Choose whole grains over refined carbs');
    }

    // 5. Rating-based recommendations
    if (summary.ratingDistribution.red > 0) {
      recommendations.push('Plan your meals ahead to make healthier choices');
      recommendations.push('Cook at home more often for better control over ingredients');
    }

    // 6. Goal-specific recommendations
    if (profile.goal === 'lose-weight') {
      recommendations.push('Eat slowly and stop when 80% full');
      recommendations.push('Avoid late-night snacking');
    } else if (profile.goal === 'gain-muscle') {
      recommendations.push('Eat protein within 2 hours after exercise');
      recommendations.push('Don\'t skip meals - consistency is key');
    } else if (profile.goal === 'control-sugar') {
      recommendations.push('Choose low-GI foods: whole grains, vegetables, legumes');
      recommendations.push('Avoid sugary drinks and desserts');
    }

    // Limit to top 4-5 most relevant recommendations
    return recommendations.slice(0, 5);
  }

  /**
   * Generate exercise suggestion for excess calories
   * Requirements: 6.5
   */
  private generateExerciseSuggestion(
    consumed: number,
    target: number
  ): string | undefined {
    const excess = consumed - target;

    // Only suggest exercise if significantly over target (>100 kcal)
    if (excess <= 100) {
      return undefined;
    }

    // Calculate exercise equivalents
    // Running: ~60 kcal per km
    // Walking: ~40 kcal per 1000 steps
    // Cycling: ~50 kcal per km
    const runningKm = Math.ceil(excess / 60);
    const walkingSteps = Math.ceil(excess / 40) * 1000;
    const cyclingKm = Math.ceil(excess / 50);

    return `🏃 You consumed ${excess} extra calories today. To burn them off, you could:\n\n` +
           `• Run ${runningKm} km, or\n` +
           `• Walk ${walkingSteps.toLocaleString()} steps, or\n` +
           `• Cycle ${cyclingKm} km\n\n` +
           `Remember: Consistency matters more than perfection! 💪`;
  }

  /**
   * Generate digest for days with no food records
   * Requirements: 6.6
   */
  private generateEmptyDayDigest(userId: string, date: string): DailyDigest {
    return {
      userId,
      date,
      summary: {
        totalCalories: 0,
        mealsCount: 0,
        nutritionBreakdown: {
          protein: 0,
          carbs: 0,
          fat: 0,
          sodium: 0,
        },
        healthScore: 0,
        ratingDistribution: {
          green: 0,
          yellow: 0,
          red: 0,
        },
      },
      insights: [
        '📭 No meals recorded today.',
        '💡 Remember to track your meals for better health insights!',
      ],
      recommendations: [
        'Start tomorrow by tracking your breakfast',
        'Consistent tracking helps you reach your health goals',
        'Even small meals count - track everything!',
      ],
      exerciseSuggestion: undefined,
    };
  }

  /**
   * Format digest as WhatsApp message
   */
  formatDigestMessage(digest: DailyDigest, language: 'en' | 'zh-CN' | 'zh-TW' = 'en'): string {
    if (digest.summary.mealsCount === 0) {
      return this.formatEmptyDayMessage(digest, language);
    }

    const messages = {
      'en': this.formatEnglishDigest(digest),
      'zh-CN': this.formatChineseDigest(digest),
      'zh-TW': this.formatTraditionalChineseDigest(digest),
    };

    return messages[language];
  }

  /**
   * Format empty day message
   */
  private formatEmptyDayMessage(digest: DailyDigest, language: 'en' | 'zh-CN' | 'zh-TW'): string {
    const messages = {
      'en': `📅 Daily Summary - ${digest.date}

${digest.insights.join('\n')}

${digest.recommendations.join('\n')}

See you tomorrow! 🌟`,

      'zh-CN': `📅 每日总结 - ${digest.date}

${digest.insights.join('\n')}

${digest.recommendations.join('\n')}

明天见！🌟`,

      'zh-TW': `📅 每日總結 - ${digest.date}

${digest.insights.join('\n')}

${digest.recommendations.join('\n')}

明天見！🌟`,
    };

    return messages[language];
  }

  /**
   * Generate a text progress bar for WhatsApp
   * e.g. "▓▓▓▓▓▓░░░░ 60%"
   */
  private progressBar(current: number, target: number, width: number = 8): string {
    const pct = Math.min(Math.round((current / target) * 100), 999);
    const filled = Math.min(Math.round((current / target) * width), width);
    const empty = width - filled;
    const over = pct > 100;
    return `${'▓'.repeat(filled)}${'░'.repeat(empty)} ${pct}%${over ? ' ⚠️' : ''}`;
  }

  /**
   * Format English digest
   */
  private formatEnglishDigest(digest: DailyDigest): string {
    const { summary } = digest;

    let message = `📅 Daily Health Summary - ${digest.date}\n\n`;

    // Summary section
    message += `📊 Today's Overview:\n`;
    message += `• Meals tracked: ${summary.mealsCount}\n`;
    message += `• Health score: ${summary.healthScore}/100\n`;
    message += `• Ratings: `;
    message += `🟢${summary.ratingDistribution.green} `;
    message += `🟡${summary.ratingDistribution.yellow} `;
    message += `🔴${summary.ratingDistribution.red}\n\n`;

    // Nutrition breakdown with progress bars
    const t = digest.target;
    message += `🍽️ Nutrition Breakdown:\n`;
    if (t) {
      message += `• Cal: ${summary.totalCalories}/${t.calories} kcal ${this.progressBar(summary.totalCalories, t.calories)}\n`;
      message += `• Protein: ${summary.nutritionBreakdown.protein}/${t.protein}g ${this.progressBar(summary.nutritionBreakdown.protein, t.protein)}\n`;
      message += `• Carbs: ${summary.nutritionBreakdown.carbs}/${t.carbs}g ${this.progressBar(summary.nutritionBreakdown.carbs, t.carbs)}\n`;
      message += `• Fat: ${summary.nutritionBreakdown.fat}g\n`;
      message += `• Sodium: ${summary.nutritionBreakdown.sodium}mg\n\n`;
    } else {
      message += `• Protein: ${summary.nutritionBreakdown.protein}g\n`;
      message += `• Carbs: ${summary.nutritionBreakdown.carbs}g\n`;
      message += `• Fat: ${summary.nutritionBreakdown.fat}g\n`;
      message += `• Sodium: ${summary.nutritionBreakdown.sodium}mg\n\n`;
    }

    // Protein distribution (P2-12)
    if (digest.proteinDistribution && summary.nutritionBreakdown.protein > 0) {
      message += formatDistribution(digest.proteinDistribution, 'en') + '\n\n';
    }

    // Insights
    if (digest.insights.length > 0) {
      message += `💡 Key Insights:\n`;
      digest.insights.forEach(insight => {
        message += `${insight}\n`;
      });
      message += `\n`;
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      message += `🎯 Recommendations:\n`;
      digest.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });
      message += `\n`;
    }

    // Exercise suggestion
    if (digest.exerciseSuggestion) {
      message += `${digest.exerciseSuggestion}\n\n`;
    }

    message += `Keep up the great work! 🌟`;

    return message;
  }

  /**
   * Format Chinese (Simplified) digest
   */
  private formatChineseDigest(digest: DailyDigest): string {
    const { summary } = digest;

    let message = `📅 每日健康总结 - ${digest.date}\n\n`;

    // Summary section
    message += `📊 今日概览：\n`;
    message += `• 记录餐数：${summary.mealsCount}\n`;
    message += `• 健康评分：${summary.healthScore}/100\n`;
    message += `• 评级分布：`;
    message += `🟢${summary.ratingDistribution.green} `;
    message += `🟡${summary.ratingDistribution.yellow} `;
    message += `🔴${summary.ratingDistribution.red}\n\n`;

    // Nutrition breakdown with progress bars
    const t = digest.target;
    message += `🍽️ 营养摄入：\n`;
    if (t) {
      message += `• 热量：${summary.totalCalories}/${t.calories}千卡 ${this.progressBar(summary.totalCalories, t.calories)}\n`;
      message += `• 蛋白质：${summary.nutritionBreakdown.protein}/${t.protein}克 ${this.progressBar(summary.nutritionBreakdown.protein, t.protein)}\n`;
      message += `• 碳水：${summary.nutritionBreakdown.carbs}/${t.carbs}克 ${this.progressBar(summary.nutritionBreakdown.carbs, t.carbs)}\n`;
      message += `• 脂肪：${summary.nutritionBreakdown.fat}克\n`;
      message += `• 钠：${summary.nutritionBreakdown.sodium}毫克\n\n`;
    } else {
      message += `• 蛋白质：${summary.nutritionBreakdown.protein}克\n`;
      message += `• 碳水化合物：${summary.nutritionBreakdown.carbs}克\n`;
      message += `• 脂肪：${summary.nutritionBreakdown.fat}克\n`;
      message += `• 钠：${summary.nutritionBreakdown.sodium}毫克\n\n`;
    }

    // Protein distribution (P2-12)
    if (digest.proteinDistribution && summary.nutritionBreakdown.protein > 0) {
      message += formatDistribution(digest.proteinDistribution, 'zh-CN') + '\n\n';
    }

    // Insights
    if (digest.insights.length > 0) {
      message += `💡 关键洞察：\n`;
      digest.insights.forEach(insight => {
        message += `${insight}\n`;
      });
      message += `\n`;
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      message += `🎯 建议：\n`;
      digest.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });
      message += `\n`;
    }

    // Exercise suggestion
    if (digest.exerciseSuggestion) {
      message += `${digest.exerciseSuggestion}\n\n`;
    }

    message += `继续保持！🌟`;

    return message;
  }

  /**
   * Format Chinese (Traditional) digest
   */
  private formatTraditionalChineseDigest(digest: DailyDigest): string {
    const { summary } = digest;

    let message = `📅 每日健康總結 - ${digest.date}\n\n`;

    // Summary section
    message += `📊 今日概覽：\n`;
    message += `• 記錄餐數：${summary.mealsCount}\n`;
    message += `• 健康評分：${summary.healthScore}/100\n`;
    message += `• 評級分佈：`;
    message += `🟢${summary.ratingDistribution.green} `;
    message += `🟡${summary.ratingDistribution.yellow} `;
    message += `🔴${summary.ratingDistribution.red}\n\n`;

    // Nutrition breakdown with progress bars
    const t = digest.target;
    message += `🍽️ 營養攝入：\n`;
    if (t) {
      message += `• 熱量：${summary.totalCalories}/${t.calories}千卡 ${this.progressBar(summary.totalCalories, t.calories)}\n`;
      message += `• 蛋白質：${summary.nutritionBreakdown.protein}/${t.protein}克 ${this.progressBar(summary.nutritionBreakdown.protein, t.protein)}\n`;
      message += `• 碳水：${summary.nutritionBreakdown.carbs}/${t.carbs}克 ${this.progressBar(summary.nutritionBreakdown.carbs, t.carbs)}\n`;
      message += `• 脂肪：${summary.nutritionBreakdown.fat}克\n`;
      message += `• 鈉：${summary.nutritionBreakdown.sodium}毫克\n\n`;
    } else {
      message += `• 蛋白質：${summary.nutritionBreakdown.protein}克\n`;
      message += `• 碳水化合物：${summary.nutritionBreakdown.carbs}克\n`;
      message += `• 脂肪：${summary.nutritionBreakdown.fat}克\n`;
      message += `• 鈉：${summary.nutritionBreakdown.sodium}毫克\n\n`;
    }

    // Protein distribution (P2-12)
    if (digest.proteinDistribution && summary.nutritionBreakdown.protein > 0) {
      message += formatDistribution(digest.proteinDistribution, 'zh-TW') + '\n\n';
    }

    // Insights
    if (digest.insights.length > 0) {
      message += `💡 關鍵洞察：\n`;
      digest.insights.forEach(insight => {
        message += `${insight}\n`;
      });
      message += `\n`;
    }

    // Recommendations
    if (digest.recommendations.length > 0) {
      message += `🎯 建議：\n`;
      digest.recommendations.forEach((rec, index) => {
        message += `${index + 1}. ${rec}\n`;
      });
      message += `\n`;
    }

    // Exercise suggestion
    if (digest.exerciseSuggestion) {
      message += `${digest.exerciseSuggestion}\n\n`;
    }

    message += `繼續保持！🌟`;

    return message;
  }
}

// Singleton instance
export const dailyDigestGenerator = new DailyDigestGenerator();
