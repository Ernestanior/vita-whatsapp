/**
 * Sentry 客户端配置
 * 用于浏览器端的错误追踪
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 性能监控采样率
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 会话重放采样率
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 启用性能监控
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.com/],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 过滤敏感信息
  beforeSend(event) {
    // 移除敏感的请求头
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
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
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    'MyApp_RemoveAllHighlights',
    'NetworkError',
    'Network request failed',
    'AbortError',
    'Request aborted',
    // React hydration errors (usually not critical)
    'Hydration failed',
    'There was an error while hydrating',
  ],
});
