import { redis } from '@/lib/redis/client';
import { env } from '@/config/env';
import type { FoodRecognitionResult, HealthProfile } from '@/types';

/**
 * Cache key prefixes for different data types
 */
const CACHE_KEYS = {
  FOOD_RECOGNITION: 'food:recognition:',
  USER_PROFILE: 'user:profile:',
  COMMON_FOOD: 'nutrition:common:',
  CACHE_METRICS: 'metrics:cache:',
} as const;

/**
 * TTL (Time To Live) in seconds for different cache types
 */
const CACHE_TTL = {
  FOOD_RECOGNITION: 7 * 24 * 60 * 60, // 7 days
  USER_PROFILE: 60 * 60, // 1 hour
  COMMON_FOOD: 30 * 24 * 60 * 60, // 30 days
} as const;

/**
 * Cache metrics for monitoring cache performance
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  lastUpdated: string;
}

/**
 * CacheManager handles all caching operations using Upstash Redis
 * 
 * Features:
 * - Food recognition result caching (7 days TTL)
 * - User health profile caching (1 hour TTL)
 * - Common food nutrition data caching (30 days TTL)
 * - Cache hit/miss metrics tracking
 * - Proper error handling with fallback
 */
export class CacheManager {
  private enabled: boolean;

  constructor() {
    this.enabled = env.ENABLE_CACHING;
  }

  /**
   * Get cached food recognition result by image hash
   * Fixed: Issue #8 - Added optional userId for personalized caching
   * @param imageHash - SHA256 hash of the image
   * @param userId - Optional user ID for personalized results
   * @returns Cached result or null if not found
   */
  async getFoodRecognition(
    imageHash: string,
    userId?: string
  ): Promise<FoodRecognitionResult | null> {
    if (!this.enabled) return null;

    try {
      const key = this.generateFoodRecognitionKey(imageHash, userId);
      const cached = await redis.get<string>(key);
      
      if (cached) {
        await this.recordCacheHit('food_recognition');
        return JSON.parse(cached) as FoodRecognitionResult;
      }
      
      await this.recordCacheMiss('food_recognition');
      return null;
    } catch (error) {
      await this.recordCacheError('food_recognition', error);
      console.error('Error getting cached food recognition:', error);
      return null;
    }
  }

  /**
   * Cache food recognition result
   * Fixed: Issue #8 - Added optional userId for personalized caching
   * @param imageHash - SHA256 hash of the image
   * @param result - Recognition result to cache
   * @param userId - Optional user ID for personalized results
   */
  async setFoodRecognition(
    imageHash: string,
    result: FoodRecognitionResult,
    userId?: string
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = this.generateFoodRecognitionKey(imageHash, userId);
      await redis.setex(
        key,
        CACHE_TTL.FOOD_RECOGNITION,
        JSON.stringify(result)
      );
    } catch (error) {
      await this.recordCacheError('food_recognition', error);
      console.error('Error caching food recognition:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Generate cache key for food recognition
   * Fixed: Issue #8 - Includes userId for personalized results
   * @param imageHash - SHA256 hash of the image
   * @param userId - Optional user ID
   * @returns Cache key
   */
  private generateFoodRecognitionKey(imageHash: string, userId?: string): string {
    // For now, we cache only the recognition result (not the health rating)
    // Health rating is personalized and calculated on-demand
    // If we want to cache personalized results in the future, include userId
    if (userId) {
      return `${CACHE_KEYS.FOOD_RECOGNITION}${imageHash}:${userId}`;
    }
    return `${CACHE_KEYS.FOOD_RECOGNITION}${imageHash}`;
  }

  /**
   * Get cached user health profile
   * @param userId - User ID
   * @returns Cached profile or null if not found
   */
  async getUserProfile(userId: string): Promise<HealthProfile | null> {
    if (!this.enabled) return null;

    try {
      const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
      const cached = await redis.get<string>(key);
      
      if (cached) {
        await this.recordCacheHit('user_profile');
        return JSON.parse(cached) as HealthProfile;
      }
      
      await this.recordCacheMiss('user_profile');
      return null;
    } catch (error) {
      await this.recordCacheError('user_profile', error);
      console.error('Error getting cached user profile:', error);
      return null;
    }
  }

  /**
   * Cache user health profile
   * @param userId - User ID
   * @param profile - Health profile to cache
   */
  async setUserProfile(userId: string, profile: HealthProfile): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
      await redis.setex(
        key,
        CACHE_TTL.USER_PROFILE,
        JSON.stringify(profile)
      );
    } catch (error) {
      await this.recordCacheError('user_profile', error);
      console.error('Error caching user profile:', error);
    }
  }

