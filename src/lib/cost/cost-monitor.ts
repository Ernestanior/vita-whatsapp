// @ts-nocheck
/**
 * CostMonitor - Monitors and tracks AI API costs
 * 
 * Responsibilities:
 * - Track daily API costs
 * - Detect abnormal usage patterns
 * - Send budget alerts
 * - Generate cost reports
 * 
 * Requirements: 20.2, 20.6, 20.7, 20.8
 * 
 * Database Tables Required:
 * - api_usage: Tracks individual API calls (user_id, date, model, input_tokens, output_tokens, cost, cached, duration)
 * - cost_metrics: Stores daily aggregated metrics
 * - cost_alerts: Stores budget alerts and warnings
 * 
 * Note: These tables need to be created in the database schema.
 * See migrations for table definitions.
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { costOptimizer } from './cost-optimizer';

/**
 * Cost metrics for a specific period
 */
export interface CostMetrics {
  date: string;
  totalAPICalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  costPerUser: number;
  cacheHitRate: number;
  uniqueUsers: number;
  modelBreakdown: Record<string, {
    calls: number;
    cost: number;
  }>;
}

/**
 * Abnormal user usage
 */
export interface AbnormalUser {
  userId: string;
  apiCalls: number;
  totalCost: number;
  averageCostPerCall: number;
  reason: string;
}

/**
 * Budget alert configuration
 */
export interface BudgetAlert {
  type: 'DAILY_BUDGET_EXCEEDED' | 'ABNORMAL_USAGE' | 'HIGH_ERROR_RATE';
  severity: 'warning' | 'critical';
  message: string;
  metrics?: CostMetrics;
  users?: AbnormalUser[];
  timestamp: Date;
}

/**
 * Cost tracking record
 */
export interface CostRecord {
  id: string;
  userId: string;
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
  duration: number;
  createdAt: Date;
}

export class CostMonitor {
  private readonly DAILY_BUDGET_USD = parseFloat(process.env.MAX_DAILY_COST || '100');
  private readonly ABNORMAL_USER_THRESHOLD_USD = 10; // Per day

  /**
   * Track API call cost
   * Requirements: 20.2
   */
  async trackAPICall(params: {
    userId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cached: boolean;
    duration: number;
  }): Promise<void> {
    try {
      const cost = costOptimizer.calculateCost(
        params.model,
        params.inputTokens,
        params.outputTokens
      );

      const supabase = await createClient();
      const today = new Date().toISOString().split('T')[0];

      // Insert cost record
      const { error } = await supabase.from('api_usage').insert({
        user_id: params.userId,
        date: today,
        model: params.model,
        input_tokens: params.inputTokens,
        output_tokens: params.outputTokens,
        cost,
        cached: params.cached,
        duration: params.duration,
      });

      if (error) {
        logger.error({ error, params }, 'Failed to track API call');
      } else {
        logger.info(
          {
            userId: params.userId,
            model: params.model,
            cost: cost.toFixed(4),
            cached: params.cached,
          },
          'API call tracked'
        );
      }
    } catch (error) {
      logger.error({ error, params }, 'Error tracking API call');
    }
  }

  /**
   * Calculate daily cost metrics
   * Requirements: 20.6
   */
  async calculateDailyMetrics(date: string): Promise<CostMetrics> {
    const supabase = await createClient();

    // Get all API calls for the date
    const { data: calls, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('date', date);

    if (error || !calls) {
      logger.error({ error, date }, 'Failed to fetch API usage');
      return this.getEmptyMetrics(date);
    }

    // Calculate metrics
    const totalAPICalls = calls.length;
    const cachedCalls = calls.filter((c: any) => c.cached).length;
    const uniqueUsers = new Set(calls.map((c: any) => c.user_id)).size;

    const totalInputTokens = calls.reduce((sum: number, c: any) => sum + (c.input_tokens || 0), 0);
    const totalOutputTokens = calls.reduce((sum: number, c: any) => sum + (c.output_tokens || 0), 0);
    const totalCost = calls.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);

    const cacheHitRate = totalAPICalls > 0 ? cachedCalls / totalAPICalls : 0;
    const costPerUser = uniqueUsers > 0 ? totalCost / uniqueUsers : 0;

    // Model breakdown
    const modelBreakdown: Record<string, { calls: number; cost: number }> = {};
    for (const call of calls) {
      const model = (call as any).model;
      const cost = (call as any).cost || 0;
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { calls: 0, cost: 0 };
      }
      modelBreakdown[model].calls++;
      modelBreakdown[model].cost += cost;
    }

