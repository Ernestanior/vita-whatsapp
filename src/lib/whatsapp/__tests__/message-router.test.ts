import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageRouter } from '../message-router';
import type { Message, MessageContext } from '@/types/whatsapp';

// Mock the text handler
vi.mock('../text-handler', () => ({
  TextHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('MessageRouter', () => {
  let messageRouter: MessageRouter;
  let mockContext: MessageContext;

  beforeEach(() => {
    messageRouter = new MessageRouter();
    mockContext = {
      userId: '1234567890',
      messageId: 'msg_123',
      timestamp: new Date(),
      language: 'en',
    };
    vi.clearAllMocks();
  });

  describe('Message Routing', () => {
    it('should route text messages to TextHandler', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello' },
      };

      await messageRouter.route(message, mockContext);
      
      // TextHandler.handle should have been called
      const { TextHandler } = await import('../text-handler');
      const textHandlerInstance = vi.mocked(TextHandler).mock.results[0].value;
      expect(textHandlerInstance.handle).toHaveBeenCalledWith(message, mockContext);
    });

    it('should handle image messages', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'image',
        image: {
          id: 'img_123',
          mime_type: 'image/jpeg',
          sha256: 'abc123',
        },
      };

      // Should not throw error
      await expect(messageRouter.route(message, mockContext)).resolves.not.toThrow();
    });

    it('should handle interactive messages', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'btn_1',
            title: 'Yes',
          },
        },
      };

      // Should not throw error
      await expect(messageRouter.route(message, mockContext)).resolves.not.toThrow();
    });
  });

  describe('Language Detection', () => {
    it('should detect Chinese text and set language to zh-CN', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '你好，我想查看我的健康画像' },
      };

      await messageRouter.route(message, mockContext);
      
      // Context language should be updated to zh-CN
      expect(mockContext.language).toBe('zh-CN');
    });

    it('should keep English for English text', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello, I want to see my profile' },
      };

      await messageRouter.route(message, mockContext);
      
      // Context language should remain en
      expect(mockContext.language).toBe('en');
    });

    it('should default to English for non-text messages', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'image',
        image: {
          id: 'img_123',
          mime_type: 'image/jpeg',
          sha256: 'abc123',
        },
      };

      await messageRouter.route(message, mockContext);
      
      // Context language should remain en (default)
      expect(mockContext.language).toBe('en');
    });

    it('should handle mixed English-Chinese text', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello 你好 world' },
      };

      await messageRouter.route(message, mockContext);
      
      // Should detect as English since Chinese chars < 30%
      expect(mockContext.language).toBe('en');
    });

    it('should detect Chinese when >30% Chinese characters', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '你好世界 hello' },
      };

      await messageRouter.route(message, mockContext);
      
      // Should detect as Chinese since Chinese chars > 30%
      expect(mockContext.language).toBe('zh-CN');
    });
  });

  describe('Message Type Detection', () => {
    it('should identify command messages', () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/start' },
      };

      const messageType = messageRouter.getMessageType(message);
      expect(messageType).toBe('command');
    });

    it('should identify regular text messages', () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello world' },
      };

      const messageType = messageRouter.getMessageType(message);
      expect(messageType).toBe('text');
    });

    it('should identify image messages', () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'image',
        image: {
          id: 'img_123',
          mime_type: 'image/jpeg',
          sha256: 'abc123',
        },
      };

      const messageType = messageRouter.getMessageType(message);
      expect(messageType).toBe('image');
    });
  });

  describe('Error Handling', () => {
    it('should handle routing errors gracefully', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello' },
      };

      // Mock TextHandler to throw error
      const { TextHandler } = await import('../text-handler');
      const textHandlerInstance = vi.mocked(TextHandler).mock.results[0].value;
      vi.mocked(textHandlerInstance.handle).mockRejectedValueOnce(
        new Error('Handler error')
      );

      // Should throw the error
      await expect(messageRouter.route(message, mockContext)).rejects.toThrow('Handler error');
    });
  });
});
