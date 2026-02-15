/**
 * 负载测试：压力测试
 * 测试高峰时段处理能力、数据库连接池、Redis 缓存性能、Vercel Functions 自动扩展
 */

import { describe, it, expect } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL!;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN!;

describe('Load Testing: Peak Traffic Handling', () => {
  it('should handle 500 concurrent API requests', async () => {
    const concurrentRequests = 500;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 模拟 500 个并发健康检查请求
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch('http://localhost:3000/api/health', {
          method: 'GET',
        }).then((res) => res.json())
      );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('=== Peak Traffic Test ===');
    console.log(`Total requests: ${concurrentRequests}`);
    console.log(`Successful: ${successful} (${((successful / concurrentRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed: ${failed} (${((failed / concurrentRequests) * 100).toFixed(2)}%)`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Average response time: ${(duration / concurrentRequests).toFixed(2)}ms`);
    console.log(`Requests per second: ${((concurrentRequests / duration) * 1000).toFixed(2)}`);

    // 至少 90% 的请求应该成功
    expect(successful / concurrentRequests).toBeGreaterThanOrEqual(0.9);

    // 平均响应时间应该小于 2 秒
    expect(duration / concurrentRequests).toBeLessThan(2000);
  });

  it('should handle sustained load over time', async () => {
    const requestsPerSecond = 10;
    const durationSeconds = 30;
    const totalRequests = requestsPerSecond * durationSeconds;

    const results: { success: boolean; duration: number }[] = [];
    const startTime = Date.now();

    // 模拟持续 30 秒的负载
    for (let i = 0; i < totalRequests; i++) {
      const requestStart = Date.now();

      try {
        await fetch('http://localhost:3000/api/health', {
          method: 'GET',
        });

        results.push({
          success: true,
          duration: Date.now() - requestStart,
        });
      } catch (error) {
        results.push({
          success: false,
          duration: Date.now() - requestStart,
        });
      }

      // 控制请求速率
      const elapsed = Date.now() - startTime;
      const expectedElapsed = (i + 1) * (1000 / requestsPerSecond);
      const delay = expectedElapsed - elapsed;

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    const successful = results.filter((r) => r.success).length;
    const avgResponseTime =
      results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log('=== Sustained Load Test ===');
    console.log(`Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`Total requests: ${totalRequests}`);
    console.log(`Successful: ${successful} (${((successful / totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Actual RPS: ${((totalRequests / totalDuration) * 1000).toFixed(2)}`);

    // 至少 95% 的请求应该成功
    expect(successful / totalRequests).toBeGreaterThanOrEqual(0.95);

    // 平均响应时间应该小于 1 秒
    expect(avgResponseTime).toBeLessThan(1000);
  });
});

describe('Load Testing: Database Connection Pool', () => {
  it('should handle 100 concurrent database queries', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const concurrentQueries = 100;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 模拟 100 个并发数据库查询
    for (let i = 0; i < concurrentQueries; i++) {
      promises.push(
        supabase.from('users').select('id, phone_number').limit(10)
      );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).error === null
    ).length;

    console.log('=== Database Connection Pool Test ===');
    console.log(`Concurrent queries: ${concurrentQueries}`);
    console.log(`Successful: ${successful}`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Average query time: ${(duration / concurrentQueries).toFixed(2)}ms`);

    // 所有查询应该成功
    expect(successful).toBe(concurrentQueries);

    // 平均查询时间应该小于 500ms
    expect(duration / concurrentQueries).toBeLessThan(500);
  });

  it('should handle complex queries under load', async () => {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const queries = 50;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 模拟复杂查询（带 JOIN 和聚合）
    for (let i = 0; i < queries; i++) {
      promises.push(
        supabase
          .from('food_records')
          .select('*, users!inner(phone_number)')
          .order('created_at', { ascending: false })
          .limit(20)
      );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).error === null
    ).length;

    console.log('=== Complex Query Test ===');
    console.log(`Total queries: ${queries}`);
    console.log(`Successful: ${successful}`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Average query time: ${(duration / queries).toFixed(2)}ms`);

    // 至少 95% 的查询应该成功
    expect(successful / queries).toBeGreaterThanOrEqual(0.95);

    // 平均查询时间应该小于 1 秒
    expect(duration / queries).toBeLessThan(1000);
  });
});

