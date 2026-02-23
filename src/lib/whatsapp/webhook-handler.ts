import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { messageRouter } from './message-router';
import crypto from 'crypto';
import type {
  WebhookPayload,
  Message,
  MessageContext,
} from '@/types/whatsapp';

export class WebhookHandler {
  /**
   * Verify webhook during setup
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      logger.info({ type: 'webhook_verification_success', mode });
      return challenge;
    }
    logger.warn({ type: 'webhook_verification_failed', mode });
    return null;
  }

  /**
   * Verify WhatsApp webhook signature (X-Hub-Signature-256)
   */
  verifySignature(payload: string, signature: string | null): boolean {
    if (!signature) {
      logger.error({ type: 'webhook_signature_missing' });
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', env.WHATSAPP_APP_SECRET)
        .update(payload)
        .digest('hex');

      const signatureHash = signature.replace('sha256=', '');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signatureHash)
      );

      if (!isValid) {
        logger.error({ type: 'webhook_signature_invalid' });
      }
      return isValid;
    } catch (error) {
      logger.error({
        type: 'webhook_signature_verification_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(
    payload: WebhookPayload,
    rawBody: string,
    signature: string | null
  ): Promise<void> {
    try {
      // TODO: Re-enable signature verification
      // if (!this.verifySignature(rawBody, signature)) {
      //   throw new Error('Invalid webhook signature');
      // }

      if (payload.object !== 'whatsapp_business_account') {
        logger.warn({ type: 'webhook_invalid_object', object: payload.object });
        return;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this.handleMessagesChange(change.value);
          }
        }
      }
    } catch (error) {
      logger.error({
        type: 'webhook_processing_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Handle messages change event
   */
  private async handleMessagesChange(value: any): Promise<void> {
    try {
      const { messages, contacts } = value;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        logger.warn({
          type: 'no_messages_in_webhook',
          hasMessages: !!messages,
          isArray: Array.isArray(messages),
        });
        return;
      }

      const contactName = contacts?.[0]?.profile?.name;

      logger.info({
        type: 'processing_messages',
        messageCount: messages.length,
        contactName,
      });

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        try {
          await this.processMessage(message, contactName);
          logger.info({ type: 'message_processed', messageId: message?.id });
        } catch (error) {
          logger.error({
            type: 'processMessage_error',
            messageId: message?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue processing other messages
        }
      }

      logger.info({ type: 'finished_all_messages', totalProcessed: messages.length });
    } catch (error) {
      logger.error({
        type: 'handleMessagesChange_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(
    message: Message,
    contactName?: string
  ): Promise<void> {
    logger.info({
      type: 'message_received',
      messageId: message.id,
      from: message.from,
      messageType: message.type,
    });

    try {
      // Mark message as read (non-blocking)
      whatsappClient.markAsRead(message.id).catch(error => {
        logger.warn({
          type: 'mark_as_read_failed',
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

      // Create message context
      const context: MessageContext = {
        userId: message.from,
        messageId: message.id,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        language: 'en',
        userName: contactName,
      };

      // Route message to appropriate handler
      await messageRouter.route(message, context);

      logger.info({ type: 'message_processed_successfully', messageId: message.id });
    } catch (error) {
      logger.error({
        type: 'message_processing_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Send error message to user
      try {
        await whatsappClient.sendTextMessage(
          message.from,
          '❌ 抱歉，处理您的消息时出错了。请重试或联系支持。\n\nSorry, an error occurred while processing your message. Please try again or contact support.'
        );
      } catch (errorSendError) {
        logger.error({
          type: 'error_notification_failed',
          messageId: message.id,
          error: errorSendError instanceof Error ? errorSendError.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Send quick acknowledgment (within 3 seconds)
   */
  private async sendAcknowledgment(message: Message): Promise<void> {
    try {
      if (message.type === 'image') {
        const { languageDetector } = await import('@/lib/language/detector');
        const userLanguage = await languageDetector.getUserLanguage(message.from);

        const messages = {
          'en': '📸 Got your photo! Analyzing your food...',
          'zh-CN': '📸 收到您的照片！正在分析中...',
          'zh-TW': '📸 收到您的照片！正在分析中...',
        };

        await whatsappClient.sendTextMessage(message.from, messages[userLanguage]);
      }
    } catch (error) {
      logger.error({
        type: 'acknowledgment_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Singleton instance
export const webhookHandler = new WebhookHandler();
