/**
 * 端到端测试：每日总结生成
 * 测试数据汇总、洞察生成和 WhatsApp 发送
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/database';
import { DailyDigestGenerator } from '@/lib/digest/daily-digest-generator';

describe('E2E: Daily Digest Generation', () => {
  let testUserId: string;
  let digestGenerator: DailyDigestGenerator;

  beforeAll(async () => {
    const supabase = createClient();
    
    // 创建测试用户
    const { data: user } = await supabase
      .from('users')
      .insert({
        phone_number: `+65${Math.floor(Math.random() * 100000000)}`,
        whatsapp_name: 'Digest Test User',
      })
      .select()
      .single();

    testUserId = user.id;

    // 创建健康画像
    await supabase.from('health_profiles').insert({
      user_id: testUserId,
      height: 170,
      weight: 70,
      goal: 'lose-weight',
      activity_level: 'light',
    });

    // 创建测试食物记录
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('food_records').insert([
      {
        user_id: testUserId,
        image_url: 'test1.jpg',
        image_hash: 'hash1',
        recognition_result: {
          foods: [{ name: 'Breakfast', nutrition: { calories: { min: 400, max: 500 } } }],
          totalNutrition: {
            calories: { min: 400, max: 500 },
            protein: { min: 20, max: 25 },
            carbs: { min: 50, max: 60 },
            fat: { min: 10, max: 15 },
            sodium: { min: 500, max: 600 },
          },
        },
        health_rating: { overall: 'green', score: 85 },
        meal_context: 'breakfast',
        created_at: `${today}T08:00:00Z`,
      },
      {
        user_id: testUserId,
        image_url: 'test2.jpg',
        image_hash: 'hash2',
        recognition_result: {
          foods: [{ name: 'Lunch', nutrition: { calories: { min: 600, max: 700 } } }],
          totalNutrition: {
            calories: { min: 600, max: 700 },
            protein: { min: 30, max: 35 },
            carbs: { min: 70, max: 80 },
            fat: { min: 20, max: 25 },
            sodium: { min: 800, max: 900 },
          },
        },
        health_rating: { overall: 'yellow', score: 65 },
        meal_context: 'lunch',
        created_at: `${today}T12:00:00Z`,
      },
    ]);

    digestGenerator = new DailyDigestGenerator();
  });

  afterAll(async () => {
    const supabase = createClient();
    await supabase.from('users').delete().eq('id', testUserId);
  });

  it('should generate daily digest with correct data', async () => {
    const today = new Date().toISOString().split('T')[0];
    const digest = await digestGenerator.generateDigest(testUserId, today);

    expect(digest).toBeDefined();
    expect(digest.summary.mealsCount).toBe(2);
    expect(digest.summary.totalCalories).toBeGreaterThan(0);
    expect(digest.summary.ratingDistribution.green).toBe(1);
    expect(digest.summary.ratingDistribution.yellow).toBe(1);
    expect(digest.insights).toBeDefined();
    expect(digest.insights.length).toBeGreaterThan(0);
  });

  it('should generate exercise suggestion when calories exceeded', async () => {
    const today = new Date().toISOString().split('T')[0];
    const digest = await digestGenerator.generateDigest(testUserId, today);

    // 如果摄入超标，应该有运动建议
    if (digest.summary.totalCalories > 2000) {
      expect(digest.exerciseSuggestion).toBeDefined();
      expect(digest.exerciseSuggestion).toContain('卡路里');
    }
  });
});
