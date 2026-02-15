import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextHandler, Command } from '../text-handler';
import type { Message, MessageContext } from '@/types/whatsapp';

// Mock the whatsapp client
vi.mock('../client', () => ({
  whatsappClient: {
    sendTextMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('TextHandler', () => {
  let textHandler: TextHandler;
  let mockContext: MessageContext;

  beforeEach(() => {
    textHandler = new TextHandler();
    mockContext = {
      userId: '1234567890',
      messageId: 'msg_123',
      timestamp: new Date(),
      language: 'en',
    };
    vi.clearAllMocks();
  });

  describe('Command Recognition', () => {
    it('should recognize /start command in English', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/start' },
      };

      await textHandler.handle(message, mockContext);
      
      // Should send welcome message
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Welcome to Vita AI')
      );
    });

    it('should recognize start command in Chinese', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '开始' },
      };

      const chineseContext = { ...mockContext, language: 'zh-CN' as const };
      await textHandler.handle(message, chineseContext);
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('欢迎使用 Vita AI')
      );
    });

    it('should recognize /help command', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/help' },
      };

      await textHandler.handle(message, mockContext);
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Available Commands')
      );
    });

    it('should recognize /profile command', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/profile' },
      };

      await textHandler.handle(message, mockContext);
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Your Health Profile')
      );
    });

    it('should recognize /stats command', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/stats' },
      };

      await textHandler.handle(message, mockContext);
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Your Statistics')
      );
    });

    it('should handle natural language text', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: 'Hello, how are you?' },
      };

      await textHandler.handle(message, mockContext);
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('I understand you said')
      );
    });
  });

  describe('Multi-language Support', () => {
    it('should respond in English when language is en', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/help' },
      };

      await textHandler.handle(message, { ...mockContext, language: 'en' });
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('Available Commands')
      );
    });

    it('should respond in Simplified Chinese when language is zh-CN', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/help' },
      };

      await textHandler.handle(message, { ...mockContext, language: 'zh-CN' });
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('可用命令')
      );
    });

    it('should respond in Traditional Chinese when language is zh-TW', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/help' },
      };

      await textHandler.handle(message, { ...mockContext, language: 'zh-TW' });
      
      const { whatsappClient } = await import('../client');
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('可用命令')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle empty text message gracefully', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '' },
      };

      await textHandler.handle(message, mockContext);
      
      const { whatsappClient } = await import('../client');
      // Should not send any message for empty text
      expect(whatsappClient.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should send error message when processing fails', async () => {
      const message: Message = {
        from: '1234567890',
        id: 'msg_123',
        timestamp: '1234567890',
        type: 'text',
        text: { body: '/start' },
      };

      // Mock sendTextMessage to throw error
      const { whatsappClient } = await import('../client');
      vi.mocked(whatsappClient.sendTextMessage).mockRejectedValueOnce(
        new Error('Network error')
      );

      await textHandler.handle(message, mockContext);
      
      // Should attempt to send error message
      expect(whatsappClient.sendTextMessage).toHaveBeenCalledWith(
        '1234567890',
        expect.stringContaining('something went wrong')
      );
    });
  });
});
