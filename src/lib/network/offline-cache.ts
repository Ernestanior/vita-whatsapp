/**
 * 离线缓存管理器
 * 处理本地数据缓存、离线队列
 */

import { logger } from '@/utils/logger';

export interface CacheItem<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

export interface QueuedOperation {
  id: string;
  type: 'upload' | 'sync' | 'request';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export class OfflineCache {
  private cache: Map<string, CacheItem<any>>;
  private queue: QueuedOperation[];
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.cache = new Map();
    this.queue = [];
    this.loadFromStorage();
  }

  /**
   * 缓存用户健康画像
   * 需求 18.3: 缓存用户健康画像
   */
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const key = `profile:${userId}`;
    const item: CacheItem<any> = {
      key,
      value: profile,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.DEFAULT_TTL,
    };

    this.cache.set(key, item);
    await this.saveToStorage();

    logger.info('User profile cached', { userId });
  }

  /**
   * 获取缓存的用户画像
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const key = `profile:${userId}`;
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      await this.saveToStorage();
      return null;
    }

    logger.info('User profile retrieved from cache', { userId });
    return item.value;
  }

  /**
   * 缓存常见食物数据
   * 需求 18.3: 缓存常见食物数据
   */
  async cacheFoodData(foodName: string, data: any): Promise<void> {
    const key = `food:${foodName.toLowerCase()}`;
    const item: CacheItem<any> = {
      key,
      value: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.cache.set(key, item);
    await this.saveToStorage();

    logger.info('Food data cached', { foodName });
  }

  /**
   * 获取缓存的食物数据
   */
  async getCachedFoodData(foodName: string): Promise<any | null> {
    const key = `food:${foodName.toLowerCase()}`;
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      await this.saveToStorage();
      return null;
    }

    logger.info('Food data retrieved from cache', { foodName });
    return item.value;
  }

  /**
   * 缓存历史记录
   */
  async cacheHistory(userId: string, history: any[]): Promise<void> {
    const key = `history:${userId}`;
    const item: CacheItem<any> = {
      key,
      value: history,
      timestamp: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

    this.cache.set(key, item);
    await this.saveToStorage();

    logger.info('History cached', { userId, count: history.length });
  }

  /**
   * 获取缓存的历史记录
   * 需求 18.4: 优先从缓存加载
   */
  async getCachedHistory(userId: string): Promise<any[] | null> {
    const key = `history:${userId}`;
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      await this.saveToStorage();
      return null;
    }

    logger.info('History retrieved from cache', { userId });
    return item.value;
  }

  /**
   * 添加操作到离线队列
   * 需求 18.6: 离线时排队处理
   */
  async queueOperation(
    type: 'upload' | 'sync' | 'request',
    data: any
  ): Promise<string> {
    const operation: QueuedOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3,
    };

    this.queue.push(operation);
    await this.saveToStorage();

    logger.info('Operation queued', { operationId: operation.id, type });
    return operation.id;
  }

  /**
   * 处理离线队列
   */
  async processQueue(
    processor: (operation: QueuedOperation) => Promise<boolean>
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    const remainingQueue: QueuedOperation[] = [];

    for (const operation of this.queue) {
      try {
        logger.info('Processing queued operation', {
          operationId: operation.id,
          type: operation.type,
          retries: operation.retries,
        });

        const success = await processor(operation);

        if (success) {
          processed++;
          logger.info('Operation processed successfully', {
            operationId: operation.id,
          });
        } else {
          // 增加重试次数
          operation.retries++;

          if (operation.retries < operation.maxRetries) {
            remainingQueue.push(operation);
            logger.warn('Operation failed, will retry', {
              operationId: operation.id,
              retries: operation.retries,
            });
          } else {
            failed++;
            logger.error('Operation failed after max retries', {
              operationId: operation.id,
            });
          }
        }
      } catch (error) {
        operation.retries++;

        if (operation.retries < operation.maxRetries) {
          remainingQueue.push(operation);
        } else {
          failed++;
        }

        logger.error('Error processing operation', {
          operationId: operation.id,
          error,
        });
      }
    }

    this.queue = remainingQueue;
    await this.saveToStorage();

    return { processed, failed };
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveToStorage();
    logger.info('Queue cleared');
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // 如果缓存太大，删除最旧的项
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      const toDelete = sortedEntries.slice(
        0,
        this.cache.size - this.MAX_CACHE_SIZE
      );

      toDelete.forEach(([key]) => {
        this.cache.delete(key);
        cleaned++;
      });
    }

    if (cleaned > 0) {
      await this.saveToStorage();
      logger.info('Expired cache cleaned', { cleaned });
    }

    return cleaned;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number;
    queueSize: number;
    oldestItem: number | null;
    newestItem: number | null;
  } {
    const timestamps = Array.from(this.cache.values()).map((item) => item.timestamp);

    return {
      size: this.cache.size,
      queueSize: this.queue.length,
      oldestItem: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestItem: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    this.cache.clear();
    this.queue = [];
    await this.saveToStorage();
    logger.info('All cache cleared');
  }

  /**
   * 保存到持久化存储（浏览器端使用 localStorage）
   */
  private async saveToStorage(): Promise<void> {
    if (typeof window === 'undefined') {
      return; // 服务器端不需要持久化
    }

    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        queue: this.queue,
      };

      localStorage.setItem('vita_offline_cache', JSON.stringify(data));
    } catch (error) {
      logger.error('Error saving cache to storage', { error });
    }
  }

  /**
   * 从持久化存储加载
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('vita_offline_cache');
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);
      this.cache = new Map(data.cache || []);
      this.queue = data.queue || [];

      logger.info('Cache loaded from storage', {
        cacheSize: this.cache.size,
        queueSize: this.queue.length,
      });
    } catch (error) {
      logger.error('Error loading cache from storage', { error });
    }
  }
}

// 导出单例
let offlineCache: OfflineCache | null = null;

export function getOfflineCache(): OfflineCache {
  if (!offlineCache) {
    offlineCache = new OfflineCache();
  }
  return offlineCache;
}
