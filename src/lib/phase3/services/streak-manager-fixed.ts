/**
 * Phase 3: Streak Manager (FIXED VERSION)
 * Tracks consecutive days of logging with achievements
 * Fixed: Changed all last_log_date to last_checkin_date to match database schema
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { logger } from '@/utils/logger';
import type {
  StreakManager,
  StreakUpdate,
  StreakRisk,
  StreakStats,
  Achievement,
} from '../types';

export class StreakService implements StreakManager {
  constructor(private supabase: SupabaseClient<Database>) {
    logger.debug('StreakService initialized');
  }

  /**
   * Update streak after meal log
   */
  async updateStreak(userId: string): Promise<StreakUpdate> {
    try {
      logger.debug({ userId }, 'Updating streak');

      const today = new Date().toISOString().split('T')[0];

      // Get or create streak record
      const { data: existingStreak, error: fetchError } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let currentStreak = 0;
      let longestStreak = 0;
      let isNewRecord = false;
      let milestoneReached: number | undefined;
      let achievementEarned: Achievement | undefined;

      if (!existingStreak) {
        // First meal ever - create streak record
        currentStreak = 1;
        longestStreak = 1;

        const { error: insertError } = await this.supabase
          .from('user_streaks')
          .insert({
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_checkin_date: today,
            total_checkins: 1,
            streak_freezes_available: 1,
            streak_freeze_reset_date: this.getNextMonday(),
            comeback_streak: 0,
            days_active: 1,
          } as any);

        if (insertError) throw insertError;

        // Award first meal achievement
        achievementEarned = await this.awardAchievement(userId, 'first_meal');

        return {
          currentStreak: 1,
          longestStreak: 1,
          isNewRecord: true,
          achievementEarned,
          message: '🎉 First meal logged! Your journey begins!',
        };
      }

      const streak = existingStreak as any;

      // Check if already logged today
      if (streak.last_checkin_date === today) {
        return {
          currentStreak: streak.current_streak,
          longestStreak: streak.longest_streak,
          isNewRecord: false,
          message: '',
        };
      }

      // Check if consecutive day
      const lastLogDate = new Date(streak.last_checkin_date || today);
      const todayDate = new Date(today);
      const daysDiff = Math.floor(
        (todayDate.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        currentStreak = streak.current_streak + 1;
        longestStreak = Math.max(currentStreak, streak.longest_streak);
        isNewRecord = currentStreak > streak.longest_streak;

        // Check for milestone achievements
        const milestones = [3, 7, 14, 21, 30, 60, 90];
        if (milestones.includes(currentStreak)) {
          milestoneReached = currentStreak;
          achievementEarned = await this.awardAchievement(
            userId,
            this.getMilestoneAchievementType(currentStreak)
          );
        }
      } else if (daysDiff > 1) {
        // Streak broken - start new streak
        currentStreak = 1;
        longestStreak = streak.longest_streak;

        // Check for comeback achievement (after 3 days)
        if (streak.current_streak >= 7 && currentStreak === 3) {
          achievementEarned = await this.awardAchievement(userId, 'comeback_kid');
        }
      } else {
        // Same day or future date (shouldn't happen)
        currentStreak = streak.current_streak;
        longestStreak = streak.longest_streak;
      }

      // Update streak record
      const updateResult = await this.supabase
        .from('user_streaks')
        .update({
          days_active: streak.days_active + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateResult.error) throw updateResult.error;

      // Generate message
      const message = this.generateStreakMessage(
        currentStreak,
        isNewRecord,
        milestoneReached
      );

      return {
        currentStreak,
        longestStreak,
        isNewRecord,
        milestoneReached,
        achievementEarned,
        message,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error updating streak');
      throw error;
    }
  }

  /**
   * Check if user is about to lose streak
   */
  async checkStreakRisk(userId: string): Promise<StreakRisk | null> {
    try {
      logger.debug({ userId }, 'Checking streak risk');

      const { data: streak, error } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !streak) {
        return null;
      }

      const streakData = streak as any;

      if (streakData.current_streak < 7) {
        return null; // Only check for streaks >= 7 days
      }

      const lastLogDate = new Date(streakData.last_checkin_date || new Date());
      const now = new Date();
      const hoursSinceLastLog = Math.floor(
        (now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60)
      );

      // Check if more than 20 hours since last log
      if (hoursSinceLastLog >= 20 && hoursSinceLastLog < 24) {
        const hoursUntilLoss = 24 - hoursSinceLastLog;
        const urgencyLevel: 'low' | 'medium' | 'high' =
          hoursUntilLoss <= 2 ? 'high' : hoursUntilLoss <= 4 ? 'medium' : 'low';

        return {
          currentStreak: streakData.current_streak,
          hoursUntilLoss,
          hasFreeze: streakData.streak_freezes_available > 0,
          urgencyLevel,
        };
      }

      return null;
    } catch (error) {
      logger.error({ error, userId }, 'Error checking streak risk');
      return null;
    }
  }

  /**
   * Use streak freeze
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    try {
      logger.debug({ userId }, 'Using streak freeze');

      const { data: streak, error: fetchError } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !streak) {
        logger.error({ error: fetchError, userId }, 'Streak not found');
        return false;
      }

      const streakData = streak as any;

      if (streakData.streak_freezes_available <= 0) {
        logger.debug({ userId }, 'No streak freezes available');
        return false;
      }

      // Use the freeze - decrement available freezes
      const updateResult = await this.supabase
        .from('user_streaks')
        .update({
          streak_freezes_available: streakData.streak_freezes_available - 1,
          last_checkin_date: new Date().toISOString().split('T')[0], // Extend streak
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateResult.error) {
        logger.error({ error: updateResult.error, userId }, 'Error using streak freeze');
        return false;
      }

      logger.info({ userId }, 'Streak freeze used successfully');
      return true;
    } catch (error) {
      logger.error({ error, userId }, 'Error using streak freeze');
      return false;
    }
  }

  /**
   * Get streak stats
   */
  async getStreakStats(userId: string): Promise<StreakStats> {
    try {
      logger.debug({ userId }, 'Getting streak stats');

      // Get streak data
      const { data: streak, error: streakError } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        throw streakError;
      }

      const streakData = streak as any;

      // Get achievements
      const { data: achievementsData, error: achievementsError } = await this.supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_date', { ascending: false });

      if (achievementsError) {
        logger.error({ error: achievementsError, userId }, 'Error fetching achievements');
      }

      const achievements: Achievement[] = ((achievementsData || []) as any[]).map((a) => ({
        id: a.id,
        type: a.achievement_type,
        tier: a.achievement_tier as 'bronze' | 'silver' | 'gold' | 'platinum',
        earnedDate: new Date(a.earned_date),
        title: this.getAchievementTitle(a.achievement_type),
        description: this.getAchievementDescription(a.achievement_type),
        emoji: this.getAchievementEmoji(a.achievement_type),
      }));

      // Get total meals logged
      const { count: totalMeals } = await this.supabase
        .from('food_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      return {
        currentStreak: streakData?.current_streak ?? 0,
        longestStreak: streakData?.longest_streak ?? 0,
        totalMealsLogged: totalMeals || 0,
        achievements,
        streakFreezesAvailable: streakData?.streak_freezes_available ?? 1,
        daysActive: streakData?.days_active ?? 0,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Error getting streak stats');
      throw error;
    }
  }

  /**
   * Award achievement
   */
  async awardAchievement(
    userId: string,
    achievementType: string
  ): Promise<Achievement> {
    try {
      logger.debug({ userId, achievementType }, 'Awarding achievement');

      // Check if already earned
      const { data: existing } = await this.supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_type', achievementType)
        .single();

      if (existing) {
        const existingData = existing as any;
        logger.debug({ userId, achievementType }, 'Achievement already earned');
        return {
          id: existingData.id,
          type: existingData.achievement_type,
          tier: existingData.achievement_tier as 'bronze' | 'silver' | 'gold' | 'platinum',
          earnedDate: new Date(existingData.earned_date),
          title: this.getAchievementTitle(achievementType),
          description: this.getAchievementDescription(achievementType),
          emoji: this.getAchievementEmoji(achievementType),
        };
      }

      // Award new achievement
      const tier = this.getAchievementTier(achievementType);
      const { data: newAchievement, error } = await this.supabase
        .from('achievements')
        .insert({
          user_id: userId,
          achievement_type: achievementType,
          achievement_tier: tier,
          title: this.getAchievementTitle(achievementType),
          description: this.getAchievementDescription(achievementType),
          emoji: this.getAchievementEmoji(achievementType),
          earned_date: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;
      if (!newAchievement) throw new Error('Failed to create achievement');

      const achievementData = newAchievement as any;
      logger.info({ userId, achievementType }, 'Achievement awarded');

      return {
        id: achievementData.id,
        type: achievementType,
        tier: tier as 'bronze' | 'silver' | 'gold' | 'platinum',
        earnedDate: new Date(achievementData.earned_date),
        title: this.getAchievementTitle(achievementType),
        description: this.getAchievementDescription(achievementType),
        emoji: this.getAchievementEmoji(achievementType),
      };
    } catch (error) {
      logger.error({ error, userId, achievementType }, 'Error awarding achievement');
      throw error;
    }
  }

  // Helper methods

  private getNextMonday(): string {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  }

  private getMilestoneAchievementType(streak: number): string {
    const milestoneMap: Record<number, string> = {
      3: 'three_day_starter',
      7: 'week_warrior',
      14: 'two_week_champion',
      21: 'three_week_hero',
      30: 'month_master',
      60: 'two_month_legend',
      90: 'three_month_titan',
    };
    return milestoneMap[streak] || 'milestone_achievement';
  }

  private generateStreakMessage(
    streak: number,
    isNewRecord: boolean,
    milestone?: number
  ): string {
    if (milestone) {
      const messages: Record<number, string> = {
        3: '🔥 3-day streak! You\'re building momentum!',
        7: '🎉 Week warrior! 7 days strong!',
        14: '💪 Two weeks! You\'re unstoppable!',
        21: '🌟 Three weeks! Amazing consistency!',
        30: '🏆 30 days! You\'re a champion!',
        60: '👑 60 days! Legendary dedication!',
        90: '🚀 90 days! You\'re a titan!',
      };
      return messages[milestone] || `🔥 ${streak}-day streak!`;
    }

    if (isNewRecord) {
      return `🎊 New record! ${streak}-day streak!`;
    }

    if (streak > 1) {
      return `🔥 ${streak}-day streak! Keep it going!`;
    }

    return '';
  }

  private getAchievementTier(type: string): string {
    const tierMap: Record<string, string> = {
      first_meal: 'bronze',
      strong_start: 'bronze',
      three_day_starter: 'bronze',
      week_warrior: 'silver',
      two_week_champion: 'silver',
      three_week_hero: 'gold',
      month_master: 'gold',
      two_month_legend: 'platinum',
      three_month_titan: 'platinum',
      comeback_kid: 'silver',
      weekend_warrior: 'bronze',
      full_day: 'bronze',
    };
    return tierMap[type] || 'bronze';
  }

  private getAchievementTitle(type: string): string {
    const titleMap: Record<string, string> = {
      first_meal: 'First Step',
      strong_start: 'Strong Start',
      three_day_starter: '3-Day Starter',
      week_warrior: 'Week Warrior',
      two_week_champion: 'Two Week Champion',
      three_week_hero: 'Three Week Hero',
      month_master: 'Month Master',
      two_month_legend: 'Two Month Legend',
      three_month_titan: 'Three Month Titan',
      comeback_kid: 'Comeback Kid',
      weekend_warrior: 'Weekend Warrior',
      full_day: 'Full Day',
    };
    return titleMap[type] || type;
  }

  private getAchievementDescription(type: string): string {
    const descMap: Record<string, string> = {
      first_meal: 'Logged your first meal',
      strong_start: 'Logged 3 meals in your first day',
      three_day_starter: 'Maintained a 3-day streak',
      week_warrior: 'Maintained a 7-day streak',
      two_week_champion: 'Maintained a 14-day streak',
      three_week_hero: 'Maintained a 21-day streak',
      month_master: 'Maintained a 30-day streak',
      two_month_legend: 'Maintained a 60-day streak',
      three_month_titan: 'Maintained a 90-day streak',
      comeback_kid: 'Came back after a break with 3 days',
      weekend_warrior: 'Logged meals on both Saturday and Sunday',
      full_day: 'Logged 3 meals in one day',
    };
    return descMap[type] || 'Achievement unlocked';
  }

  private getAchievementEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      first_meal: '🎯',
      strong_start: '💪',
      three_day_starter: '🔥',
      week_warrior: '⚔️',
      two_week_champion: '🏅',
      three_week_hero: '🦸',
      month_master: '👑',
      two_month_legend: '🌟',
      three_month_titan: '🚀',
      comeback_kid: '💫',
      weekend_warrior: '🎖️',
      full_day: '🌞',
    };
    return emojiMap[type] || '🏆';
  }
}
