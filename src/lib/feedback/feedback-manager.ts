/**
 * 用户反馈管理器
 * 处理用户反馈的收集、存储和分析
 * Fixed: Issue #3 - Now invalidates cache when user reports inaccurate recognition
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { cacheManager } from '@/lib/cache/cache-manager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type FeedbackType = 'accurate' | 'inaccurate' | 'general' | 'suggestion';

export interface FeedbackData {
  userId: string;
  foodRecordId?: string;
  feedbackType: FeedbackType;
  rating?: number; // 1-5
  comment?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackStats {
  totalFeedback: number;
  accurateCount: number;
  inaccurateCount: number;
  avgRating: number;
}

export interface MonthlyFeedbackAnalysis {
  feedbackType: FeedbackType;
  count: number;
  avgRating: number;
  commonIssues: string[];
}

export class FeedbackManager {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 提交反馈
   * Fixed: Now invalidates cache when feedback indicates inaccurate recognition
   */
  async submitFeedback(data: FeedbackData): Promise<{ success: boolean; feedbackId?: string }> {
    try {
      // 验证数据
      if (!data.userId) {
        throw new Error('User ID is required');
      }

      if (!['accurate', 'inaccurate', 'general', 'suggestion'].includes(data.feedbackType)) {
        throw new Error('Invalid feedback type');
      }

      if (data.rating && (data.rating < 1 || data.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      // 插入反馈
      const { data: feedback, error } = await this.supabase
        .from('user_feedback')
        .insert({
          user_id: data.userId,
          food_record_id: data.foodRecordId,
          feedback_type: data.feedbackType,
          rating: data.rating,
          comment: data.comment,
          metadata: data.metadata || {},
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to submit feedback', { error, data });
        throw error;
      }

      logger.info('Feedback submitted', {
        feedbackId: feedback.id,
        userId: data.userId,
        type: data.feedbackType,
      });

      // If feedback indicates inaccurate recognition, invalidate cache
      if (data.feedbackType === 'inaccurate' && data.foodRecordId) {
        await this.invalidateCacheForFeedback(data.foodRecordId);
      }

      return {
        success: true,
        feedbackId: feedback.id,
      };
    } catch (error) {
      logger.error('Error submitting feedback', { error, data });
      return { success: false };
    }
  }

  /**
   * Invalidate cache for food record when user reports inaccurate recognition
   * @param foodRecordId - ID of the food record
   */
  private async invalidateCacheForFeedback(foodRecordId: string): Promise<void> {
    try {
      // Get the image hash from the food record
      const { data: record, error } = await this.supabase
        .from('food_records')
        .select('image_hash')
        .eq('id', foodRecordId)
        .single();

      if (error) {
        logger.error('Failed to get food record for cache invalidation', {
          error,
          foodRecordId,
        });
        return;
      }

      if (record?.image_hash) {
        // Invalidate the cache
        await cacheManager.invalidateFoodRecognition(record.image_hash);

        logger.info('Cache invalidated due to inaccurate feedback', {
          foodRecordId,
          imageHash: record.image_hash,
        });
      }
    } catch (error) {
      logger.error('Error invalidating cache for feedback', {
        error,
        foodRecordId,
      });
      // Don't throw - cache invalidation failure shouldn't block feedback submission
    }
  }

  /**
   * 获取用户反馈统计
   */
  async getUserFeedbackStats(userId: string): Promise<FeedbackStats | null> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_feedback_stats', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Failed to get user feedback stats', { error, userId });
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          totalFeedback: 0,
          accurateCount: 0,
          inaccurateCount: 0,
          avgRating: 0,
        };
      }

      const stats = data[0];
      return {
        totalFeedback: parseInt(stats.total_feedback) || 0,
        accurateCount: parseInt(stats.accurate_count) || 0,
        inaccurateCount: parseInt(stats.inaccurate_count) || 0,
        avgRating: parseFloat(stats.avg_rating) || 0,
      };
    } catch (error) {
      logger.error('Error getting user feedback stats', { error, userId });
      return null;
    }
  }

  /**
   * 获取用户最近的反馈
   */
  async getUserRecentFeedback(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_feedback')
        .select('*, food_records(food_name, calories)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get user recent feedback', { error, userId });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting user recent feedback', { error, userId });
      return [];
    }
  }

  /**
   * 获取月度反馈分析
   */
  async getMonthlyFeedbackAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<MonthlyFeedbackAnalysis[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_monthly_feedback_analysis', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      });

      if (error) {
        logger.error('Failed to get monthly feedback analysis', { error });
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting monthly feedback analysis', { error });
      return [];
    }
  }

  /**
   * 获取高频问题
   */
  async getFrequentIssues(limit: number = 10): Promise<{ issue: string; count: number }[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_feedback')
        .select('comment')
        .eq('feedback_type', 'inaccurate')
        .not('comment', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('Failed to get frequent issues', { error });
        throw error;
      }

      // 简单的频率统计（实际应用中可以使用更复杂的 NLP）
      const issueCount: Record<string, number> = {};
      
      data?.forEach((feedback) => {
        const comment = feedback.comment?.toLowerCase() || '';
        // 提取关键词（简化版本）
        const keywords = comment.split(' ').filter((word: string) => word.length > 3);
        keywords.forEach((keyword: string) => {
          issueCount[keyword] = (issueCount[keyword] || 0) + 1;
        });
      });

      // 转换为数组并排序
      const issues = Object.entries(issueCount)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return issues;
    } catch (error) {
      logger.error('Error getting frequent issues', { error });
      return [];
    }
  }

  /**
   * 生成改进建议报告
   */
  async generateImprovementReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: string;
    topIssues: { issue: string; count: number }[];
    recommendations: string[];
  }> {
    try {
      const analysis = await this.getMonthlyFeedbackAnalysis(startDate, endDate);
      const frequentIssues = await this.getFrequentIssues(5);

      // 计算总反馈数
      const totalFeedback = analysis.reduce((sum, item) => sum + item.count, 0);
      const inaccurateFeedback = analysis.find((item) => item.feedbackType === 'inaccurate');
      const inaccurateCount = inaccurateFeedback?.count || 0;
      const accuracyRate = totalFeedback > 0 
        ? ((totalFeedback - inaccurateCount) / totalFeedback * 100).toFixed(1)
        : '0';

      // 生成摘要
      const summary = `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Total Feedback: ${totalFeedback}
Accuracy Rate: ${accuracyRate}%
Average Rating: ${analysis[0]?.avgRating?.toFixed(1) || 'N/A'}`;

      // 生成建议
      const recommendations: string[] = [];

      if (parseFloat(accuracyRate) < 85) {
        recommendations.push('Improve food recognition model accuracy');
        recommendations.push('Add more training data for common foods');
      }

      if (frequentIssues.length > 0) {
        recommendations.push(`Address top issue: ${frequentIssues[0].issue}`);
      }

      if (analysis.some((item) => item.avgRating < 3)) {
        recommendations.push('Improve user experience and response quality');
      }

      return {
        summary,
        topIssues: frequentIssues,
        recommendations,
      };
    } catch (error) {
      logger.error('Error generating improvement report', { error });
      return {
        summary: 'Error generating report',
        topIssues: [],
        recommendations: [],
      };
    }
  }
}

// 导出单例
let feedbackManager: FeedbackManager | null = null;

export function getFeedbackManager(): FeedbackManager {
  if (!feedbackManager) {
    feedbackManager = new FeedbackManager();
  }
  return feedbackManager;
}
