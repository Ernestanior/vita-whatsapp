/**
 * Sentry 错误追踪和监控
 * 配置 Sentry 用于错误追踪、性能监控和自定义指标
 */

import * as Sentry from '@sentry/nextjs';
import { env } from '@/config/env';

/**
 * 初始化 Sentry
 * 在应用启动时调用
 */
export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // 性能监控采样率
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // 错误采样率
    sampleRate: 1.0,

    // 启用性能监控
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', env.NEXT_PUBLIC_URL],
      }),
    ],

    // 过滤敏感信息
    beforeSend(event, hint) {
      // 移除敏感的请求头
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // 移除敏感的请求数据
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.phone_number) data.phone_number = '[REDACTED]';
        if (data.email) data.email = '[REDACTED]';
      }

      // 移除敏感的上下文数据
      if (event.contexts?.user) {
        const user = event.contexts.user as any;
        if (user.phone_number) user.phone_number = '[REDACTED]';
        if (user.email) user.email = '[REDACTED]';
      }

      return event;
    },

    // 忽略特定错误
    ignoreErrors: [
      // 浏览器扩展错误
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // 网络错误
      'NetworkError',
      'Network request failed',
      // 取消的请求
      'AbortError',
      'Request aborted',
    ],
  });
}

/**
 * 设置用户上下文
 * 用于关联错误到特定用户
 */
export function setUserContext(userId: string, userData?: {
  username?: string;
  tier?: string;
  language?: string;
}) {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
}

/**
 * 清除用户上下文
 * 用户登出时调用
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * 设置标签
 * 用于分类和过滤错误
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * 设置上下文
 * 添加额外的调试信息
 */
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

/**
 * 捕获异常
 * 手动报告错误到 Sentry
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * 捕获消息
 * 报告非错误的重要事件
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * 添加面包屑
 * 记录用户操作轨迹
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, any>;
}) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * 开始事务
 * 用于性能监控
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * 记录自定义指标
 */
export interface CustomMetrics {
  // API 调用指标
  apiCallCount: number;
  apiCallDuration: number;
  apiCallCost: number;

  // 缓存指标
  cacheHitRate: number;
  cacheHitCount: number;
  cacheMissCount: number;

  // 成本指标
  dailyCost: number;
  monthlyCost: number;

  // 用户指标
  activeUsers: number;
  newUsers: number;
}

/**
 * 追踪 API 调用指标
 */
export function trackAPICall(params: {
  model: string;
  tokensUsed: number;
  cost: number;
  duration: number;
  success: boolean;
}) {
  // 添加面包屑
  addBreadcrumb({
    message: 'API Call',
    category: 'api',
    level: params.success ? 'info' : 'error',
    data: {
      model: params.model,
      tokensUsed: params.tokensUsed,
      cost: params.cost,
      duration: params.duration,
      success: params.success,
    },
  });

  // 设置标签
  setTag('api.model', params.model);
  setTag('api.success', params.success.toString());

  // 记录性能指标
  if (typeof Sentry.metrics !== 'undefined') {
    Sentry.metrics.increment('api.calls', 1, {
      tags: { model: params.model, success: params.success.toString() },
    });
    Sentry.metrics.distribution('api.duration', params.duration, {
      tags: { model: params.model },
      unit: 'millisecond',
    });
    Sentry.metrics.distribution('api.cost', params.cost, {
      tags: { model: params.model },
      unit: 'none',
    });
  }
}

/**
 * 追踪缓存命中率
 */
export function trackCacheHit(hit: boolean, key?: string) {
  addBreadcrumb({
    message: hit ? 'Cache Hit' : 'Cache Miss',
    category: 'cache',
    level: 'debug',
    data: { hit, key },
  });

  if (typeof Sentry.metrics !== 'undefined') {
    Sentry.metrics.increment('cache.requests', 1, {
      tags: { hit: hit.toString() },
    });
  }
}

/**
 * 追踪成本指标
 */
export function trackCost(params: {
  type: 'daily' | 'monthly';
  amount: number;
  userId?: string;
}) {
  if (typeof Sentry.metrics !== 'undefined') {
    Sentry.metrics.gauge(`cost.${params.type}`, params.amount, {
      tags: params.userId ? { userId: params.userId } : undefined,
      unit: 'none',
    });
  }

  // 如果成本异常高，发送告警
  if (params.type === 'daily' && params.amount > env.MAX_DAILY_COST) {
    captureMessage(
      `Daily cost exceeded budget: $${params.amount} > $${env.MAX_DAILY_COST}`,
      'warning',
      {
        cost: {
          type: params.type,
          amount: params.amount,
          budget: env.MAX_DAILY_COST,
          userId: params.userId,
        },
      }
    );
  }
}

/**
 * 追踪用户活动
 */
export function trackUserActivity(params: {
  userId: string;
  action: string;
  metadata?: Record<string, any>;
}) {
  addBreadcrumb({
    message: `User Action: ${params.action}`,
    category: 'user',
    level: 'info',
    data: {
      userId: params.userId,
      action: params.action,
      ...params.metadata,
    },
  });
}

/**
 * 追踪错误率
 */
export function trackErrorRate(errorCount: number, totalRequests: number) {
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

  if (typeof Sentry.metrics !== 'undefined') {
    Sentry.metrics.gauge('error.rate', errorRate, {
      unit: 'percent',
    });
  }

  // 如果错误率超过 5%，发送告警
  if (errorRate > 5) {
    captureMessage(
      `Error rate exceeded threshold: ${errorRate.toFixed(2)}% > 5%`,
      'error',
      {
        errorRate: {
          errorCount,
          totalRequests,
          rate: errorRate,
        },
      }
    );
  }
}
