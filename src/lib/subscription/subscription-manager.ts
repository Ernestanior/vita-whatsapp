/**
 * Subscription Manager
 * Manages user subscriptions, quotas, and upgrade prompts
 * Requirements: 7.1, 7.2, 7.8
 */

import { createClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_TIERS } from '@/lib/database/schema';

type SubscriptionTier = 'free' | 'premium' | 'pro';
type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

export interface UsageQuota {
  userId: string;
  date: string;
  recognitionsUsed: number;
  recognitionsLimit: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: SubscriptionTier;
  needsUpgrade: boolean;
}

export class SubscriptionManager {
  /**
   * Atomically check and increment quota (prevents race conditions)
   * Requirements: 7.2
   * Fixed: Race condition where concurrent requests could bypass quota limits
   */
  async checkAndIncrementQuota(userId: string): Promise<QuotaCheckResult> {
    const supabase: any = await createClient();

    // Get user's subscription
    const subscription = await this.getSubscription(userId);

    // Premium/Pro users have unlimited quota
    if (subscription.tier === 'premium' || subscription.tier === 'pro') {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        tier: subscription.tier,
        needsUpgrade: false,
      };
    }

    // Free users: use atomic operation to check and increment
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.rpc('check_and_increment_quota', {
      p_user_id: userId,
      p_date: today,
      p_limit: SUBSCRIPTION_TIERS.free.dailyLimit,
    });

    if (error) {
      throw new Error(`Failed to check and increment quota: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from check_and_increment_quota');
    }

    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      limit: SUBSCRIPTION_TIERS.free.dailyLimit,
      tier: 'free',
      needsUpgrade: !result.allowed,
    };
  }

  /**
   * Check if user has quota available for recognition (deprecated)
   * @deprecated Use checkAndIncrementQuota instead to prevent race conditions
   * Requirements: 7.2
   */
  async checkQuota(userId: string): Promise<QuotaCheckResult> {
    const supabase: any = await createClient();

    // Get user's subscription
    const subscription = await this.getSubscription(userId);

    // Premium/Pro users have unlimited quota
    if (subscription.tier === 'premium' || subscription.tier === 'pro') {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        tier: subscription.tier,
        needsUpgrade: false,
      };
    }

    // Check today's quota for free users
    const today = new Date().toISOString().split('T')[0];
    const { data: quota, error } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check quota: ${error.message}`);
    }

    // If no quota record exists, user hasn't used any today
    if (!quota) {
      return {
        allowed: true,
        remaining: SUBSCRIPTION_TIERS.free.dailyLimit,
        limit: SUBSCRIPTION_TIERS.free.dailyLimit,
        tier: 'free',
        needsUpgrade: false,
      };
    }

    const remaining = quota.recognitions_limit - quota.recognitions_used;
    const allowed = remaining > 0;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      limit: quota.recognitions_limit,
      tier: 'free',
      needsUpgrade: !allowed,
    };
  }

  /**
   * Increment usage count for a user (deprecated)
   * @deprecated Use checkAndIncrementQuota instead to prevent race conditions
   * Requirements: 7.2
   */
  async incrementUsage(userId: string): Promise<void> {
    const supabase: any = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_date: today,
    });

    if (error) {
      throw new Error(`Failed to increment usage: ${error.message}`);
    }
  }

  /**
   * Get user's current subscription
   * Requirements: 7.1
   */
  async getSubscription(userId: string): Promise<Subscription> {
    const supabase: any = await createClient();

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get subscription: ${error.message}`);
    }

    // If no active subscription, create a free tier subscription
    if (!data) {
      return await this.createFreeSubscription(userId);
    }

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier as SubscriptionTier,
      status: data.status as SubscriptionStatus,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
    };
  }

  /**
   * Create a free tier subscription for new users
   * Requirements: 7.1
   */
  private async createFreeSubscription(userId: string): Promise<Subscription> {
    const supabase: any = await createClient();

    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier: 'free' as SubscriptionTier,
        status: 'active' as SubscriptionStatus,
        current_period_start: now.toISOString(),
        current_period_end: oneYearLater.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create free subscription: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier as SubscriptionTier,
      status: data.status as SubscriptionStatus,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
    };
  }

  /**
   * Generate upgrade prompt message
   * Requirements: 7.8
   */
  getUpgradePrompt(language: 'en' | 'zh-CN' | 'zh-TW' = 'en'): string {
    const messages = {
      en: `📊 You've reached your daily limit of 3 free scans!

Upgrade to Premium for:
✨ Unlimited food recognition
📈 Daily health summaries
📊 Advanced analytics
🎯 Personalized insights

Tap here to upgrade: [Upgrade Link]`,
      'zh-CN': `📊 您今天的 3 次免费识别已用完！

升级到 Premium 享受：
✨ 无限次食物识别
📈 每日健康总结
📊 高级数据分析
🎯 个性化洞察

点击这里升级：[升级链接]`,
      'zh-TW': `📊 您今天的 3 次免費識別已用完！

升級到 Premium 享受：
✨ 無限次食物識別
📈 每日健康總結
📊 高級數據分析
🎯 個性化洞察

點擊這裡升級：[升級連結]`,
    };

    return messages[language] || messages.en;
  }

  /**
   * Get usage statistics for a user
   * Requirements: 7.8
   */
  async getUsageStats(userId: string, days: number = 7): Promise<UsageQuota[]> {
    const supabase: any = await createClient();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      userId: row.user_id,
      date: row.date,
      recognitionsUsed: row.recognitions_used,
      recognitionsLimit: row.recognitions_limit,
    }));
  }

  /**
   * Update subscription tier
   * Requirements: 7.1
   */
  async updateSubscriptionTier(
    userId: string,
    tier: SubscriptionTier,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string
  ): Promise<Subscription> {
    const supabase: any = await createClient();

    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        tier,
        current_period_start: now.toISOString(),
        current_period_end: oneMonthLater.toISOString(),
        stripe_subscription_id: stripeSubscriptionId || null,
        stripe_customer_id: stripeCustomerId || null,
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      tier: data.tier as SubscriptionTier,
      status: data.status as SubscriptionStatus,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      stripeSubscriptionId: data.stripe_subscription_id,
      stripeCustomerId: data.stripe_customer_id,
    };
  }

  /**
   * Cancel subscription
   * Requirements: 7.1
   */
  async cancelSubscription(userId: string): Promise<void> {
    const supabase: any = await createClient();

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' as SubscriptionStatus })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }
}
