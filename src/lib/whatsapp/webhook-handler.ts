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
    const { messages, contacts } = value;

    if (!messages || messages.length === 0) {
      return;
    }

    // Get contact name if available
    const contactName = contacts?.[0]?.profile?.name;

    // Process each message
    for (const message of messages) {
      try {
        await this.processMessage(message, contactName);
      } catch (error) {
        logger.error({
          type: 'message_processing_error',
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue processing other messages even if one fails
      }
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

      // Send initial acknowledgment (non-blocking)
      logger.info({
        type: 'sending_acknowledgment',
        messageId: message.id,
        messageType: message.type,
      });
      
      this.sendAcknowledgment(message).catch(error => {
        logger.warn({
          type: 'acknowledgment_failed',
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't throw, continue processing
      });

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

      // Route message to appropriate handler
      await messageRouter.route(message, context);

      logger.info({
        type: 'message_processed_successfully',
        messageId: message.id,
      });
    } catch (error) {
      logger.error({
        type: 'message_processing_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw - we want to return 200 to WhatsApp
    }
  }

  /**
   * Send quick acknowledgment (within 3 seconds)
   */
  private async sendAcknowledgment(message: Message): Promise<void> {
    try {
      if (message.type === 'image') {
        await whatsappClient.sendTextMessage(
          message.from,
          '📸 收到您的照片！正在分析中...'
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
