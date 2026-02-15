import { logger } from '@/utils/logger';
import type { Message, MessageContext } from '@/types/whatsapp';
import { TextHandler } from './text-handler';
import { imageHandler } from './image-handler';
import { interactiveHandler } from './interactive-handler';

/**
 * MessageRouter - Routes messages to appropriate handlers based on type
 * 
 * Responsibilities:
 * - Identify message type (text/image/interactive)
 * - Detect user language preference
 * - Route to appropriate handler
 */
export class MessageRouter {
  private textHandler: TextHandler;

  constructor() {
    this.textHandler = new TextHandler();
  }

  /**
   * Route message to appropriate handler
   */
  async route(message: Message, context: MessageContext): Promise<void> {
    try {
      // Detect language if not already set
      if (context.language === 'en') {
        context.language = await this.detectLanguage(message, context.userId);
      }

      logger.info({
        type: 'message_routing',
        messageId: message.id,
        messageType: message.type,
        language: context.language,
      });

      // Route based on message type
      switch (message.type) {
        case 'text':
          await this.textHandler.handle(message, context);
          break;

        case 'image':
          await imageHandler.handle(message, context);
          break;

        case 'interactive':
          await interactiveHandler.handle(message, context);
          break;

        default:
          logger.warn({
            type: 'unknown_message_type',
            messageType: message.type,
            messageId: message.id,
          });
      }
    } catch (error) {
      logger.error({
        type: 'routing_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Detect user's language preference
   * 
   * Strategy:
   * 1. Check user profile in database
   * 2. Analyze message content for language patterns
   * 3. Default to English
   */
  private async detectLanguage(
    message: Message,
    userId: string
  ): Promise<'en' | 'zh-CN' | 'zh-TW'> {
    try {
      // TODO: Check user profile in database for saved language preference
      // const profile = await getUserProfile(userId);
      // if (profile?.language) return profile.language;

      // Analyze message content for language detection
      if (message.type === 'text' && message.text?.body) {
        const text = message.text.body;
        
        // Simple language detection based on character ranges
        // Chinese characters: \u4e00-\u9fff
        const chineseChars = text.match(/[\u4e00-\u9fff]/g);
        
        if (chineseChars && chineseChars.length > text.length * 0.3) {
          // If more than 30% Chinese characters, assume Chinese
          // For now, default to Simplified Chinese
          // TODO: Distinguish between Simplified and Traditional
          return 'zh-CN';
        }
      }

      // Default to English
      return 'en';
    } catch (error) {
      logger.error({
        type: 'language_detection_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 'en'; // Fallback to English
    }
  }

  /**
   * Get message type for logging/analytics
   */
  getMessageType(message: Message): string {
    if (message.type === 'text') {
      const text = message.text?.body || '';
      if (text.startsWith('/')) {
        return 'command';
      }
      return 'text';
    }
    return message.type;
  }
}

// Singleton instance
export const messageRouter = new MessageRouter();
