/**
 * Phase 3: Feature Discovery Engine
 * Intelligently introduces features at optimal moments
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import type {
  FeatureDiscoveryEngine,
  UserContext,
  FeatureIntroduction,
} from '../types';

// Feature priority order (higher = shown first)
const FEATURE_PRIORITIES = {
  streaks: 6,
  reminders: 5,
  budget: 4,
  cards: 3,
  compare: 2,
  social: 1,
} as const;

// Rate limiting constants
const MAX_INTRODUCTIONS_PER_DAY = 1;
const MIN_DAYS_BETWEEN_INTRODUCTIONS = 2;
const MAX_INTRODUCTION_ATTEMPTS = 2; // Stop mentioning after 2 ignores

export class FeatureDiscoveryService implements FeatureDiscoveryEngine {
  constructor(private supabase: SupabaseClient<Database>) {
    logger.debug('FeatureDiscoveryService initialized');
  }

  /**
   * Check if any feature should be introduced based on current context
   */
  async checkForIntroduction(
    context: UserContext
  ): Promise<FeatureIntroduction | null> {
    try {
      logger.debug({ userId: context.userId }, 'Checking for feature introduction');

      // Check rate limiting first
      const canIntroduce = await this.checkRateLimiting(context.userId);
      if (!canIntroduce) {
        logger.debug({ userId: context.userId }, 'Rate limiting prevents introduction');
        return null;
      }

      // Check milestone-based triggers
      const milestoneFeature = await this.checkMilestoneTriggers(context);
      if (milestoneFeature) {
        return milestoneFeature;
      }

      // Check context-based triggers
      const contextFeature = await this.checkContextTriggers(context);
      if (contextFeature) {
        return contextFeature;
      }

      return null;
    } catch (error) {
      logger.error({ error, context }, 'Error checking for feature introduction');
      return null;
    }
  }

  /**
   * Check rate limiting rules
   */
  private async checkRateLimiting(userId: string): Promise<boolean> {
    try {
      // Check if any feature was introduced in the last MIN_DAYS_BETWEEN_INTRODUCTIONS days
      const { data, error } = await this.supabase
        .from('feature_discovery')
        .select('last_mentioned_date')
        .eq('user_id', userId)
        .order('last_mentioned_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logger.error({ error, userId }, 'Error checking rate limiting');
        return false;
      }

      if (!data) {
        // No previous introductions, allow
        return true;
      }

      const lastMentioned = new Date((data as any).last_mentioned_date);
      const daysSince = Math.floor(
        (Date.now() - lastMentioned.getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSince >= MIN_DAYS_BETWEEN_INTRODUCTIONS;
    } catch (error) {
      logger.error({ error, userId }, 'Error in rate limiting check');
      return false;
    }
  }

  /**
   * Check milestone-based triggers
   */
  private async checkMilestoneTriggers(
    context: UserContext
  ): Promise<FeatureIntroduction | null> {
    const { userId, currentStreak, totalMealsLogged, daysActive } = context;

    // Day 2: Introduce streaks concept
    if (totalMealsLogged === 2) {
      const discovered = await this.hasDiscovered(userId, 'streaks');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'streaks'))) {
        return {
          featureName: 'streaks',
          message: "You're building a streak! Log daily to keep it going 🔥",
          priority: FEATURE_PRIORITIES.streaks,
        };
      }
    }

    // Day 3: Offer reminders
    if (currentStreak === 3) {
      const discovered = await this.hasDiscovered(userId, 'reminders');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'reminders'))) {
        return {
          featureName: 'reminders',
          message:
            "Want daily reminders to keep your streak? Reply 'yes' or 'no'",
          priority: FEATURE_PRIORITIES.reminders,
        };
      }
    }

    // Day 7: Suggest budget and cards
    if (currentStreak === 7) {
      // Check budget first (higher priority)
      const budgetDiscovered = await this.hasDiscovered(userId, 'budget');
      if (
        !budgetDiscovered &&
        !(await this.shouldSkipFeature(userId, 'budget'))
      ) {
        return {
          featureName: 'budget',
          message:
            "You're doing great! Want to set a daily calorie budget? Reply 'budget' to start",
          priority: FEATURE_PRIORITIES.budget,
        };
      }

      // Check cards
      const cardsDiscovered = await this.hasDiscovered(userId, 'cards');
      if (!cardsDiscovered && !(await this.shouldSkipFeature(userId, 'cards'))) {
        return {
          featureName: 'cards',
          message:
            "Try 'card' to see your weekly summary, or 'help' for more features",
          priority: FEATURE_PRIORITIES.cards,
        };
      }
    }

    // 7 meals total: Mention cards
    if (totalMealsLogged === 7) {
      const discovered = await this.hasDiscovered(userId, 'cards');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'cards'))) {
        return {
          featureName: 'cards',
          message:
            "Try 'card' to see your weekly summary, or 'help' for more features",
          priority: FEATURE_PRIORITIES.cards,
        };
      }
    }

    // Day 14: Mention social features
    if (currentStreak === 14) {
      const discovered = await this.hasDiscovered(userId, 'social');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'social'))) {
        return {
          featureName: 'social',
          message:
            "Did you know you can challenge friends? Reply 'social' to learn more",
          priority: FEATURE_PRIORITIES.social,
        };
      }
    }

    return null;
  }

  /**
   * Check context-based triggers
   */
  private async checkContextTriggers(
    context: UserContext
  ): Promise<FeatureIntroduction | null> {
    const { userId, recentMealPattern } = context;

    // Same meal 3x: Suggest compare feature
    if (recentMealPattern === 'same_meal_3x') {
      const discovered = await this.hasDiscovered(userId, 'compare');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'compare'))) {
        return {
          featureName: 'compare',
          message:
            "I remember your meals! Try 'compare' to see how today compares to before",
          priority: FEATURE_PRIORITIES.compare,
        };
      }
    }

    // Late night logging: Suggest reminders
    if (recentMealPattern === 'late_night_3x') {
      const discovered = await this.hasDiscovered(userId, 'reminders');
      if (!discovered && !(await this.shouldSkipFeature(userId, 'reminders'))) {
        return {
          featureName: 'reminders',
          message:
            "Late night snacking? I can remind you to log earlier. Reply 'reminders' to set up",
          priority: FEATURE_PRIORITIES.reminders,
        };
      }
    }

    return null;
  }

  /**
   * Check if feature should be skipped (ignored twice)
   */
  private async shouldSkipFeature(
    userId: string,
    featureName: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('feature_discovery')
        .select('introduction_count, user_engaged')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .maybeSingle();

      if (error) {
        logger.error({ error, userId, featureName }, 'Error checking feature skip');
        return false;
      }

      if (!data) {
        return false; // Not introduced yet
      }

      // Skip if introduced twice and not engaged
      const record = data as any;
      return (
        record.introduction_count >= MAX_INTRODUCTION_ATTEMPTS && !record.user_engaged
      );
    } catch (error) {
      logger.error({ error, userId, featureName }, 'Error in shouldSkipFeature');
      return false;
    }
  }

  /**
   * Mark a feature as introduced
   */
  async recordIntroduction(userId: string, featureName: string): Promise<void> {
    try {
      logger.debug({ userId, featureName }, 'Recording feature introduction');

      // Try to get existing record
      const { data: existing } = await this.supabase
        .from('feature_discovery')
        .select('introduction_count')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const record = existing as any;
        const { error: updateError } = await this.supabase
          .from('feature_discovery')
          .update({
            introduction_count: record.introduction_count + 1,
            last_mentioned_date: new Date().toISOString(),
          } as any)
          .eq('user_id', userId)
          .eq('feature_name', featureName);
        
        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await this.supabase
          .from('feature_discovery')
          .insert({
            user_id: userId,
            feature_name: featureName,
            introduction_date: new Date().toISOString(),
            introduction_count: 1,
            last_mentioned_date: new Date().toISOString(),
          } as any);
        
        if (insertError) {
          throw insertError;
        }
      }

      logger.info({ userId, featureName }, 'Feature introduction recorded');
    } catch (error) {
      logger.error({ error, userId, featureName }, 'Error recording feature introduction');
      throw error;
    }
  }

  /**
   * Mark a feature as engaged (user used it)
   */
  async recordEngagement(userId: string, featureName: string): Promise<void> {
    try {
      logger.debug({ userId, featureName }, 'Recording feature engagement');

      // Try to get existing record
      const { data: existing } = await this.supabase
        .from('feature_discovery')
        .select('id')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error: updateError } = await this.supabase
          .from('feature_discovery')
          .update({
            user_engaged: true,
            last_mentioned_date: new Date().toISOString(),
          } as any)
          .eq('user_id', userId)
          .eq('feature_name', featureName);
        
        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await this.supabase
          .from('feature_discovery')
          .insert({
            user_id: userId,
            feature_name: featureName,
            user_engaged: true,
            introduction_date: new Date().toISOString(),
            last_mentioned_date: new Date().toISOString(),
          } as any);
        
        if (insertError) {
          throw insertError;
        }
      }

      logger.info({ userId, featureName }, 'Feature engagement recorded');
    } catch (error) {
      logger.error({ error, userId, featureName }, 'Error recording feature engagement');
      throw error;
    }
  }

  /**
   * Check if user has discovered a feature
   */
  async hasDiscovered(userId: string, featureName: string): Promise<boolean> {
    try {
      logger.debug({ userId, featureName }, 'Checking if feature discovered');

      const { data, error } = await this.supabase
        .from('feature_discovery')
        .select('user_engaged')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .maybeSingle();

      if (error) {
        logger.error({ error, userId, featureName }, 'Error checking feature discovery');
        return false;
      }

      return (data as any)?.user_engaged ?? false;
    } catch (error) {
      logger.error({ error, userId, featureName }, 'Error checking feature discovery');
      return false;
    }
  }
}