describe('Load Testing: Redis Cache Performance', () => {
  it('should handle 1000 concurrent cache operations', async () => {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const operations = 1000;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 模拟 1000 个并发缓存操作（读写混合）
    for (let i = 0; i < operations; i++) {
      if (i % 2 === 0) {
        // 写操作
        promises.push(
          redis.set(`load-test-key-${i}`, JSON.stringify({ data: `value-${i}` }), {
            ex: 60,
          })
        );
      } else {
        // 读操作
        promises.push(redis.get(`load-test-key-${i - 1}`));
      }
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter((r) => r.status === 'fulfilled').length;

    console.log('=== Redis Cache Performance Test ===');
    console.log(`Total operations: ${operations}`);
    console.log(`Successful: ${successful}`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Average operation time: ${(duration / operations).toFixed(2)}ms`);
    console.log(`Operations per second: ${((operations / duration) * 1000).toFixed(2)}`);

    // 清理测试数据
    const cleanupPromises: Promise<any>[] = [];
    for (let i = 0; i < operations; i += 2) {
      cleanupPromises.push(redis.del(`load-test-key-${i}`));
    }
    await Promise.all(cleanupPromises);

    // 至少 98% 的操作应该成功
    expect(successful / operations).toBeGreaterThanOrEqual(0.98);

    // 平均操作时间应该小于 100ms
    expect(duration / operations).toBeLessThan(100);
  });

  it('should maintain performance with large cached values', async () => {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    // 创建大型缓存值（模拟食物识别结果）
    const largeValue = {
      foods: Array.from({ length: 10 }, (_, i) => ({
        name: `Food ${i}`,
        calories: 100 + i * 50,
        protein: 10 + i,
        carbs: 20 + i * 2,
        fat: 5 + i,
        confidence: 0.8 + i * 0.01,
        suggestions: Array.from({ length: 5 }, (_, j) => `Suggestion ${j}`),
      })),
      metadata: {
        timestamp: Date.now(),
        userId: 'test-user',
        imageHash: 'abc123def456',
      },
    };

    const operations = 100;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 写入大型值
    for (let i = 0; i < operations / 2; i++) {
      promises.push(
        redis.set(`large-value-${i}`, JSON.stringify(largeValue), { ex: 60 })
      );
    }

    // 读取大型值
    for (let i = 0; i < operations / 2; i++) {
      promises.push(redis.get(`large-value-${i}`));
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter((r) => r.status === 'fulfilled').length;

    console.log('=== Large Value Cache Test ===');
    console.log(`Value size: ~${JSON.stringify(largeValue).length} bytes`);
    console.log(`Total operations: ${operations}`);
    console.log(`Successful: ${successful}`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Average operation time: ${(duration / operations).toFixed(2)}ms`);

    // 清理
    const cleanupPromises: Promise<any>[] = [];
    for (let i = 0; i < operations / 2; i++) {
      cleanupPromises.push(redis.del(`large-value-${i}`));
    }
    await Promise.all(cleanupPromises);

    // 所有操作应该成功
    expect(successful).toBe(operations);

    // 平均操作时间应该小于 200ms
    expect(duration / operations).toBeLessThan(200);
  });
});

describe('Load Testing: Vercel Functions Auto-scaling', () => {
  it('should scale to handle burst traffic', async () => {
    // 模拟突发流量：快速发送大量请求
    const burstSize = 200;
    const promises: Promise<any>[] = [];

    const startTime = Date.now();

    // 同时发送所有请求（模拟突发）
    for (let i = 0; i < burstSize; i++) {
      promises.push(
        fetch('http://localhost:3000/api/health', {
          method: 'GET',
        })
      );
    }

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const successful = results.filter((r) => r.status === 'fulfilled').length;

    console.log('=== Burst Traffic Test ===');
    console.log(`Burst size: ${burstSize}`);
    console.log(`Successful: ${successful} (${((successful / burstSize) * 100).toFixed(2)}%)`);
    console.log(`Total duration: ${duration}ms`);
    console.log(`Peak RPS: ${((burstSize / duration) * 1000).toFixed(2)}`);

    // 至少 85% 的请求应该成功（允许一些冷启动失败）
    expect(successful / burstSize).toBeGreaterThanOrEqual(0.85);

    // 总时间应该小于 10 秒
    expect(duration).toBeLessThan(10000);
  });

  it('should handle gradual traffic increase', async () => {
    const phases = [
      { rps: 5, duration: 10 }, // 10 秒，每秒 5 个请求
      { rps: 10, duration: 10 }, // 10 秒，每秒 10 个请求
      { rps: 20, duration: 10 }, // 10 秒，每秒 20 个请求
    ];

    const results: { phase: number; success: boolean; duration: number }[] = [];

    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
      const phase = phases[phaseIndex];
      const totalRequests = phase.rps * phase.duration;
      const phaseStartTime = Date.now();

      for (let i = 0; i < totalRequests; i++) {
        const requestStart = Date.now();

        try {
          await fetch('http://localhost:3000/api/health', {
            method: 'GET',
          });

          results.push({
            phase: phaseIndex,
            success: true,
            duration: Date.now() - requestStart,
          });
        } catch (error) {
          results.push({
            phase: phaseIndex,
            success: false,
            duration: Date.now() - requestStart,
          });
        }

        // 控制请求速率
        const elapsed = Date.now() - phaseStartTime;
        const expectedElapsed = (i + 1) * (1000 / phase.rps);
        const delay = expectedElapsed - elapsed;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 分析每个阶段的结果
    phases.forEach((phase, index) => {
      const phaseResults = results.filter((r) => r.phase === index);
      const successful = phaseResults.filter((r) => r.success).length;
      const avgResponseTime =
        phaseResults.reduce((sum, r) => sum + r.duration, 0) / phaseResults.length;

      console.log(`=== Phase ${index + 1}: ${phase.rps} RPS ===`);
      console.log(`Total requests: ${phaseResults.length}`);
      console.log(`Successful: ${successful} (${((successful / phaseResults.length) * 100).toFixed(2)}%)`);
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);

      // 每个阶段至少 90% 的请求应该成功
      expect(successful / phaseResults.length).toBeGreaterThanOrEqual(0.9);
    });
  });
});
