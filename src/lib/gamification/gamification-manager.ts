/**
 * 游戏化管理器
 * 处理打卡、成就、目标和排行榜
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string | null;
  totalCheckins: number;
  isNewRecord: boolean;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlockedAt?: string;
}

export interface WeeklyGoal {
  id: string;
  goalType: string;
  targetValue: number;
  currentValue: number;
  status: 'active' | 'completed' | 'failed';
  weekStartDate: string;
  progress: number; // 百分比
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  healthScore: number;
  totalPoints: number;
}

export class GamificationManager {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 更新用户打卡记录
   */
  async updateStreak(userId: string): Promise<StreakData | null> {
    try {
      const { data, error } = await this.supabase.rpc('update_user_streak', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Failed to update streak', { error, userId });
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      
      // 获取完整的打卡数据
      const { data: streakData } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      logger.info('Streak updated', {
        userId,
        currentStreak: result.current_streak,
        isNewRecord: result.is_new_record,
      });

      return {
        currentStreak: result.current_streak,
        longestStreak: result.longest_streak,
        lastCheckinDate: streakData?.last_checkin_date || null,
        totalCheckins: streakData?.total_checkins || 0,
        isNewRecord: result.is_new_record,
      };
    } catch (error) {
      logger.error('Error updating streak', { error, userId });
      return null;
    }
  }

  /**
   * 获取用户打卡数据
   */
  async getUserStreak(userId: string): Promise<StreakData | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // 如果记录不存在，返回默认值
        if (error.code === 'PGRST116') {
          return {
            currentStreak: 0,
            longestStreak: 0,
            lastCheckinDate: null,
            totalCheckins: 0,
            isNewRecord: false,
          };
        }
        throw error;
      }

      return {
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastCheckinDate: data.last_checkin_date,
        totalCheckins: data.total_checkins,
        isNewRecord: false,
      };
    } catch (error) {
      logger.error('Error getting user streak', { error, userId });
      return null;
    }
  }

  /**
   * Generate streak message with translations
   */
  generateStreakMessage(streakData: StreakData, language: string = 'en'): string {
    const { currentStreak, isNewRecord } = streakData;

    const translations: Record<string, Record<string, string>> = {
      en: {
        new_record: `🎉 New Record! ${currentStreak} day streak!`,
        continue: `🔥 ${currentStreak} day streak! Keep it up!`,
        milestone_7: 'Week Warrior achievement unlocked!',
        milestone_30: 'Month Master achievement unlocked!',
        milestone_100: 'Century Champion achievement unlocked!',
      },
      'zh-CN': {
        new_record: `🎉 新纪录！连续打卡 ${currentStreak} 天！`,
        continue: `🔥 连续打卡 ${currentStreak} 天！继续保持！`,
        milestone_7: '解锁成就：一周战士！',
        milestone_30: '解锁成就：月度大师！',
        milestone_100: '解锁成就：百日冠军！',
      },
      'zh-TW': {
        new_record: `🎉 新紀錄！連續打卡 ${currentStreak} 天！`,
        continue: `🔥 連續打卡 ${currentStreak} 天！繼續保持！`,
        milestone_7: '解鎖成就：一週戰士！',
        milestone_30: '解鎖成就：月度大師！',
        milestone_100: '解鎖成就：百日冠軍！',
      },
    };

    const lang = translations[language] || translations['en'];
    let message = '';

    if (isNewRecord) {
      message = lang.new_record;
    } else {
      message = lang.continue;
    }

    // Add milestone congratulations
    if (currentStreak === 7) {
      message += '\n\n🎉 ' + lang.milestone_7;
    } else if (currentStreak === 30) {
      message += '\n\n🏆 ' + lang.milestone_30;
    } else if (currentStreak === 100) {
      message += '\n\n👑 ' + lang.milestone_100;
    }

    return message;
  }

  /**
   * 检查并解锁成就
   * Fixed: Issue #6 - Added duplicate prevention using ON CONFLICT
   */
  async checkAndUnlockAchievements(userId: string, language: string = 'en'): Promise<Achievement[]> {
    try {
      const unlockedAchievements: Achievement[] = [];

      // 获取用户统计数据
      const streakData = await this.getUserStreak(userId);
      
      // 获取所有成就
      const { data: allAchievements } = await this.supabase
        .from('achievements')
        .select('*');

      // 获取已解锁的成就
      const { data: userAchievements } = await this.supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);

      const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);

      // 检查每个成就
      for (const achievement of allAchievements || []) {
        if (unlockedIds.has(achievement.id)) continue;

        let shouldUnlock = false;

        // 检查打卡成就
        if (achievement.requirement_type === 'consecutive_days') {
          shouldUnlock = (streakData?.currentStreak || 0) >= achievement.requirement_value;
        }

        // 如果应该解锁
        if (shouldUnlock) {
          // 使用 ON CONFLICT DO NOTHING 防止重复插入
          const { data, error } = await this.supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
              notified: false,
            })
            .select()
            .single();

          // 只有成功插入时才添加到结果（error.code === '23505' 表示唯一约束冲突）
          if (data && !error) {
            const nameKey = `name_${language.replace('-', '_')}` as keyof typeof achievement;
            const descKey = `description_${language.replace('-', '_')}` as keyof typeof achievement;

            unlockedAchievements.push({
              id: achievement.id,
              code: achievement.code,
              name: achievement[nameKey] as string || achievement.name_en,
              description: achievement[descKey] as string || achievement.description_en,
              icon: achievement.icon,
              category: achievement.category,
              points: achievement.points,
            });

            logger.info('Achievement unlocked', {
              userId,
              achievementCode: achievement.code,
              achievementId: achievement.id,
            });
          } else if (error && error.code !== '23505') {
            // 如果不是唯一约束错误，记录日志
            logger.error('Failed to unlock achievement', {
              userId,
              achievementId: achievement.id,
              error: error.message,
              errorCode: error.code,
            });
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Error checking achievements', { error, userId });
      return [];
    }
  }

  /**
   * 获取用户所有成就
   */
  async getUserAchievements(userId: string, language: string = 'en'): Promise<Achievement[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_achievements')
        .select('*, achievements(*)')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;

      const nameKey = `name_${language.replace('-', '_')}`;
      const descKey = `description_${language.replace('-', '_')}`;

      return (data || []).map((ua: any) => ({
        id: ua.achievements.id,
        code: ua.achievements.code,
        name: ua.achievements[nameKey] || ua.achievements.name_en,
        description: ua.achievements[descKey] || ua.achievements.description_en,
        icon: ua.achievements.icon,
        category: ua.achievements.category,
        points: ua.achievements.points,
        unlockedAt: ua.unlocked_at,
      }));
    } catch (error) {
      logger.error('Error getting user achievements', { error, userId });
      return [];
    }
  }

  /**
   * 创建每周目标
   */
  async createWeeklyGoal(
    userId: string,
    goalType: string,
    targetValue: number
  ): Promise<{ success: boolean; goalId?: string }> {
    try {
      // 计算本周开始日期
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // 周一
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('weekly_goals')
        .insert({
          user_id: userId,
          week_start_date: weekStartStr,
          goal_type: goalType,
          target_value: targetValue,
          current_value: 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create weekly goal', { error, userId, goalType });
        throw error;
      }

      logger.info('Weekly goal created', {
        userId,
        goalId: data.id,
        goalType,
        targetValue,
      });

      return { success: true, goalId: data.id };
    } catch (error) {
      logger.error('Error creating weekly goal', { error, userId });
      return { success: false };
    }
  }

  /**
   * 更新每周目标进度
   */
  async updateWeeklyGoalProgress(
    userId: string,
    goalType: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('update_weekly_goal_progress', {
        p_user_id: userId,
        p_goal_type: goalType,
        p_increment: increment,
      });

      if (error) throw error;

      return data || false;
    } catch (error) {
      logger.error('Error updating weekly goal progress', { error, userId, goalType });
      return false;
    }
  }

  /**
   * 获取用户当前每周目标
   */
  async getUserWeeklyGoals(userId: string): Promise<WeeklyGoal[]> {
    try {
      // 计算本周开始日期
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStartStr);

      if (error) throw error;

      return (data || []).map((goal: any) => ({
        id: goal.id,
        goalType: goal.goal_type,
        targetValue: goal.target_value,
        currentValue: goal.current_value,
        status: goal.status,
        weekStartDate: goal.week_start_date,
        progress: Math.min(100, (goal.current_value / goal.target_value) * 100),
      }));
    } catch (error) {
      logger.error('Error getting weekly goals', { error, userId });
      return [];
    }
  }

  /**
   * 更新排行榜
   */
  async updateLeaderboard(
    userId: string,
    healthScore: number,
    totalPoints: number,
    displayName?: string,
    isPublic: boolean = false
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('leaderboard')
        .upsert({
          user_id: userId,
          display_name: displayName || 'Anonymous',
          health_score: healthScore,
          total_points: totalPoints,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return true;
    } catch (error) {
      logger.error('Error updating leaderboard', { error, userId });
      return false;
    }
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard')
        .select('*')
        .eq('is_public', true)
        .order('health_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((entry: any, index: number) => ({
        rank: index + 1,
        displayName: entry.display_name,
        healthScore: entry.health_score,
        totalPoints: entry.total_points,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      return [];
    }
  }
}

// 导出单例
let gamificationManager: GamificationManager | null = null;

export function getGamificationManager(): GamificationManager {
  if (!gamificationManager) {
    gamificationManager = new GamificationManager();
  }
  return gamificationManager;
}
