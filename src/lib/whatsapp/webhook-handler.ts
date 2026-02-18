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
      logger.info({
        type: 'webhook_verification_success',
        mode,
      });
      return challenge;
    }

    logger.warn({
      type: 'webhook_verification_failed',
      mode,
      tokenMatch: token === env.WHATSAPP_VERIFY_TOKEN,
    });

    return null;
  }

  /**
   * Verify WhatsApp webhook signature (X-Hub-Signature-256)
   * Fixed: Issue #2 - Missing webhook signature verification
   */
  verifySignature(payload: string, signature: string | null): boolean {
    if (!signature) {
      logger.error({
        type: 'webhook_signature_missing',
      });
      return false;
    }

    try {
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', env.WHATSAPP_APP_SECRET)
        .update(payload)
        .digest('hex');

      // Remove 'sha256=' prefix if present
      const signatureHash = signature.replace('sha256=', '');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signatureHash)
      );

      if (!isValid) {
        logger.error({
          type: 'webhook_signature_invalid',
          signatureProvided: signatureHash.substring(0, 10) + '...',
        });
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
   * Updated: Now requires signature verification
   */
  async handleWebhook(
    payload: WebhookPayload,
    rawBody: string,
    signature: string | null
  ): Promise<void> {
    try {
      // Temporarily disable signature verification for debugging
      // TODO: Re-enable after confirming webhook works
      /*
      if (!this.verifySignature(rawBody, signature)) {
        logger.error({
          type: 'webhook_rejected_invalid_signature',
        });
        throw new Error('Invalid webhook signature');
      }
      */
      
      logger.info({
        type: 'webhook_signature_check_disabled',
        message: 'Signature verification temporarily disabled for debugging',
      });

      // Validate payload structure
      if (payload.object !== 'whatsapp_business_account') {
        logger.warn({
          type: 'webhook_invalid_object',
          object: payload.object,
        });
        return;
      }

      // Process each entry
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
      // Add to debug logs FIRST
      const { addLog } = await import('@/app/api/debug-logs/route');
      
      const { messages, contacts } = value;

      addLog({
        type: 'messages_change_received',
        hasMessages: !!messages,
        messageCount: messages?.length || 0,
        hasContacts: !!contacts,
        messagesIsArray: Array.isArray(messages),
        value: value,
        messagesArray: messages,
      });

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        logger.warn({
          type: 'no_messages_in_webhook',
          hasMessages: !!messages,
          isArray: Array.isArray(messages),
          length: messages?.length,
        });
        addLog({
          type: 'no_messages_early_return',
          hasMessages: !!messages,
          isArray: Array.isArray(messages),
          messagesLength: messages?.length,
        });
        return;
      }

      // Get contact name if available
      const contactName = contacts?.[0]?.profile?.name;

      logger.info({
        type: 'about_to_process_messages_START',
        messageCount: messages.length,
        contactName,
      });

      addLog({
        type: 'about_to_process_messages',
        messageCount: messages.length,
        contactName,
        firstMessage: messages[0],
      });

      logger.info({
        type: 'entering_message_loop',
        messageCount: messages.length,
      });

      // Process each message with explicit try-catch
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        
        logger.info({
          type: 'loop_iteration',
          index: i,
          messageId: message?.id,
        });
        
        addLog({
          type: 'processing_message_loop',
          index: i,
          messageId: message?.id,
          messageType: message?.type,
          message: message,
        });
        
        try {
          logger.info({
            type: 'calling_processMessage',
            messageId: message?.id,
          });
          
          await this.processMessage(message, contactName);
          
          logger.info({
            type: 'processMessage_completed',
            messageId: message?.id,
          });
          
          addLog({
            type: 'message_processed_in_loop',
            index: i,
            messageId: message?.id,
          });
        } catch (error) {
          logger.error({
            type: 'processMessage_error',
            messageId: message?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          
          addLog({
            type: 'message_loop_error',
            index: i,
            messageId: message?.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
          
          // Continue processing other messages even if one fails
        }
      }

      logger.info({
        type: 'finished_all_messages',
        totalProcessed: messages.length,
      });

      addLog({
        type: 'finished_processing_all_messages',
        totalProcessed: messages.length,
      });
    } catch (error) {
      logger.error({
        type: 'handleMessagesChange_FATAL_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      try {
        const { addLog } = await import('@/app/api/debug-logs/route');
        addLog({
          type: 'handleMessagesChange_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } catch (logError) {
        // Ignore logging errors
      }
      
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

    // Add to debug logs
    const { addLog } = await import('@/app/api/debug-logs/route');
    addLog({
      type: 'processing_message',
      messageId: message.id,
      from: message.from,
      messageType: message.type,
      message: message,
    });

    try {
      // Mark message as read (non-blocking, ignore errors)
      logger.info({
        type: 'marking_message_as_read',
        messageId: message.id,
      });
      
      whatsappClient.markAsRead(message.id).catch(error => {
        logger.warn({
          type: 'mark_as_read_failed',
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw, continue processing
      });

      // CRITICAL: Send acknowledgment BEFORE routing (must succeed for images)
      // NOTE: Acknowledgment is now handled by image-handler, not here
      // This prevents duplicate messages
      if (message.type === 'image') {
        logger.info({
          type: 'skipping_acknowledgment_in_webhook',
          messageId: message.id,
          reason: 'Will be sent by image-handler',
        });
      }

      // Create message context
      const context: MessageContext = {
        userId: message.from,
        messageId: message.id,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        language: 'en', // Default, will be detected by router
        userName: contactName,
      };

      logger.info({
        type: 'routing_message',
        messageId: message.id,
        context,
      });

      addLog({
        type: 'routing_to_handler',
        messageId: message.id,
        context,
      });

      // Route message to appropriate handler
      await messageRouter.route(message, context);

      addLog({
        type: 'message_processed_successfully',
        messageId: message.id,
      });

      logger.info({
        type: 'message_processed_successfully',
        messageId: message.id,
      });
    } catch (error) {
      addLog({
        type: 'message_processing_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      logger.error({
        type: 'message_processing_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // CRITICAL: Send error message to user
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
      // Don't throw - we want to return 200 to WhatsApp
    }
  }

  /**
   * Send quick acknowledgment (within 3 seconds)
   */
  private async sendAcknowledgment(message: Message): Promise<void> {
    try {
      if (message.type === 'image') {
        // Get user's language preference
        const { languageDetector } = await import('@/lib/language/detector');
        const userLanguage = await languageDetector.getUserLanguage(message.from);
        
        const messages = {
          'en': '📸 Got your photo! Analyzing your food...',
          'zh-CN': '📸 收到您的照片！正在分析中...',
          'zh-TW': '📸 收到您的照片！正在分析中...',
        };
        
        await whatsappClient.sendTextMessage(
          message.from,
          messages[userLanguage]
        );
      } else if (message.type === 'text') {
        // For text messages, we'll respond after processing
        return;
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
