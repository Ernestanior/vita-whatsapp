/**
 * Error Handler
 * Handles error classification, logging, and user-friendly messaging
 * Requirements: 19.1, 19.2, 19.3, 19.6, 19.7
 */

import { logger } from '@/utils/logger';
import { ErrorType } from '@/types';

export interface ErrorContext {
  userId?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface ErrorResponse {
  errorId: string;
  type: ErrorType;
  message: string;
  suggestion?: string;
  retryable: boolean;
}

export class ErrorHandler {
  /**
   * Handle error and generate user-friendly response
   * Requirements: 19.1, 19.2, 19.3
   */
  async handleError(
    error: Error | unknown,
    context: ErrorContext,
    language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
  ): Promise<ErrorResponse> {
    const errorId = this.generateErrorId();

    // Log error
    await this.logError(errorId, error, context);

    // Classify error
    const errorType = this.classifyError(error);

    // Generate user-friendly message
    const message = this.generateUserMessage(errorType, language);

    // Generate suggestion
    const suggestion = this.generateSuggestion(errorType, language);

    // Determine if retryable
    const retryable = this.isRetryable(errorType);

    // Send alert if critical
    if (this.isCritical(errorType)) {
      await this.sendAlert(errorId, error, context);
    }

    return {
      errorId,
      type: errorType,
      message,
      suggestion,
      retryable,
    };
  }