  /**
   * Invalidate user profile cache (e.g., after profile update)
   * @param userId - User ID
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = `${CACHE_KEYS.USER_PROFILE}${userId}`;
      await redis.del(key);
    } catch (error) {
      console.error('Error invalidating user profile cache:', error);
    }
  }

  /**
   * Invalidate food recognition cache (e.g., after inaccurate feedback)
   * Fixed: Issue #3 - Cache not invalidated when user reports inaccurate recognition
   * @param imageHash - SHA256 hash of the image
   */
  async invalidateFoodRecognition(imageHash: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = `${CACHE_KEYS.FOOD_RECOGNITION}${imageHash}`;
      await redis.del(key);
      
      console.log('Food recognition cache invalidated', { imageHash });
    } catch (error) {
      console.error('Error invalidating food recognition cache:', error);
    }
  }

  /**
   * Invalidate multiple food recognition caches
   * @param imageHashes - Array of image hashes
   */
  async invalidateMultipleFoodRecognitions(imageHashes: string[]): Promise<void> {
    if (!this.enabled) return;
    if (imageHashes.length === 0) return;

    try {
      const keys = imageHashes.map(hash => `${CACHE_KEYS.FOOD_RECOGNITION}${hash}`);
      await redis.del(...keys);
      
      console.log('Multiple food recognition caches invalidated', { count: keys.length });
    } catch (error) {
      console.error('Error invalidating multiple food recognition caches:', error);
    }
  }

  /**
   * Get cached common food nutrition data
   * @param foodName - Normalized food name
   * @returns Cached nutrition data or null if not found
   */
  async getCommonFood(foodName: string): Promise<any | null> {
    if (!this.enabled) return null;

    try {
      const normalizedName = this.normalizeFoodName(foodName);
      const key = `${CACHE_KEYS.COMMON_FOOD}${normalizedName}`;
      const cached = await redis.get<string>(key);
      
      if (cached) {
        await this.recordCacheHit('common_food');
        return JSON.parse(cached);
      }
      
      await this.recordCacheMiss('common_food');
      return null;
    } catch (error) {
      await this.recordCacheError('common_food', error);
      console.error('Error getting cached common food:', error);
      return null;
    }
  }

  /**
   * Cache common food nutrition data
   * @param foodName - Food name
   * @param nutritionData - Nutrition data to cache
   */
  async setCommonFood(foodName: string, nutritionData: any): Promise<void> {
    if (!this.enabled) return;

    try {
      const normalizedName = this.normalizeFoodName(foodName);
      const key = `${CACHE_KEYS.COMMON_FOOD}${normalizedName}`;
      await redis.setex(
        key,
        CACHE_TTL.COMMON_FOOD,
        JSON.stringify(nutritionData)
      );
    } catch (error) {
      await this.recordCacheError('common_food', error);
      console.error('Error caching common food:', error);
    }
  }

  /**
   * Get cache metrics for monitoring
   * @returns Cache metrics including hits, misses, and errors
   */
  async getMetrics(): Promise<CacheMetrics> {
    try {
      const key = CACHE_KEYS.CACHE_METRICS;
      const cached = await redis.get<string>(key);
      
      if (cached) {
        return JSON.parse(cached) as CacheMetrics;
      }
      
      return {
        hits: 0,
        misses: 0,
        errors: 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      return {
        hits: 0,
        misses: 0,
        errors: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Record a cache hit
   */
  private async recordCacheHit(_cacheType: string): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      metrics.hits += 1;
      metrics.lastUpdated = new Date().toISOString();
      
      await redis.setex(
        CACHE_KEYS.CACHE_METRICS,
        24 * 60 * 60, // 24 hours
        JSON.stringify(metrics)
      );
    } catch (error) {
      // Silently fail - metrics shouldn't break the app
      console.error('Error recording cache hit:', error);
    }
  }

  /**
   * Record a cache miss
   */
  private async recordCacheMiss(_cacheType: string): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      metrics.misses += 1;
      metrics.lastUpdated = new Date().toISOString();
      
      await redis.setex(
        CACHE_KEYS.CACHE_METRICS,
        24 * 60 * 60, // 24 hours
        JSON.stringify(metrics)
      );
    } catch (error) {
      console.error('Error recording cache miss:', error);
    }
  }

  /**
   * Record a cache error
   */
  private async recordCacheError(_cacheType: string, _error: unknown): Promise<void> {
    try {
      const metrics = await this.getMetrics();
      metrics.errors += 1;
      metrics.lastUpdated = new Date().toISOString();
      
      await redis.setex(
        CACHE_KEYS.CACHE_METRICS,
        24 * 60 * 60, // 24 hours
        JSON.stringify(metrics)
      );
    } catch (err) {
      console.error('Error recording cache error:', err);
    }
  }

  /**
   * Normalize food name for consistent caching
   * @param foodName - Raw food name
   * @returns Normalized food name (lowercase, trimmed)
   */
  private normalizeFoodName(foodName: string): string {
    return foodName.toLowerCase().trim().replace(/\s+/g, '_');
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    if (!this.enabled) return;

    try {
      // Note: This is a simple implementation
      // In production, you might want to use Redis SCAN for large datasets
      console.warn('Clearing all cache - this operation should be used carefully');
      
      // Clear metrics
      await redis.del(CACHE_KEYS.CACHE_METRICS);
      
      // Note: Upstash Redis doesn't support FLUSHALL in free tier
      // You would need to track keys or use a different approach
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
