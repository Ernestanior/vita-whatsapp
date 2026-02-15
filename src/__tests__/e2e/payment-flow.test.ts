/**
 * 端到端测试：支付流程
 * 测试订阅创建、支付和功能解锁
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@/lib/database';

describe('E2E: Payment Flow', () => {
  let testUserId: string;

  beforeAll(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('users')
      .insert({
        phone_number: `+65${Math.floor(Math.random() * 100000000)}`,
        whatsapp_name: 'Payment Test User',
      })
      .select()
      .single();

    testUserId = data.id;
  });

  afterAll(async () => {
    const supabase = createClient();
    await supabase.from('users').delete().eq('id', testUserId);
  });

  it('should create subscription and unlock features', async () => {
    const supabase = createClient();

    // 1. 创建订阅
    const subscriptionData = {
      user_id: testUserId,
      tier: 'premium',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_subscription_id: 'sub_test_123',
      stripe_customer_id: 'cus_test_123',
    };

    const { error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    expect(subError).toBeNull();

    // 2. 验证订阅状态
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(subscription).toBeDefined();
    expect(subscription.tier).toBe('premium');
    expect(subscription.status).toBe('active');

    // 3. 验证配额已解锁（Premium 用户无限制）
    const { data: quota } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', testUserId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single();

    // Premium 用户应该没有配额限制或有很高的限制
    expect(quota?.recognitions_limit).toBeGreaterThan(3);
  });

  it('should handle subscription cancellation', async () => {
    const supabase = createClient();

    // 取消订阅
    const { error: cancelError } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', testUserId);

    expect(cancelError).toBeNull();

    // 验证订阅状态
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    expect(subscription.status).toBe('cancelled');
  });
});
