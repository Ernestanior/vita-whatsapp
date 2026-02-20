// @ts-nocheck
/**
 * 智能上下文管理器
 * 处理用餐场景推断、用户偏好学习、智能推荐、饮食模式学习
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type MealScene = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSceneInfo {
  scene: MealScene;
  confidence: number;
  timeRange: string;
}

export interface UserPreference {
  foodName: string;
  frequency: number;
  lastEaten: string;
  avgRating: number;
}

export interface FoodRecommendation {
  foodName: string;
  reason: string;
  nutritionGap?: string;
  estimatedCalories: number;
}

export interface DietaryPattern {
  userId: string;
  typicalBreakfastTime: string | null;
  typicalLunchTime: string | null;
  typicalDinnerTime: string | null;
  avgMealsPerDay: number;
  lastUpdated: string;
}

export class ContextManager {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 推断用餐场景
   * 需求 16.1: 基于时间自动推断用餐场景
   */
  inferMealScene(timestamp: Date = new Date()): MealSceneInfo {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // 早餐: 6:00-10:00 (360-600 分钟)
    if (timeInMinutes >= 360 && timeInMinutes < 600) {
      return {
        scene: 'breakfast',
        confidence: this.calculateConfidence(timeInMinutes, 360, 600, 480), // 峰值 8:00
        timeRange: '6:00 AM - 10:00 AM',
      };
    }

    // 午餐: 11:00-14:00 (660-840 分钟)
    if (timeInMinutes >= 660 && timeInMinutes < 840) {
      return {
        scene: 'lunch',
        confidence: this.calculateConfidence(timeInMinutes, 660, 840, 750), // 峰值 12:30
        timeRange: '11:00 AM - 2:00 PM',
      };
    }

    // 晚餐: 17:00-21:00 (1020-1260 分钟)
    if (timeInMinutes >= 1020 && timeInMinutes < 1260) {
      return {
        scene: 'dinner',
        confidence: this.calculateConfidence(timeInMinutes, 1020, 1260, 1140), // 峰值 19:00
        timeRange: '5:00 PM - 9:00 PM',
      };
    }

    // 其他时间为加餐
    return {
      scene: 'snack',
      confidence: 0.7,
      timeRange: 'Other times',
    };
  }

  /**
   * 计算置信度（基于正态分布）
   */
  private calculateConfidence(
    current: number,
    start: number,
    end: number,
    peak: number
  ): number {
    // 在峰值时间置信度最高 (0.95)
    // 在边界时间置信度较低 (0.7)
    const distanceFromPeak = Math.abs(current - peak);
    const maxDistance = Math.max(peak - start, end - peak);
    const confidence = 0.95 - (distanceFromPeak / maxDistance) * 0.25;
    return Math.max(0.7, Math.min(0.95, confidence));
  }

  /**
   * 记录用户偏好
   * 需求 16.2: 记录用户常吃的食物
   */
  async recordUserPreference(
    userId: string,
    foodName: string,
    rating: number
  ): Promise<boolean> {
    try {
      // 检查是否已存在该食物的偏好记录
      const { data: existing } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('food_name', foodName)
        .single();

      if (existing) {
        // 更新现有记录
        const newFrequency = existing.frequency + 1;
        const newAvgRating =
          (existing.avg_rating * existing.frequency + rating) / newFrequency;

        const { error } = await this.supabase
          .from('user_preferences')
          .update({
            frequency: newFrequency,
            avg_rating: newAvgRating,
            last_eaten: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // 创建新记录
        const { error } = await this.supabase.from('user_preferences').insert({
          user_id: userId,
          food_name: foodName,
          frequency: 1,
          avg_rating: rating,
          last_eaten: new Date().toISOString(),
        });

        if (error) throw error;
      }

      logger.info('User preference recorded', { userId, foodName, rating });
      return true;
    } catch (error) {
      logger.error('Error recording user preference', { error, userId, foodName });
      return false;
    }
  }

  /**
   * 获取用户偏好
   * 需求 16.2: 在评价时考虑用户偏好
   */
  async getUserPreferences(
    userId: string,
    limit: number = 10
  ): Promise<UserPreference[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('frequency', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((pref: any) => ({
        foodName: pref.food_name,
        frequency: pref.frequency,
        lastEaten: pref.last_eaten,
        avgRating: pref.avg_rating,
      }));
    } catch (error) {
      logger.error('Error getting user preferences', { error, userId });
      return [];
    }
  }

  /**
   * 检查是否为用户偏好食物
   */
  async isPreferredFood(userId: string, foodName: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('frequency')
        .eq('user_id', userId)
        .eq('food_name', foodName)
        .single();

      // 如果吃过3次以上，认为是偏好食物
      return data ? data.frequency >= 3 : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成智能推荐
   * 需求 16.3, 16.4: 基于历史偏好和营养缺口推荐食物
   */
  async generateRecommendations(
    userId: string,
    mealScene: MealScene,
    limit: number = 3
  ): Promise<FoodRecommendation[]> {
    try {
      const recommendations: FoodRecommendation[] = [];

      // 1. 获取用户偏好
      const preferences = await this.getUserPreferences(userId, 20);

      // 2. 获取今日营养摄入
      const todayNutrition = await this.getTodayNutrition(userId);

      // 3. 获取用户健康画像
      const { data: profile } = await this.supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return [];
      }

      // 4. 计算营养缺口
      const dailyTarget = this.calculateDailyTarget(profile);
      const nutritionGaps = this.calculateNutritionGaps(todayNutrition, dailyTarget);

      // 5. 基于偏好推荐（如果有偏好且营养合理）
      for (const pref of preferences.slice(0, 2)) {
        if (pref.avgRating >= 3) {
          recommendations.push({
            foodName: pref.foodName,
            reason: `You've enjoyed this ${pref.frequency} times before`,
            estimatedCalories: 0, // 需要从历史记录中获取
          });
        }
      }

      // 6. 基于营养缺口推荐新加坡食物
      if (nutritionGaps.protein > 20) {
        recommendations.push({
          foodName: mealScene === 'breakfast' ? 'Kaya Toast with Eggs' : 'Chicken Rice',
          reason: 'High in protein to meet your daily goal',
          nutritionGap: 'protein',
          estimatedCalories: mealScene === 'breakfast' ? 350 : 500,
        });
      }

      if (nutritionGaps.fiber > 10) {
        recommendations.push({
          foodName: 'Mixed Vegetable Rice',
          reason: 'Rich in fiber and vegetables',
          nutritionGap: 'fiber',
          estimatedCalories: 450,
        });
      }

      // 7. 限制推荐数量
      return recommendations.slice(0, limit);
    } catch (error) {
      logger.error('Error generating recommendations', { error, userId });
      return [];
    }
  }

  /**
   * 获取今日营养摄入
   */
  private async getTodayNutrition(userId: string): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data } = await this.supabase
        .from('food_records')
        .select('calories, sodium, fat, protein, fiber')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (!data || data.length === 0) {
        return { calories: 0, sodium: 0, fat: 0, protein: 0, fiber: 0 };
      }

      return data.reduce(
        (acc, record) => ({
          calories: acc.calories + (record.calories || 0),
          sodium: acc.sodium + (record.sodium || 0),
          fat: acc.fat + (record.fat || 0),
          protein: acc.protein + (record.protein || 0),
          fiber: acc.fiber + (record.fiber || 0),
        }),
        { calories: 0, sodium: 0, fat: 0, protein: 0, fiber: 0 }
      );
    } catch (error) {
      logger.error('Error getting today nutrition', { error, userId });
      return { calories: 0, sodium: 0, fat: 0, protein: 0, fiber: 0 };
    }
  }

  /**
   * 计算每日目标
   */
  private calculateDailyTarget(profile: any): any {
    // 使用 Mifflin-St Jeor 公式计算基础代谢率
    const bmr =
      profile.gender === 'male'
        ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
        : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * (activityMultipliers[profile.activity_level] || 1.2);

    return {
      calories: Math.round(tdee),
      protein: Math.round(profile.weight * 1.6), // 1.6g per kg
      fiber: 25, // 推荐每日摄入量
      sodium: 2000, // mg
      fat: Math.round((tdee * 0.3) / 9), // 30% 来自脂肪
    };
  }

  /**
   * 计算营养缺口
   */
  private calculateNutritionGaps(current: any, target: any): any {
    return {
      calories: Math.max(0, target.calories - current.calories),
      protein: Math.max(0, target.protein - current.protein),
      fiber: Math.max(0, target.fiber - current.fiber),
      sodium: Math.max(0, target.sodium - current.sodium),
      fat: Math.max(0, target.fat - current.fat),
    };
  }

  /**
   * 学习用户饮食模式
   * 需求 16.6: 学习用户的饮食模式
   */
  async learnDietaryPattern(userId: string): Promise<DietaryPattern | null> {
    try {
      // 获取最近30天的食物记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: records } = await this.supabase
        .from('food_records')
        .select('created_at, meal_scene')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!records || records.length === 0) {
        return null;
      }

      // 分析用餐时间模式
      const breakfastTimes: number[] = [];
      const lunchTimes: number[] = [];
      const dinnerTimes: number[] = [];
      const daysWithMeals = new Set<string>();

      records.forEach((record) => {
        const date = new Date(record.created_at);
        const hour = date.getHours();
        const minute = date.getMinutes();
        const timeInMinutes = hour * 60 + minute;
        const dateStr = date.toISOString().split('T')[0];

        daysWithMeals.add(dateStr);

        if (record.meal_scene === 'breakfast') {
          breakfastTimes.push(timeInMinutes);
        } else if (record.meal_scene === 'lunch') {
          lunchTimes.push(timeInMinutes);
        } else if (record.meal_scene === 'dinner') {
          dinnerTimes.push(timeInMinutes);
        }
      });

      // 计算平均用餐时间
      const avgBreakfast = this.calculateAverageTime(breakfastTimes);
      const avgLunch = this.calculateAverageTime(lunchTimes);
      const avgDinner = this.calculateAverageTime(dinnerTimes);

      // 计算平均每日用餐次数
      const avgMealsPerDay = records.length / daysWithMeals.size;

      const pattern: DietaryPattern = {
        userId,
        typicalBreakfastTime: avgBreakfast,
        typicalLunchTime: avgLunch,
        typicalDinnerTime: avgDinner,
        avgMealsPerDay: Math.round(avgMealsPerDay * 10) / 10,
        lastUpdated: new Date().toISOString(),
      };

      // 保存到数据库
      await this.supabase.from('dietary_patterns').upsert({
        user_id: userId,
        typical_breakfast_time: avgBreakfast,
        typical_lunch_time: avgLunch,
        typical_dinner_time: avgDinner,
        avg_meals_per_day: pattern.avgMealsPerDay,
        updated_at: pattern.lastUpdated,
      });

      logger.info('Dietary pattern learned', { userId, pattern });
      return pattern;
    } catch (error) {
      logger.error('Error learning dietary pattern', { error, userId });
      return null;
    }
  }

  /**
   * 计算平均时间
   */
  private calculateAverageTime(times: number[]): string | null {
    if (times.length === 0) return null;

    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const hours = Math.floor(avg / 60);
    const minutes = Math.round(avg % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * 获取附近的健康餐饮推荐
   * 需求 16.5: 位置推荐（可选）
   */
  async getNearbyHealthyOptions(
    latitude: number,
    longitude: number,
    radius: number = 1000, // 米
    limit: number = 5
  ): Promise<{
    name: string;
    address: string;
    distance: number;
    healthScore: number;
    cuisine: string;
  }[]> {
    try {
      // 这是一个简化的实现
      // 实际应用中需要集成 Google Places API 或其他地图服务
      
      // 新加坡健康餐厅数据库（示例 - 扩展版）
      const healthyRestaurants = [
        {
          name: 'SaladStop!',
          lat: 1.2966,
          lng: 103.8558,
          address: 'Multiple locations',
          healthScore: 9,
          cuisine: 'Salads & Healthy Bowls',
          recommendation: 'Signature Salads',
        },
        {
          name: 'Grain Traders',
          lat: 1.2789,
          lng: 103.8489,
          address: 'Raffles Place',
          healthScore: 8,
          cuisine: 'Grain Bowls',
          recommendation: 'Custom Bowls',
        },
        {
          name: 'The Soup Spoon',
          lat: 1.2833,
          lng: 103.8607,
          address: 'Marina Bay',
          healthScore: 7,
          cuisine: 'Soups & Salads',
          recommendation: 'Low-calorie Soups',
        },
        {
          name: 'Stuff\'d',
          lat: 1.3000,
          lng: 103.8390,
          address: 'Orchard Road',
          healthScore: 7,
          cuisine: 'Mexican/Turkish',
          recommendation: 'Daily Bowl with Chicken',
        },
        {
          name: 'Healthier Hawker Stall (Example)',
          lat: 1.2810,
          lng: 103.8440,
          address: 'Maxwell Food Centre',
          healthScore: 8,
          cuisine: 'Local Food',
          recommendation: 'Sliced Fish Soup (No Milk)',
        },
      ];

      // 计算距离并排序
      const nearby = healthyRestaurants
        .map((restaurant) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            restaurant.lat,
            restaurant.lng
          );
          return {
            name: restaurant.name,
            address: restaurant.address,
            distance: Math.round(distance),
            healthScore: restaurant.healthScore,
            cuisine: restaurant.cuisine,
            recommendation: (restaurant as any).recommendation,
          };
        })
        .filter((r) => r.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      logger.info('Nearby healthy options retrieved', {
        latitude,
        longitude,
        count: nearby.length,
      });

      return nearby;
    } catch (error) {
      logger.error('Error getting nearby healthy options', { error });
      return [];
    }
  }

  /**
   * 计算两点之间的距离（Haversine 公式）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 检查是否需要提醒用户
   * 需求 16.6: 在异常时提醒用户
   */
  async checkMealReminder(
    userId: string,
    recordedScenes?: Set<string>
  ): Promise<{
    shouldRemind: boolean;
    message?: string;
    mealType?: MealScene;
  }> {
    try {
      // 获取用户饮食模式
      const { data: pattern } = await this.supabase
        .from('dietary_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!pattern) {
        return { shouldRemind: false };
      }

      // 获取今天的记录
      let scenes: Set<string>;
      if (!recordedScenes) {
        const today = new Date().toISOString().split('T')[0];
        const { data: records } = await this.supabase
          .from('food_records')
          .select('meal_scene')
          .eq('user_id', userId)
          .gte('created_at', `${today}T00:00:00`)
          .lt('created_at', `${today}T23:59:59`);

        scenes = new Set(records?.map((r: any) => r.meal_scene) || []);
      } else {
        scenes = recordedScenes;
      }

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Helper: parse "HH:MM" to minutes
      const parseTime = (t: string | null): number | null => {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
      };

      // Check each meal: remind 15 min before typical time, within a 30-min window
      const meals: { type: MealScene; time: string | null }[] = [
        { type: 'breakfast', time: pattern.typical_breakfast_time },
        { type: 'lunch', time: pattern.typical_lunch_time },
        { type: 'dinner', time: pattern.typical_dinner_time },
      ];

      for (const meal of meals) {
        const typicalMinutes = parseTime(meal.time);
        if (!typicalMinutes) continue;
        if (scenes.has(meal.type)) continue;

        // Remind window: 15 min before to 15 min after typical time
        const windowStart = typicalMinutes - 15;
        const windowEnd = typicalMinutes + 15;

        if (currentMinutes >= windowStart && currentMinutes < windowEnd) {
          const foodPref = await this.generateRecommendations(userId, meal.type, 1);
          const prefText = foodPref.length > 0
            ? ` Having ${foodPref[0].foodName} today?`
            : '';

          const mealNames: Record<string, string> = {
            breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner',
          };

          return {
            shouldRemind: true,
            message: `It's almost ${mealNames[meal.type]} time!${prefText} 📸`,
            mealType: meal.type,
          };
        }
      }

      return { shouldRemind: false };
    } catch (error) {
      logger.error('Error checking meal reminder', { error, userId });
      return { shouldRemind: false };
    }
  }
}

// 导出单例
let contextManager: ContextManager | null = null;

export function getContextManager(): ContextManager {
  if (!contextManager) {
    contextManager = new ContextManager();
  }
  return contextManager;
}
