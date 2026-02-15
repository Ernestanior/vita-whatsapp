/**
 * API 速率限制器
 * 使用 Upstash Redis 实现分布式速率限制
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * 检查速率限制
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 10, // 最多 10 次请求
  }
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // 使用 Redis sorted set 存储请求时间戳
    // 1. 移除过期的请求记录
    await redis.zremrangebyscore(key, 0, windowStart);

    // 2. 获取当前窗口内的请求数
    const requestCount = await redis.zcard(key);

    // 3. 检查是否超过限制
    if (requestCount >= config.maxRequests) {
      // 获取最早的请求时间，计算重置时间
      const oldestRequest = await redis.zrange(key, 0, 0, { withScores: true });
      const resetAt = oldestRequest.length > 0
        ? new Date(Number(oldestRequest[0].score) + config.windowMs)
        : new Date(now + config.windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // 4. 记录新请求
    await redis.zadd(key, { score: now, member: `${now}:${Math.random()}` });

    // 5. 设置过期时间（窗口大小 + 1 分钟缓冲）
    await redis.expire(key, Math.ceil(config.windowMs / 1000) + 60);

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetAt: new Date(now + config.windowMs),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // 发生错误时允许请求通过，避免阻塞正常用户
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * 速率限制中间件（用于 API 路由）
 */
export function createRateLimitMiddleware(config?: RateLimitConfig) {
  return async (identifier: string): Promise<RateLimitResult> => {
    return checkRateLimit(identifier, config);
  };
}

/**
 * 根据用户 ID 检查速率限制
 */
export async function checkUserRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(`user:${userId}`, {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 10, // 每用户每分钟最多 10 次请求
  });
}

/**
 * 根据 IP 地址检查速率限制（用于未认证请求）
 */
export async function checkIpRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`ip:${ip}`, {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 20, // 每 IP 每分钟最多 20 次请求
  });
}
