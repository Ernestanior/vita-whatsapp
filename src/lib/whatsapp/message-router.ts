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
   * Handle voice/audio messages — transcribe and process as text
   */
  private async handleVoiceMessage(
    message: Message,
    context: MessageContext
  ): Promise<void> {
    const audioId = message.audio?.id;
    if (!audioId) {
      logger.warn({ type: 'voice_no_audio_id', messageId: message.id });
      return;
    }

    try {
      const { whatsappClient } = await import('./client');

      // Acknowledge
      const ackMsg = context.language === 'en'
        ? '🎤 Got your voice message, transcribing...'
        : '🎤 收到语音，正在转文字...';
      await whatsappClient.sendTextMessage(context.userId, ackMsg);

      // Download audio
      const audioBuffer = await whatsappClient.downloadMedia(audioId);

      // Transcribe with OpenAI Whisper
      const { default: OpenAI } = await import('openai');
      const { env } = await import('@/config/env');
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

      const file = new File([new Uint8Array(audioBuffer)], 'voice.ogg', { type: message.audio?.mime_type || 'audio/ogg' });

      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: context.language === 'en' ? 'en' : 'zh',
      });

      const text = transcription.text?.trim();
      if (!text) {
        const errMsg = context.language === 'en'
          ? "Couldn't understand the voice message. Try again or type it out."
          : '无法识别语音内容，请重试或直接输入文字。';
        await whatsappClient.sendTextMessage(context.userId, errMsg);
        return;
      }

      logger.info({
        type: 'voice_transcribed',
        userId: context.userId,
        text: text.substring(0, 50),
      });

      // Process transcribed text as a regular text message
      const textMessage: Message = {
        ...message,
        type: 'text',
        text: { body: text },
      };

      await this.textHandler.handle(textMessage, context);
    } catch (error) {
      logger.error({
        type: 'voice_processing_error',
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const { whatsappClient } = await import('./client');
      const errMsg = context.language === 'en'
        ? '❌ Failed to process voice message. Please try again or send text.'
        : '❌ 语音处理失败，请重试或发送文字。';
      await whatsappClient.sendTextMessage(context.userId, errMsg);
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
