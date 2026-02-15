import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhookHandler } from '../webhook-handler';
import { env } from '@/config/env';

// Mock the whatsapp client
vi.mock('../client', () => ({
  whatsappClient: {
    markAsRead: vi.fn(),
    sendTextMessage: vi.fn(),
    downloadMedia: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
  },
}));

describe('WebhookHandler', () => {
  let handler: WebhookHandler;

  beforeEach(() => {
    handler = new WebhookHandler();
    vi.clearAllMocks();
  });

  describe('verifyWebhook', () => {
    it('should return challenge when verification is successful', () => {
      const result = handler.verifyWebhook(
        'subscribe',
        env.WHATSAPP_VERIFY_TOKEN,
        'test-challenge'
      );

      expect(result).toBe('test-challenge');
    });

    it('should return null when mode is incorrect', () => {
      const result = handler.verifyWebhook(
        'invalid-mode',
        env.WHATSAPP_VERIFY_TOKEN,
        'test-challenge'
      );

      expect(result).toBeNull();
    });

    it('should return null when token is incorrect', () => {
      const result = handler.verifyWebhook(
        'subscribe',
        'wrong-token',
        'test-challenge'
      );

      expect(result).toBeNull();
    });
  });

  describe('handleWebhook', () => {
    it('should process valid webhook payload', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: 'phone-id',
                  },
                  contacts: [
                    {
                      profile: { name: 'Test User' },
                      wa_id: '1234567890',
                    },
                  ],
                  messages: [
                    {
                      from: '1234567890',
                      id: 'msg-id',
                      timestamp: '1234567890',
                      type: 'text' as const,
                      text: { body: 'Hello' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await expect(handler.handleWebhook(payload)).resolves.not.toThrow();
    });

    it('should ignore non-whatsapp_business_account objects', async () => {
      const payload = {
        object: 'invalid-object',
        entry: [],
      };

      await expect(handler.handleWebhook(payload)).resolves.not.toThrow();
    });

    it('should handle empty messages array', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'entry-id',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: 'phone-id',
                  },
                  messages: [],
                },
              },
            ],
          },
        ],
      };

      await expect(handler.handleWebhook(payload)).resolves.not.toThrow();
    });
  });
});
