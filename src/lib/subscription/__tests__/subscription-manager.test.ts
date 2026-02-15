/**
 * Subscription Manager Tests
 * Requirements: 7.1, 7.2, 7.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager } from '../subscription-manager';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockSupabase: any;

  beforeEach(() => {
    manager = new SubscriptionManager();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockSupabase);
  });

  describe('checkQuota', () => {
    it('should allow unlimited quota for premium users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'sub-1',
          user_id: 'user-1',
          tier: 'premium',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          stripe_subscription_id: null,
          stripe_customer_id: null,
        },
        error: null,
      });

      const result = await manager.checkQuota('user-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
      expect(result.limit).toBe(Infinity);
      expect(result.tier).toBe('premium');
      expect(result.needsUpgrade).toBe(false);
    });

    it('should allow unlimited quota for pro users', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'sub-1',
          user_id: 'user-1',
          tier: 'pro',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          stripe_subscription_id: null,
          stripe_customer_id: null,
        },
        error: null,
      });

      const result = await manager.checkQuota('user-1');

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('should check daily quota for free users', async () => {
      // Mock subscription query
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString(),
            stripe_subscription_id: null,
            stripe_customer_id: null,
          },
          error: null,
        })
        // Mock quota query
        .mockResolvedValueOnce({
          data: {
            user_id: 'user-1',
            date: new Date().toISOString().split('T')[0],
            recognitions_used: 1,
            recognitions_limit: 3,
          },
          error: null,
        });

      const result = await manager.checkQuota('user-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.limit).toBe(3);
      expect(result.tier).toBe('free');
      expect(result.needsUpgrade).toBe(false);
    });

    it('should deny quota when limit reached', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString(),
            stripe_subscription_id: null,
            stripe_customer_id: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            user_id: 'user-1',
            date: new Date().toISOString().split('T')[0],
            recognitions_used: 3,
            recognitions_limit: 3,
          },
          error: null,
        });

      const result = await manager.checkQuota('user-1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.needsUpgrade).toBe(true);
    });

    it('should allow quota when no usage record exists', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString(),
            stripe_subscription_id: null,
            stripe_customer_id: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }, // No rows returned
        });

      const result = await manager.checkQuota('user-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
      expect(result.limit).toBe(3);
    });
  });

  describe('incrementUsage', () => {
    it('should call increment_usage RPC function', async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      await manager.incrementUsage('user-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_usage', {
        p_user_id: 'user-1',
        p_date: expect.any(String),
      });
    });

    it('should throw error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'Database error' },
      });

      await expect(manager.incrementUsage('user-1')).rejects.toThrow(
        'Failed to increment usage'
      );
    });
  });

  describe('getSubscription', () => {
    it('should return active subscription', async () => {
      const mockDate = new Date();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'sub-1',
          user_id: 'user-1',
          tier: 'premium',
          status: 'active',
          current_period_start: mockDate.toISOString(),
          current_period_end: mockDate.toISOString(),
          stripe_subscription_id: 'stripe-123',
          stripe_customer_id: 'cus-123',
        },
        error: null,
      });

      const subscription = await manager.getSubscription('user-1');

      expect(subscription.userId).toBe('user-1');
      expect(subscription.tier).toBe('premium');
      expect(subscription.status).toBe('active');
      expect(subscription.stripeSubscriptionId).toBe('stripe-123');
    });

    it('should create free subscription for new users', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' },
        })
        .mockResolvedValueOnce({
          data: {
            id: 'sub-new',
            user_id: 'user-new',
            tier: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date().toISOString(),
            stripe_subscription_id: null,
            stripe_customer_id: null,
          },
          error: null,
        });

      const subscription = await manager.getSubscription('user-new');

      expect(subscription.tier).toBe('free');
      expect(subscription.status).toBe('active');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('getUpgradePrompt', () => {
    it('should return English prompt by default', async () => {
      const prompt = await manager.getUpgradePrompt('user-1');

      expect(prompt).toContain('daily limit');
      expect(prompt).toContain('Unlimited food recognition');
    });

    it('should return Chinese prompt when specified', async () => {
      const prompt = await manager.getUpgradePrompt('user-1', 'zh-CN');

      expect(prompt).toContain('免费识别');
      expect(prompt).toContain('无限次食物识别');
    });

    it('should return Traditional Chinese prompt', async () => {
      const prompt = await manager.getUpgradePrompt('user-1', 'zh-TW');

      expect(prompt).toContain('免費識別');
      expect(prompt).toContain('無限次食物識別');
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for specified days', async () => {
      const mockStats = [
        {
          user_id: 'user-1',
          date: '2024-01-10',
          recognitions_used: 3,
          recognitions_limit: 3,
        },
        {
          user_id: 'user-1',
          date: '2024-01-09',
          recognitions_used: 2,
          recognitions_limit: 3,
        },
      ];

      mockSupabase.single.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const stats = await manager.getUsageStats('user-1', 7);

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_quotas');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });
  });

  describe('updateSubscriptionTier', () => {
    it('should update subscription tier', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'sub-1',
          user_id: 'user-1',
          tier: 'premium',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date().toISOString(),
          stripe_subscription_id: 'stripe-123',
          stripe_customer_id: 'cus-123',
        },
        error: null,
      });

      const subscription = await manager.updateSubscriptionTier(
        'user-1',
        'premium',
        'stripe-123',
        'cus-123'
      );

      expect(subscription.tier).toBe('premium');
      expect(subscription.stripeSubscriptionId).toBe('stripe-123');
      expect(mockSupabase.update).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      mockSupabase.single.mockResolvedValue({ error: null });

      await manager.cancelSubscription('user-1');

      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    });
  });
});
