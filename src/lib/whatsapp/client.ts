import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import type { MediaUrlResponse, SendMessageResponse } from '@/types/whatsapp';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export class WhatsAppClient {
  private token: string;
  private phoneNumberId: string;

  constructor() {
    this.token = env.WHATSAPP_TOKEN;
    this.phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  }

  /**
   * Download media file from WhatsApp
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      // Step 1: Get media URL
      const mediaUrl = await this.getMediaUrl(mediaId);

      // Step 2: Download the file
      const response = await fetch(mediaUrl.url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      logger.error({
        type: 'whatsapp_media_download_error',
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get media URL from WhatsApp
   */
  private async getMediaUrl(mediaId: string): Promise<MediaUrlResponse> {
    const url = `${WHATSAPP_API_URL}/${mediaId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get media URL: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send text message to user
   */
  async sendTextMessage(
    to: string,
    text: string
  ): Promise<SendMessageResponse> {
    const url = `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`;

    logger.info({
      type: 'sending_whatsapp_message',
      to,
      textLength: text.length,
      text: text.substring(0, 100),
    });

    // Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: text },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        logger.error({
          type: 'whatsapp_send_message_error',
          to,
          status: response.status,
          error,
        });
        throw new Error(`Failed to send message: ${error}`);
      }

      const result = await response.json();
      
      logger.info({
        type: 'whatsapp_message_sent_successfully',
        to,
        messageId: result.messages?.[0]?.id,
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error({
          type: 'whatsapp_send_message_timeout',
          to,
          textLength: text.length,
        });
        throw new Error('WhatsApp API timeout');
      }
      
      logger.error({
        type: 'whatsapp_send_message_exception',
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      throw error;
    }
  }

  /**
   * Send message with interactive buttons
   */
  async sendButtonMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendMessageResponse> {
    const url = `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`;

    // Add timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text },
            action: {
              buttons: buttons.map(btn => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title,
                },
              })),
            },
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        logger.error({
          type: 'whatsapp_send_button_message_error',
          to,
          error,
        });
        throw new Error(`Failed to send button message: ${error}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error({
          type: 'whatsapp_send_button_message_timeout',
          to,
          textLength: text.length,
          buttonCount: buttons.length,
        });
        throw new Error('WhatsApp API timeout');
      }
      
      throw error;
    }
  }

  /**
   * Send interactive buttons (alias for sendButtonMessage)
   */
  async sendInteractiveButtons(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<SendMessageResponse> {
    return this.sendButtonMessage(to, text, buttons);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });

    if (!response.ok) {
      logger.warn({
        type: 'whatsapp_mark_read_error',
        messageId,
        error: await response.text(),
      });
    }
  }

  /**
   * Send image message by URL
   */
  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    const url = `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const body: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'image',
        image: { link: imageUrl },
      };
      if (caption) body.image.caption = caption;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        logger.error({ type: 'whatsapp_send_image_error', to, error });
        throw new Error(`Failed to send image: ${error}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(to: string): Promise<void> {
    // Note: WhatsApp Cloud API doesn't have a direct typing indicator
    // This is a placeholder for future implementation or workaround
    logger.debug({
      type: 'whatsapp_typing_indicator',
      to,
    });
  }
}

// Singleton instance
export const whatsappClient = new WhatsAppClient();
