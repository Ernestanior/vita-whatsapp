/**
 * 日志系统
 * 使用 Pino 实现结构化日志，支持 PII 数据脱敏
 */

import pino from 'pino';
import { env } from '@/config/env';

/**
 * PII 数据脱敏规则
 * 自动移除或脱敏敏感信息
 */
const redactPaths = [
  // 用户敏感信息
  'phone_number',
  'phoneNumber',
  'phone',
  'email',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  
  // 请求头
  'headers.authorization',
  'headers.cookie',
  'headers["x-api-key"]',
  
  // 数据库凭证
  'connectionString',
  'databaseUrl',
  
  // 第三方服务密钥
  'stripeKey',
  'openaiKey',
  'supabaseKey',
];

/**
 * 自定义序列化器
 * 用于格式化特定类型的数据
 */
const serializers = {
  err: pino.stdSerializers.err,
  req: pino.stdSerializers.req,
  res: pino.stdSerializers.res,
  
  // 自定义用户序列化器（脱敏）
  user: (user: any) => {
    if (!user) return user;
    return {
      id: user.id,
      tier: user.tier,
      language: user.language,
      // 移除敏感信息
      phone_number: user.phone_number ? '[REDACTED]' : undefined,
      email: user.email ? '[REDACTED]' : undefined,
    };
  },
};

/**
 * 创建 Pino logger 实例
 */
const logger = pino({
  level: env.LOG_LEVEL || 'info',
  
  // 生产环境使用 JSON 格式，开发环境使用美化格式
  ...(env.NODE_ENV === 'production'
    ? {
        // 生产环境配置
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
      }
    : {
        // 开发环境配置（美化输出）
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }),
  
  // 序列化器
  serializers,
  
  // 脱敏配置
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  
  // 基础字段
  base: {
    env: env.NODE_ENV,
    pid: process.pid,
  },
  
  // 时间戳
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * 日志级别类型
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * 日志上下文
 */
export interface LogContext {
  userId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * 创建子 logger
 * 用于特定模块或功能
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

/**
 * 记录 API 调用日志
 */
export function logAPICall(params: {
  userId: string;
  model: string;
  tokensUsed: number;
  cost: number;
  duration: number;
  success: boolean;
  error?: Error;
}) {
  const logData = {
    type: 'ai_api_call',
    userId: params.userId,
    model: params.model,
    tokensUsed: params.tokensUsed,
    cost: params.cost,
    duration: params.duration,
    success: params.success,
  };

  if (params.success) {
    logger.info(logData, 'AI API call completed');
  } else {
    logger.error({ ...logData, err: params.error }, 'AI API call failed');
  }
}

/**
 * 记录用户操作日志
 */
export function logUserAction(params: {
  userId: string;
  action: string;
  metadata?: Record<string, any>;
  duration?: number;
}) {
  logger.info(
    {
      type: 'user_action',
      userId: params.userId,
      action: params.action,
      duration: params.duration,
      ...params.metadata,
    },
    `User action: ${params.action}`
  );
}

/**
 * 记录错误日志
 */
export function logError(params: {
  errorId: string;
  error: Error;
  context?: LogContext;
  userId?: string;
}) {
  logger.error(
    {
      type: 'error',
      errorId: params.errorId,
      err: params.error,
      userId: params.userId,
      ...params.context,
    },
    `Error: ${params.error.message}`
  );
}

/**
 * 记录数据库操作日志
 */
export function logDatabaseOperation(params: {
  operation: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  duration: number;
  success: boolean;
  error?: Error;
  userId?: string;
}) {
  const logData = {
    type: 'database_operation',
    operation: params.operation,
    table: params.table,
    duration: params.duration,
    success: params.success,
    userId: params.userId,
  };

  if (params.success) {
    logger.debug(logData, `Database ${params.operation} on ${params.table}`);
  } else {
    logger.error({ ...logData, err: params.error }, `Database ${params.operation} failed`);
  }
}

/**
 * 记录缓存操作日志
 */
export function logCacheOperation(params: {
  operation: 'get' | 'set' | 'delete';
  key: string;
  hit?: boolean;
  duration?: number;
}) {
  logger.debug(
    {
      type: 'cache_operation',
      operation: params.operation,
      key: params.key,
      hit: params.hit,
      duration: params.duration,
    },
    `Cache ${params.operation}: ${params.key}`
  );
}

/**
 * 记录 Webhook 日志
 */
export function logWebhook(params: {
  source: 'whatsapp' | 'stripe';
  event: string;
  success: boolean;
  duration: number;
  error?: Error;
}) {
  const logData = {
    type: 'webhook',
    source: params.source,
    event: params.event,
    duration: params.duration,
    success: params.success,
  };

  if (params.success) {
    logger.info(logData, `Webhook received: ${params.source} - ${params.event}`);
  } else {
    logger.error({ ...logData, err: params.error }, `Webhook processing failed`);
  }
}

/**
 * 记录安全事件日志
 */
export function logSecurityEvent(params: {
  event: 'rate_limit_exceeded' | 'invalid_signature' | 'unauthorized_access' | 'suspicious_activity';
  userId?: string;
  ip?: string;
  details?: Record<string, any>;
}) {
  logger.warn(
    {
      type: 'security_event',
      event: params.event,
      userId: params.userId,
      ip: params.ip,
      ...params.details,
    },
    `Security event: ${params.event}`
  );
}

/**
 * 记录成本日志
 */
export function logCost(params: {
  type: 'daily' | 'monthly';
  amount: number;
  userId?: string;
  breakdown?: Record<string, number>;
}) {
  logger.info(
    {
      type: 'cost',
      costType: params.type,
      amount: params.amount,
      userId: params.userId,
      breakdown: params.breakdown,
    },
    `Cost ${params.type}: $${params.amount.toFixed(2)}`
  );
}

/**
 * 记录性能指标日志
 */
export function logPerformance(params: {
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}) {
  logger.debug(
    {
      type: 'performance',
      operation: params.operation,
      duration: params.duration,
      ...params.metadata,
    },
    `Performance: ${params.operation} took ${params.duration}ms`
  );
}

/**
 * 脱敏手机号
 * 保留前 3 位和后 2 位，中间用 * 替换
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 5) return '[REDACTED]';
  const start = phone.slice(0, 3);
  const end = phone.slice(-2);
  const middle = '*'.repeat(phone.length - 5);
  return `${start}${middle}${end}`;
}

/**
 * 脱敏邮箱
 * 保留邮箱前缀的前 2 个字符和域名
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '[REDACTED]';
  const [prefix, domain] = email.split('@');
  if (prefix.length <= 2) return `${prefix}***@${domain}`;
  return `${prefix.slice(0, 2)}***@${domain}`;
}

/**
 * 脱敏对象中的 PII 数据
 */
export function maskPII(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const masked = { ...obj };

  // 脱敏手机号
  if (masked.phone_number) {
    masked.phone_number = maskPhoneNumber(masked.phone_number);
  }
  if (masked.phoneNumber) {
    masked.phoneNumber = maskPhoneNumber(masked.phoneNumber);
  }
  if (masked.phone) {
    masked.phone = maskPhoneNumber(masked.phone);
  }

  // 脱敏邮箱
  if (masked.email) {
    masked.email = maskEmail(masked.email);
  }

  // 移除敏感字段
  delete masked.password;
  delete masked.token;
  delete masked.accessToken;
  delete masked.refreshToken;
  delete masked.apiKey;
  delete masked.api_key;

  return masked;
}

// 导出默认 logger
export default logger;
