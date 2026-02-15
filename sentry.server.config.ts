/**
 * Sentry 服务端配置
 * 用于 Next.js 服务端和 API 路由的错误追踪
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 性能监控采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 启用性能监控
  integrations: [
    Sentry.httpIntegration(),
  ],

  // 过滤敏感信息
  beforeSend(event) {
    // 移除敏感的环境变量
    if (event.contexts?.runtime?.env) {
      const env = event.contexts.runtime.env as any;
      delete env.OPENAI_API_KEY;
      delete env.WHATSAPP_TOKEN;
      delete env.SUPABASE_SERVICE_KEY;
      delete env.STRIPE_SECRET_KEY;
      delete env.STRIPE_WEBHOOK_SECRET;
      delete env.ENCRYPTION_KEY;
      delete env.UPSTASH_REDIS_TOKEN;
    }

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

    return event;
  },

  // 忽略特定错误
  ignoreErrors: [
    'NetworkError',
    'Network request failed',
    'AbortError',
    'Request aborted',
  ],
});
