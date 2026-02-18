import { logger } from '@/utils/logger';
import type { Message, MessageContext } from '@/types/whatsapp';
import { TextHandler } from './text-handler';
import { imageHandler } from './image-handler';
import { interactiveHandler } from './interactive-handler';
import { languageDetector } from '@/lib/language/detector';

/**
 * MessageRouter - Routes messages to appropriate handlers based on type
 * 
 * Responsibilities:
 * - Identify message type (text/image/interactive)
 * - Detect user language preference
 * - Route to appropriate handler
 * 
 * TEMPORARILY REVERTED: Using TextHandler instead of TextHandlerV2 to debug
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
      // Detect and update language from user's message
      if (message.type === 'text' && message.text?.body) {
        // Detect language from text and update user preference
        context.language = await languageDetector.detectAndUpdate(
          context.userId,
          message.text.body
        );
      } else {
        // For non-text messages, get user's saved language preference
        context.language = await languageDetector.getUserLanguage(context.userId);
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

        case 'audio':
        case 'voice':
          // Handle voice messages - for now, prompt user to use text
          await this.handleVoiceMessage(message, context);
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
   * Handle voice/audio messages
   */
  private async handleVoiceMessage(
    message: Message,
    context: MessageContext
  ): Promise<void> {
    const messages = {
      'en': `🎤 Voice message received!

I can't process voice messages yet, but you can:

📝 Type: \`25 170 65\`
(age height weight)

Or

📸 Send a food photo to start

Coming soon: Voice recognition! 🚀`,
      
      'zh-CN': `🎤 收到语音消息！

我暂时还不能处理语音消息，但您可以：

📝 输入：\`25 170 65\`
（年龄 身高 体重）

或者

📸 发送食物照片开始

即将推出：语音识别！🚀`,
      
      'zh-TW': `🎤 收到語音消息！

我暫時還不能處理語音消息，但您可以：

📝 輸入：\`25 170 65\`
（年齡 身高 體重）

或者

📸 發送食物照片開始

即將推出：語音識別！🚀`,
    };

    const { whatsappClient } = await import('./client');
    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
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