  /**
   * Classify error type
   * Requirements: 19.1
   */
  private classifyError(error: Error | unknown): ErrorType {
    if (!(error instanceof Error)) {
      return ErrorType.UNKNOWN_ERROR;
    }

    const message = error.message.toLowerCase();

    // User errors
    if (message.includes('invalid') || message.includes('validation')) {
      return ErrorType.INVALID_INPUT;
    }

    if (message.includes('quota') || message.includes('limit exceeded')) {
      return ErrorType.QUOTA_EXCEEDED;
    }

    if (message.includes('unsupported') || message.includes('not supported')) {
      return ErrorType.UNSUPPORTED_CONTENT;
    }

    // System errors
    if (message.includes('openai') || message.includes('ai api')) {
      return ErrorType.AI_API_ERROR;
    }

    if (message.includes('database') || message.includes('supabase')) {
      return ErrorType.DATABASE_ERROR;
    }

    if (message.includes('storage') || message.includes('upload')) {
      return ErrorType.STORAGE_ERROR;
    }

    // External service errors
    if (message.includes('whatsapp')) {
      return ErrorType.WHATSAPP_API_ERROR;
    }

    if (message.includes('stripe') || message.includes('payment')) {
      return ErrorType.STRIPE_ERROR;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorType.TIMEOUT_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Generate user-friendly error message
   * Requirements: 19.2
   */
  private generateUserMessage(type: ErrorType, language: 'en' | 'zh-CN' | 'zh-TW'): string {
    const messages: Record<'en' | 'zh-CN' | 'zh-TW', Record<ErrorType, string>> = {
      en: {
        [ErrorType.INVALID_INPUT]: '❌ The information you provided is not valid.',
        [ErrorType.QUOTA_EXCEEDED]: '📊 You\'ve reached your daily limit. Upgrade to Premium for unlimited access!',
        [ErrorType.UNSUPPORTED_CONTENT]: '🤔 I can only analyze food photos. Please send a clear picture of your meal.',
        [ErrorType.AI_API_ERROR]: '🔧 Our AI is taking a short break. Please try again in a moment.',
        [ErrorType.DATABASE_ERROR]: '💾 We\'re having trouble saving your data. Please try again.',
        [ErrorType.STORAGE_ERROR]: '📁 Failed to save your image. Please try again.',
        [ErrorType.WHATSAPP_API_ERROR]: '📱 WhatsApp service is temporarily unavailable. Please try again.',
        [ErrorType.STRIPE_ERROR]: '💳 Payment service is temporarily unavailable. Please try again.',
        [ErrorType.TIMEOUT_ERROR]: '⏱️ This is taking longer than expected. Please try again.',
        [ErrorType.UNKNOWN_ERROR]: '❗ Something went wrong. Please try again.',
      },
      'zh-CN': {
        [ErrorType.INVALID_INPUT]: '❌ 您提供的信息无效。',
        [ErrorType.QUOTA_EXCEEDED]: '📊 您今天的免费次数已用完。升级到 Premium 享受无限次使用！',
        [ErrorType.UNSUPPORTED_CONTENT]: '🤔 我只能分析食物照片。请发送一张清晰的食物图片。',
        [ErrorType.AI_API_ERROR]: '🔧 AI 正在短暂休息中，请稍后再试。',
        [ErrorType.DATABASE_ERROR]: '💾 数据保存遇到问题，请重试。',
        [ErrorType.STORAGE_ERROR]: '📁 图片保存失败，请重试。',
        [ErrorType.WHATSAPP_API_ERROR]: '📱 WhatsApp 服务暂时不可用，请稍后再试。',
        [ErrorType.STRIPE_ERROR]: '💳 支付服务暂时不可用，请稍后再试。',
        [ErrorType.TIMEOUT_ERROR]: '⏱️ 处理时间比预期长，请重试。',
        [ErrorType.UNKNOWN_ERROR]: '❗ 出现了一些问题，请重试。',
      },
      'zh-TW': {
        [ErrorType.INVALID_INPUT]: '❌ 您提供的資訊無效。',
        [ErrorType.QUOTA_EXCEEDED]: '📊 您今天的免費次數已用完。升級到 Premium 享受無限次使用！',
        [ErrorType.UNSUPPORTED_CONTENT]: '🤔 我只能分析食物照片。請發送一張清晰的食物圖片。',
        [ErrorType.AI_API_ERROR]: '🔧 AI 正在短暫休息中，請稍後再試。',
        [ErrorType.DATABASE_ERROR]: '💾 資料保存遇到問題，請重試。',
        [ErrorType.STORAGE_ERROR]: '📁 圖片保存失敗，請重試。',
        [ErrorType.WHATSAPP_API_ERROR]: '📱 WhatsApp 服務暫時不可用，請稍後再試。',
        [ErrorType.STRIPE_ERROR]: '💳 支付服務暫時不可用，請稍後再試。',
        [ErrorType.TIMEOUT_ERROR]: '⏱️ 處理時間比預期長，請重試。',
        [ErrorType.UNKNOWN_ERROR]: '❗ 出現了一些問題，請重試。',
      },
    };

    return messages[language][type];
  }

  /**
   * Generate suggestion for error resolution
   * Requirements: 19.3
   */
  private generateSuggestion(type: ErrorType, language: 'en' | 'zh-CN' | 'zh-TW'): string | undefined {
    const suggestions: Record<'en' | 'zh-CN' | 'zh-TW', Partial<Record<ErrorType, string>>> = {
      en: {
        [ErrorType.INVALID_INPUT]: 'Please check your input and try again.',
        [ErrorType.QUOTA_EXCEEDED]: 'Tap here to upgrade: [Upgrade Link]',
        [ErrorType.UNSUPPORTED_CONTENT]: 'Try taking a new photo with better lighting and focus.',
        [ErrorType.AI_API_ERROR]: 'Wait a moment and try again.',
        [ErrorType.DATABASE_ERROR]: 'If the problem persists, contact support.',
        [ErrorType.STORAGE_ERROR]: 'Check your internet connection and try again.',
        [ErrorType.TIMEOUT_ERROR]: 'Try again with a smaller image.',
      },
      'zh-CN': {
        [ErrorType.INVALID_INPUT]: '请检查您的输入并重试。',
        [ErrorType.QUOTA_EXCEEDED]: '点击这里升级：[升级链接]',
        [ErrorType.UNSUPPORTED_CONTENT]: '尝试在更好的光线下重新拍照。',
        [ErrorType.AI_API_ERROR]: '稍等片刻后重试。',
        [ErrorType.DATABASE_ERROR]: '如果问题持续，请联系客服。',
        [ErrorType.STORAGE_ERROR]: '检查网络连接后重试。',
        [ErrorType.TIMEOUT_ERROR]: '尝试使用更小的图片。',
      },
      'zh-TW': {
        [ErrorType.INVALID_INPUT]: '請檢查您的輸入並重試。',
        [ErrorType.QUOTA_EXCEEDED]: '點擊這裡升級：[升級連結]',
        [ErrorType.UNSUPPORTED_CONTENT]: '嘗試在更好的光線下重新拍照。',
        [ErrorType.AI_API_ERROR]: '稍等片刻後重試。',
        [ErrorType.DATABASE_ERROR]: '如果問題持續，請聯繫客服。',
        [ErrorType.STORAGE_ERROR]: '檢查網路連接後重試。',
        [ErrorType.TIMEOUT_ERROR]: '嘗試使用更小的圖片。',
      },
    };

    return suggestions[language][type];
  }

  /**
   * Check if error is retryable
   * Requirements: 19.1
   */
  private isRetryable(type: ErrorType): boolean {
    const retryableErrors = [
      ErrorType.AI_API_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.STORAGE_ERROR,
      ErrorType.WHATSAPP_API_ERROR,
      ErrorType.STRIPE_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.UNKNOWN_ERROR,
    ];

    return retryableErrors.includes(type);
  }

  /**
   * Check if error is critical
   * Requirements: 19.6
   */
  private isCritical(type: ErrorType): boolean {
    const criticalErrors = [
      ErrorType.DATABASE_ERROR,
      ErrorType.STORAGE_ERROR,
    ];

    return criticalErrors.includes(type);
  }

  /**
   * Log error with context
   * Requirements: 19.6
   */
  private async logError(errorId: string, error: Error | unknown, context: ErrorContext): Promise<void> {
    const errorInfo = {
      errorId,
      userId: context.userId,
      operation: context.operation,
      metadata: context.metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : {
        message: String(error),
      },
      timestamp: new Date().toISOString(),
    };

    logger.error(errorInfo, 'Error occurred');
  }

  /**
   * Send alert to operations team
   * Requirements: 19.7
   */
  private async sendAlert(errorId: string, error: Error | unknown, context: ErrorContext): Promise<void> {
    // In production, this would send to Sentry, PagerDuty, etc.
    logger.error(
      {
        errorId,
        userId: context.userId,
        operation: context.operation,
        error: error instanceof Error ? error.message : String(error),
        alert: 'CRITICAL',
      },
      'Critical error alert'
    );

    // TODO: Integrate with alerting service (Sentry, PagerDuty, etc.)
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `err_${timestamp}_${random}`;
  }
}

export const errorHandler = new ErrorHandler();
