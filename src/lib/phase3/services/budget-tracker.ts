/**
 * Phase 3: Budget Tracker
 * Optional calorie budget tracking with supportive feedback
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import type {
  BudgetTracker,
  BudgetStatus,
  BudgetHistoryEntry,
} from '../types';

export class BudgetService implements BudgetTracker {
  constructor(private supabase: SupabaseClient<Database>) {
    logger.debug('BudgetService initialized');
  }

  /**
   * Set or update daily budget
   */
  async setBudget(userId: string, calorieTarget: number): Promise<void> {
    try {
      logger.debug({ userId, calorieTarget }, 'Setting budget');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Upsert budget for today
      const { error } = await this.supabase
        .from('daily_budgets')
        .upsert({
          user_id: userId,
          date: today,
          calorie_target: calorieTarget,
          calories_consumed: 0,
          budget_enabled: true,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,date',
        });

      if (error) {
        throw error;
      }

      logger.info({ userId, calorieTarget }, 'Budget set successfully');
    } catch (error) {
      logger.error({ error, userId, calorieTarget }, 'Error setting budget');
      throw error;
    }
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(userId: string): Promise<BudgetStatus> {
    try {
      logger.debug({ userId }, 'Getting budget status');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Query today's budget
      const { data, error } = await this.supabase
        .from('daily_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // No budget set for today
        return {
          enabled: false,
          target: 0,
          consumed: 0,
          remaining: 0,
          percentageUsed: 0,
          status: 'on_track',
        };
      }

      const budget = data as any;

      // Budget is disabled
      if (!budget.budget_enabled) {
        return {
          enabled: false,
          target: budget.calorie_target,
          consumed: budget.calories_consumed,
          remaining: 0,
          percentageUsed: 0,
          status: 'on_track',
        };
      }

      // Calculate budget status
      const target = budget.calorie_target;
      const consumed = budget.calories_consumed;
      const remaining = Math.max(0, target - consumed);
      const percentageUsed = target > 0 ? (consumed / target) * 100 : 0;

      // Determine status and message
      let status: 'on_track' | 'approaching_limit' | 'over_budget' = 'on_track';
      let message: string | undefined;

      if (percentageUsed >= 100) {
        status = 'over_budget';
        message = "Over budget today, but tomorrow's a fresh start! 💪";
      } else if (percentageUsed >= 80) {
        status = 'approaching_limit';
        message = "Getting close to your limit 😊";
      }

      return {
        enabled: true,
        target,
        consumed,
        remaining,
        percentageUsed: Math.round(percentageUsed),
        status,
        message,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error getting budget status');
      throw error;
    }
  }

  /**
   * Update budget after meal log
   */
  async updateAfterMeal(userId: string, calories: number): Promise<BudgetStatus> {
    try {
      logger.debug({ userId, calories }, 'Updating budget after meal');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Check if budget exists for today
      const { data: existingBudget, error: fetchError } = await this.supabase
        .from('daily_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      const budget = existingBudget as any;

      if (!budget || !budget.budget_enabled) {
        // No active budget, return disabled status
        return {
          enabled: false,
          target: 0,
          consumed: 0,
          remaining: 0,
          percentageUsed: 0,
          status: 'on_track',
        };
      }

      // Update calories consumed
      const newConsumed = budget.calories_consumed + calories;
      
      const { error } = await (this.supabase
        .from('daily_budgets') as any)
        .update({
          calories_consumed: newConsumed,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', today);

      if (error) {
        throw error;
      }

      logger.info({ userId, calories, newConsumed }, 'Budget updated after meal');

      // Return updated budget status
      return this.getBudgetStatus(userId);
    } catch (error) {
      logger.error({ error, userId, calories }, 'Error updating budget');
      throw error;
    }
  }

  /**
   * Disable budget tracking
   */
  async disableBudget(userId: string): Promise<void> {
    try {
      logger.debug({ userId }, 'Disabling budget');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Update budget_enabled to false for today
      const { error } = await (this.supabase
        .from('daily_budgets') as any)
        .update({
          budget_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', today);

      if (error) {
        throw error;
      }

      logger.info({ userId }, 'Budget disabled successfully');
    } catch (error) {
      logger.error({ error, userId }, 'Error disabling budget');
      throw error;
    }
  }

  /**
   * Get budget history
   */
  async getBudgetHistory(userId: string, days: number): Promise<BudgetHistoryEntry[]> {
    try {
      logger.debug({ userId, days }, 'Getting budget history');

      // Calculate date range (last N days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Query budget history
      const { data, error } = await this.supabase
        .from('daily_budgets')
        .select('date, calorie_target, calories_consumed, budget_enabled')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Transform to BudgetHistoryEntry format
      const history: BudgetHistoryEntry[] = (data as any[]).map((entry) => {
        const consumed = entry.calories_consumed;
        const target = entry.calorie_target;
        const percentageUsed = target > 0 ? (consumed / target) * 100 : 0;

        let status = 'on_track';
        if (percentageUsed >= 100) {
          status = 'over_budget';
        } else if (percentageUsed >= 80) {
          status = 'approaching_limit';
        }

        return {
          date: new Date(entry.date),
          target,
          consumed,
          status,
        };
      });

      logger.info({ userId, days, count: history.length }, 'Budget history retrieved');
      return history;
    } catch (error) {
      logger.error({ error, userId, days }, 'Error getting budget history');
      return [];
    }
  }
}
