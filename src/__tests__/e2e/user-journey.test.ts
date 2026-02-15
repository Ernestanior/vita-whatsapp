/**
 * 端到端测试：完整用户旅程
 * 测试从首次使用到查看历史的完整流程
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/database';

describe('E2E: Complete User Journey', () => {
  let testUserId: string;
  let testPhoneNumber: string;

  beforeAll(async () => {
    // 创建测试用户
    testPhoneNumber = `+65${Math.floor(Math.random() * 100000000)}`;
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        phone_number: testPhoneNumber,
        whatsapp_name: 'Test User',
        language: 'zh-CN',
      })
      .select()
      .single();

    if (error) throw error;
    testUserId = data.id;
  });

  afterAll(async () => {
    // 清理测试数据
    const supabase = createClient();
    await supabase.from('users').delete().eq('id', testUserId);
  });

  it('should complete full user journey', async () => {
    // 1. 首次使用 - 设置健康画像
    const profileData = {
      user_id: testUserId,
      height: 170,
      weight: 70,
      age: 30,
      gender: 'male',
      goal: 'lose-weight',
      activity_level: 'light',
    };

    const supabase = createClient();
    const { error: profileError } = await supabase
      .from('health_profiles')
      .insert(profileData);

    expect(profileError).toBeNull();

    // 2. 验证画像创建成功
    const { data: profile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(profile).toBeDefined();
    expect(profile.height).toBe(170);
    expect(profile.weight).toBe(70);

    // 3. 模拟食物识别
    const foodRecord = {
      user_id: testUserId,
      image_url: 'https://example.com/test-image.jpg',
      image_hash: 'test-hash-123',
      recognition_result: {
        foods: [
          {
            name: 'Chicken Rice',
            confidence: 95,
            nutrition: {
              calories: { min: 500, max: 600 },
              protein: { min: 25, max: 30 },
              carbs: { min: 60, max: 70 },
              fat: { min: 15, max: 20 },
              sodium: { min: 800, max: 1000 },
            },
          },
        ],
      },
      health_rating: {
        overall: 'yellow',
        score: 65,
        factors: [],
        suggestions: ['Reduce sodium intake'],
      },
      meal_context: 'lunch',
    };

    const { error: recordError } = await supabase
      .from('food_records')
      .insert(foodRecord);

    expect(recordError).toBeNull();

    // 4. 查看历史记录
    const { data: history, error: historyError } = await supabase
      .from('food_records')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    expect(historyError).toBeNull();
    expect(history).toHaveLength(1);
    expect(history[0].recognition_result.foods[0].name).toBe('Chicken Rice');

    // 5. 验证订阅状态
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    // 新用户应该有默认的 free 订阅
    expect(subscription?.tier).toBe('free');
  });

  it('should handle multi-language switching', async () => {
    const supabase = createClient();

    // 切换到英文
    const { error: updateError } = await supabase
      .from('users')
      .update({ language: 'en' })
      .eq('id', testUserId);

    expect(updateError).toBeNull();

    // 验证语言已更新
    const { data: user } = await supabase
      .from('users')
      .select('language')
      .eq('id', testUserId)
      .single();

    expect(user?.language).toBe('en');
  });
});
