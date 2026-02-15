/**
 * History Manager
 * Manages food record history queries with pagination and filtering
 * Requirements: 10.2, 10.10
 */

import { createClient } from '@/lib/supabase/server';
import { FoodRecord } from './food-record-manager';
import { logger } from '@/utils/logger';

export interface HistoryQueryParams {
  userId: string;
  page?: number;
  pageSize?: number;
  startDate?: Date;
  endDate?: Date;
  mealContext?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  searchQuery?: string;
}

export interface HistoryResult {
  records: FoodRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DateRangeStats {
  totalMeals: number;
  avgCalories: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
}

export class HistoryManager {
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_PAGE_SIZE = 100;

  /**
   * Query food records with pagination and filters
   * Requirements: 10.2, 10.10
   */
  async queryHistory(params: HistoryQueryParams): Promise<HistoryResult> {
    const {
      userId,
      page = 1,
      pageSize = this.DEFAULT_PAGE_SIZE,
      startDate,
      endDate,
      mealContext,
      searchQuery,
    } = params;

    try {
      logger.info({ userId, page, pageSize }, 'Querying food history');

      const supabase: any = await createClient();

      // Validate and limit page size
      const limitedPageSize = Math.min(pageSize, this.MAX_PAGE_SIZE);
      const offset = (page - 1) * limitedPageSize;

      // Build query
      let query = supabase
        .from('food_records')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      if (mealContext) {
        query = query.eq('meal_context', mealContext);
      }

      // Search in food names (using JSONB query)
      if (searchQuery) {
        // Search in recognition_result.foods array for food names
        query = query.or(
          `recognition_result->foods->0->name.ilike.%${searchQuery}%,` +
          `recognition_result->foods->0->nameLocal.ilike.%${searchQuery}%`
        );
      }

      // Apply pagination and ordering
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limitedPageSize - 1);

      if (error) {
        throw new Error(`Failed to query history: ${error.message}`);
      }

      const records: FoodRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        imageUrl: row.image_url,
        imageHash: row.image_hash,
        recognitionResult: row.recognition_result,
        healthRating: row.health_rating,
        mealContext: row.meal_context,
        createdAt: new Date(row.created_at),
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / limitedPageSize);

      logger.info(
        { userId, recordsCount: records.length, total, page },
        'History query completed'
      );

      return {
        records,
        total,
        page,
        pageSize: limitedPageSize,
        totalPages,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to query history');
      throw error;
    }
  }

  /**
   * Get records for a specific date
   * Requirements: 10.2
   */
  async getRecordsByDate(userId: string, date: Date): Promise<FoodRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.queryHistory({
      userId,
      startDate: startOfDay,
      endDate: endOfDay,
      pageSize: this.MAX_PAGE_SIZE,
    });

    return result.records;
  }

  /**
   * Get statistics for a date range
   * Requirements: 10.2
   */
  async getDateRangeStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DateRangeStats> {
    try {
      const supabase: any = await createClient();

      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: userId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      });

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      const stats = data[0] || {
        total_meals: 0,
        avg_calories: 0,
        green_count: 0,
        yellow_count: 0,
        red_count: 0,
      };

      return {
        totalMeals: stats.total_meals,
        avgCalories: stats.avg_calories,
        greenCount: stats.green_count,
        yellowCount: stats.yellow_count,
        redCount: stats.red_count,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get date range stats');
      throw error;
    }
  }

  /**
   * Get recent records
   * Requirements: 10.2
   */
  async getRecentRecords(userId: string, limit: number = 10): Promise<FoodRecord[]> {
    const result = await this.queryHistory({
      userId,
      page: 1,
      pageSize: limit,
    });

    return result.records;
  }

  /**
   * Search records by food name
   * Requirements: 10.10
   */
  async searchRecords(userId: string, searchQuery: string, limit: number = 20): Promise<FoodRecord[]> {
    const result = await this.queryHistory({
      userId,
      searchQuery,
      page: 1,
      pageSize: limit,
    });

    return result.records;
  }

  /**
   * Get records by meal context
   * Requirements: 10.2
   */
  async getRecordsByMealContext(
    userId: string,
    mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    limit: number = 20
  ): Promise<FoodRecord[]> {
    const result = await this.queryHistory({
      userId,
      mealContext,
      page: 1,
      pageSize: limit,
    });

    return result.records;
  }

  /**
   * Get total record count for user
   * Requirements: 10.2
   */
  async getTotalRecordCount(userId: string): Promise<number> {
    try {
      const supabase: any = await createClient();

      const { count, error } = await supabase
        .from('food_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to get record count: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get total record count');
      throw error;
    }
  }
}

export const historyManager = new HistoryManager();