    return {
      date,
      totalAPICalls,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      costPerUser,
      cacheHitRate,
      uniqueUsers,
      modelBreakdown,
    };
  }

  /**
   * Track daily costs and check for alerts
   * Requirements: 20.2, 20.6, 20.7, 20.8
   */
  async trackDailyCost(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Calculate metrics
      const metrics = await this.calculateDailyMetrics(today);

      logger.info(
        {
          date: today,
          totalCost: metrics.totalCost.toFixed(2),
          totalCalls: metrics.totalAPICalls,
          cacheHitRate: (metrics.cacheHitRate * 100).toFixed(1) + '%',
          uniqueUsers: metrics.uniqueUsers,
        },
        'Daily cost metrics calculated'
      );

      // Check budget
      if (metrics.totalCost > this.DAILY_BUDGET_USD) {
        await this.sendAlert({
          type: 'DAILY_BUDGET_EXCEEDED',
          severity: 'critical',
          message: `Daily cost $${metrics.totalCost.toFixed(2)} exceeded budget $${this.DAILY_BUDGET_USD}`,
          metrics,
          timestamp: new Date(),
        });
      }

      // Check for abnormal users
      const abnormalUsers = await this.findAbnormalUsers(today);
      if (abnormalUsers.length > 0) {
        await this.sendAlert({
          type: 'ABNORMAL_USAGE',
          severity: 'warning',
          message: `${abnormalUsers.length} users with abnormal API usage detected`,
          users: abnormalUsers,
          timestamp: new Date(),
        });
      }

      // Save metrics to database
      await this.saveMetrics(metrics);
    } catch (error) {
      logger.error({ error, date: today }, 'Failed to track daily cost');
    }
  }

  /**
   * Find users with abnormal usage patterns
   * Requirements: 20.7
   */
  async findAbnormalUsers(date: string): Promise<AbnormalUser[]> {
    const supabase = await createClient();

    // Get per-user costs for the date
    const { data: userCosts, error } = await supabase
      .from('api_usage')
      .select('user_id, cost, model')
      .eq('date', date);

    if (error || !userCosts) {
      logger.error({ error, date }, 'Failed to fetch user costs');
      return [];
    }

    // Aggregate by user
    const userAggregates = new Map<string, { calls: number; totalCost: number }>();
    for (const record of userCosts) {
      const userId = (record as any).user_id;
      const cost = (record as any).cost || 0;
      const existing = userAggregates.get(userId) || { calls: 0, totalCost: 0 };
      existing.calls++;
      existing.totalCost += cost;
      userAggregates.set(userId, existing);
    }

    // Find abnormal users
    const abnormalUsers: AbnormalUser[] = [];
    for (const [userId, stats] of userAggregates.entries()) {
      if (stats.totalCost > this.ABNORMAL_USER_THRESHOLD_USD) {
        abnormalUsers.push({
          userId,
          apiCalls: stats.calls,
          totalCost: stats.totalCost,
          averageCostPerCall: stats.totalCost / stats.calls,
          reason: `Daily cost $${stats.totalCost.toFixed(2)} exceeds threshold $${this.ABNORMAL_USER_THRESHOLD_USD}`,
        });
      }
    }

    return abnormalUsers;
  }

  /**
   * Send alert notification
   * Requirements: 20.8
   */
  private async sendAlert(alert: BudgetAlert): Promise<void> {
    logger.warn(
      {
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        metrics: alert.metrics,
        users: alert.users,
      },
      'Cost alert triggered'
    );

    // In production, this would send to:
    // - Slack webhook
    // - Email
    // - PagerDuty (for critical alerts)
    // - SMS (for critical alerts)

    // For now, just log
    if (alert.severity === 'critical') {
      console.error('🚨 CRITICAL ALERT:', alert.message);
    } else {
      console.warn('⚠️  WARNING:', alert.message);
    }

    // Save alert to database
    try {
      const supabase = await createClient();
      await supabase.from('cost_alerts').insert({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        metadata: {
          metrics: alert.metrics,
          users: alert.users,
        },
        created_at: alert.timestamp,
      });
    } catch (error) {
      logger.error({ error, alert }, 'Failed to save alert');
    }
  }

  /**
   * Save metrics to database
   */
  private async saveMetrics(metrics: CostMetrics): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('cost_metrics').insert({
        date: metrics.date,
        total_api_calls: metrics.totalAPICalls,
        total_input_tokens: metrics.totalInputTokens,
        total_output_tokens: metrics.totalOutputTokens,
        total_cost: metrics.totalCost,
        cost_per_user: metrics.costPerUser,
        cache_hit_rate: metrics.cacheHitRate,
        unique_users: metrics.uniqueUsers,
        model_breakdown: metrics.modelBreakdown,
      });

      logger.info({ date: metrics.date }, 'Cost metrics saved');
    } catch (error) {
      logger.error({ error, metrics }, 'Failed to save cost metrics');
    }
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(date: string): CostMetrics {
    return {
      date,
      totalAPICalls: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      costPerUser: 0,
      cacheHitRate: 0,
      uniqueUsers: 0,
      modelBreakdown: {},
    };
  }

  /**
   * Get cost metrics for a date range
   * Requirements: 20.6
   */
  async getMetricsForRange(startDate: string, endDate: string): Promise<CostMetrics[]> {
    const supabase = await createClient();

    const { data: metrics, error } = await supabase
      .from('cost_metrics')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error || !metrics) {
      logger.error({ error, startDate, endDate }, 'Failed to fetch cost metrics');
      return [];
    }

    return metrics.map((m: any) => ({
      date: m.date,
      totalAPICalls: m.total_api_calls,
      totalInputTokens: m.total_input_tokens,
      totalOutputTokens: m.total_output_tokens,
      totalCost: m.total_cost,
      costPerUser: m.cost_per_user,
      cacheHitRate: m.cache_hit_rate,
      uniqueUsers: m.unique_users,
      modelBreakdown: m.model_breakdown,
    }));
  }

  /**
   * Get user cost summary
   */
  async getUserCostSummary(userId: string, days: number = 30): Promise<{
    totalCalls: number;
    totalCost: number;
    averageCostPerCall: number;
    cachedCalls: number;
    cacheHitRate: number;
  }> {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: calls, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDateStr);

    if (error || !calls) {
      return {
        totalCalls: 0,
        totalCost: 0,
        averageCostPerCall: 0,
        cachedCalls: 0,
        cacheHitRate: 0,
      };
    }

    const totalCalls = calls.length;
    const cachedCalls = calls.filter((c: any) => c.cached).length;
    const totalCost = calls.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);

    return {
      totalCalls,
      totalCost,
      averageCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
      cachedCalls,
      cacheHitRate: totalCalls > 0 ? cachedCalls / totalCalls : 0,
    };
  }

  /**
   * Check if daily budget is exceeded
   */
  async isDailyBudgetExceeded(date?: string): Promise<boolean> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const metrics = await this.calculateDailyMetrics(targetDate);
    return metrics.totalCost > this.DAILY_BUDGET_USD;
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(): Promise<{
    dailyBudget: number;
    currentSpend: number;
    remaining: number;
    percentUsed: number;
    exceeded: boolean;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await this.calculateDailyMetrics(today);

    return {
      dailyBudget: this.DAILY_BUDGET_USD,
      currentSpend: metrics.totalCost,
      remaining: Math.max(0, this.DAILY_BUDGET_USD - metrics.totalCost),
      percentUsed: (metrics.totalCost / this.DAILY_BUDGET_USD) * 100,
      exceeded: metrics.totalCost > this.DAILY_BUDGET_USD,
    };
  }
}

// Singleton instance
export const costMonitor = new CostMonitor();
