import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CacheManager } from '../cache-manager';
import { redis } from '@/lib/redis/client';

// Mock Redis client
jest.mock('@/lib/redis/client', () => ({
  redis: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock environment
jest.mock('@/config/env', () => ({
  env: {
    ENABLE_CACHING: true,
  },
}));

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
    jest.clearAllMocks();
  });

  describe('Food Recognition Caching', () => {
    it('should return null when cache miss', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      const result = await cacheManager.getFoodRecognition('test-hash');

      expect(result).toBeNull();
      expect(redis.get).toHaveBeenCalledWith('food:recognition:test-hash');
    });

    it('should return cached result when cache hit', async () => {
      const mockResult = {
        foods: [
          {
            name: 'Chicken Rice',
            confidence: 95,
            nutrition: {
              calories: { min: 500, max: 600 },
            },
          },
        ],
      };

      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(JSON.stringify(mockResult));

      const result = await cacheManager.getFoodRecognition('test-hash');

      expect(result).toEqual(mockResult);
    });

    it('should cache food recognition result with correct TTL', async () => {
      const mockResult = {
        foods: [{ name: 'Laksa', confidence: 90 }],
      };

      await cacheManager.setFoodRecognition('test-hash', mockResult as any);

      expect(redis.setex).toHaveBeenCalledWith(
        'food:recognition:test-hash',
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify(mockResult)
      );
    });

    it('should handle cache errors gracefully', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockRejectedValue(new Error('Redis error'));

      const result = await cacheManager.getFoodRecognition('test-hash');

      expect(result).toBeNull();
      // Should not throw
    });
  });

  describe('User Profile Caching', () => {
    it('should return null when profile not cached', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      const result = await cacheManager.getUserProfile('user-123');

      expect(result).toBeNull();
      expect(redis.get).toHaveBeenCalledWith('user:profile:user-123');
    });

    it('should return cached profile when available', async () => {
      const mockProfile = {
        userId: 'user-123',
        height: 170,
        weight: 70,
        goal: 'lose-weight',
      };

      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(JSON.stringify(mockProfile));

      const result = await cacheManager.getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
    });

    it('should cache user profile with 1 hour TTL', async () => {
      const mockProfile = {
        userId: 'user-123',
        height: 170,
        weight: 70,
      };

      await cacheManager.setUserProfile('user-123', mockProfile as any);

      expect(redis.setex).toHaveBeenCalledWith(
        'user:profile:user-123',
        60 * 60, // 1 hour
        JSON.stringify(mockProfile)
      );
    });

    it('should invalidate user profile cache', async () => {
      await cacheManager.invalidateUserProfile('user-123');

      expect(redis.del).toHaveBeenCalledWith('user:profile:user-123');
    });
  });

  describe('Common Food Caching', () => {
    it('should normalize food names', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      await cacheManager.getCommonFood('Chicken Rice');

      expect(redis.get).toHaveBeenCalledWith('nutrition:common:chicken_rice');
    });

    it('should cache common food with 30 days TTL', async () => {
      const mockNutrition = {
        calories: { min: 500, max: 600 },
        protein: { min: 25, max: 30 },
      };

      await cacheManager.setCommonFood('Chicken Rice', mockNutrition);

      expect(redis.setex).toHaveBeenCalledWith(
        'nutrition:common:chicken_rice',
        30 * 24 * 60 * 60, // 30 days
        JSON.stringify(mockNutrition)
      );
    });

    it('should handle spaces and special characters in food names', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      await cacheManager.getCommonFood('  Bak Chor  Mee  ');

      expect(redis.get).toHaveBeenCalledWith('nutrition:common:bak_chor_mee');
    });
  });

  describe('Cache Metrics', () => {
    it('should return default metrics when none exist', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(null);

      const metrics = await cacheManager.getMetrics();

      expect(metrics).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        lastUpdated: expect.any(String),
      });
    });

    it('should return existing metrics', async () => {
      const mockMetrics = {
        hits: 100,
        misses: 20,
        errors: 5,
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };

      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValue(JSON.stringify(mockMetrics));

      const metrics = await cacheManager.getMetrics();

      expect(metrics).toEqual(mockMetrics);
    });

    it('should track cache hits', async () => {
      const mockResult = { foods: [] };
      
      // First call to get metrics
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValueOnce(
        JSON.stringify({ hits: 0, misses: 0, errors: 0, lastUpdated: '2024-01-01' })
      );
      
      // Second call for food recognition
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValueOnce(JSON.stringify(mockResult));

      await cacheManager.getFoodRecognition('test-hash');

      // Should update metrics with incremented hits
      expect(redis.setex).toHaveBeenCalledWith(
        'metrics:cache:',
        24 * 60 * 60,
        expect.stringContaining('"hits":1')
      );
    });

    it('should track cache misses', async () => {
      // First call to get metrics
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValueOnce(
        JSON.stringify({ hits: 0, misses: 0, errors: 0, lastUpdated: '2024-01-01' })
      );
      
      // Second call for food recognition (miss)
      (redis.get as jest.MockedFunction<typeof redis.get>).mockResolvedValueOnce(null);

      await cacheManager.getFoodRecognition('test-hash');

      // Should update metrics with incremented misses
      expect(redis.setex).toHaveBeenCalledWith(
        'metrics:cache:',
        24 * 60 * 60,
        expect.stringContaining('"misses":1')
      );
    });
  });

  describe('Error Handling', () => {
    it('should not throw when cache read fails', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockRejectedValue(new Error('Connection error'));

      await expect(
        cacheManager.getFoodRecognition('test-hash')
      ).resolves.toBeNull();
    });

    it('should not throw when cache write fails', async () => {
      (redis.setex as jest.MockedFunction<typeof redis.setex>).mockRejectedValue(new Error('Connection error'));

      await expect(
        cacheManager.setFoodRecognition('test-hash', { foods: [] } as any)
      ).resolves.toBeUndefined();
    });

    it('should handle metrics errors gracefully', async () => {
      (redis.get as jest.MockedFunction<typeof redis.get>).mockRejectedValue(new Error('Metrics error'));

      const metrics = await cacheManager.getMetrics();

      expect(metrics).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        lastUpdated: expect.any(String),
      });
    });
  });

  describe('Cache Disabled', () => {
    it('should skip caching when disabled', async () => {
      // Mock environment with caching disabled
      jest.resetModules();
      jest.doMock('@/config/env', () => ({
        env: {
          ENABLE_CACHING: false,
        },
      }));

      const disabledCache = new CacheManager();

      const result = await disabledCache.getFoodRecognition('test-hash');

      expect(result).toBeNull();
      expect(redis.get).not.toHaveBeenCalled();
    });
  });
});
