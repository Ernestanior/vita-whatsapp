/**
 * Manual test script for MessageRouter and TextHandler
 * 
 * This script tests the message routing and text handling functionality
 * without requiring a full test framework setup.
 */

import { MessageRouter } from '../src/lib/whatsapp/message-router';
import { TextHandler } from '../src/lib/whatsapp/text-handler';
import type { Message, MessageContext } from '../src/types/whatsapp';

// Mock logger to avoid errors
const mockLogger = {
  info: (data: any) => console.log('[INFO]', JSON.stringify(data, null, 2)),
  warn: (data: any) => console.warn('[WARN]', JSON.stringify(data, null, 2)),
  error: (data: any) => console.error('[ERROR]', JSON.stringify(data, null, 2)),
};

// Replace logger module
(global as any).logger = mockLogger;

async function testMessageRouter() {
  console.log('\n=== Testing MessageRouter ===\n');

  const router = new MessageRouter();

  // Test 1: English text message
  console.log('Test 1: English text message');
  const englishMessage: Message = {
    from: '1234567890',
    id: 'msg_001',
    timestamp: '1234567890',
    type: 'text',
    text: { body: '/help' },
  };

  const englishContext: MessageContext = {
    userId: '1234567890',
    messageId: 'msg_001',
    timestamp: new Date(),
    language: 'en',
  };

  try {
    await router.route(englishMessage, englishContext);
    console.log('✓ English message routed successfully');
    console.log('  Language detected:', englishContext.language);
  } catch (error) {
    console.error('✗ Failed to route English message:', error);
  }

  // Test 2: Chinese text message
  console.log('\nTest 2: Chinese text message');
  const chineseMessage: Message = {
    from: '1234567890',
    id: 'msg_002',
    timestamp: '1234567890',
    type: 'text',
    text: { body: '你好，我想查看我的健康画像' },
  };

  const chineseContext: MessageContext = {
    userId: '1234567890',
    messageId: 'msg_002',
    timestamp: new Date(),
    language: 'en', // Will be detected
  };

  try {
    await router.route(chineseMessage, chineseContext);
    console.log('✓ Chinese message routed successfully');
    console.log('  Language detected:', chineseContext.language);
  } catch (error) {
    console.error('✗ Failed to route Chinese message:', error);
  }

  // Test 3: Image message
  console.log('\nTest 3: Image message');
  const imageMessage: Message = {
    from: '1234567890',
    id: 'msg_003',
    timestamp: '1234567890',
    type: 'image',
    image: {
      id: 'img_123',
      mime_type: 'image/jpeg',
      sha256: 'abc123',
    },
  };

  const imageContext: MessageContext = {
    userId: '1234567890',
    messageId: 'msg_003',
    timestamp: new Date(),
    language: 'en',
  };

  try {
    await router.route(imageMessage, imageContext);
    console.log('✓ Image message routed successfully');
  } catch (error) {
    console.error('✗ Failed to route image message:', error);
  }

  // Test 4: Message type detection
  console.log('\nTest 4: Message type detection');
  const commandMessage: Message = {
    from: '1234567890',
    id: 'msg_004',
    timestamp: '1234567890',
    type: 'text',
    text: { body: '/start' },
  };

  const messageType = router.getMessageType(commandMessage);
  console.log('  Message type for "/start":', messageType);
  console.log(messageType === 'command' ? '✓ Command detected correctly' : '✗ Command detection failed');
}

async function testTextHandler() {
  console.log('\n=== Testing TextHandler ===\n');

  const handler = new TextHandler();

  // Mock WhatsApp client
  const sentMessages: Array<{ to: string; message: string }> = [];
  (global as any).whatsappClient = {
    sendTextMessage: async (to: string, message: string) => {
      sentMessages.push({ to, message });
      console.log(`  → Sent to ${to}: ${message.substring(0, 50)}...`);
    },
  };

  const mockContext: MessageContext = {
    userId: '1234567890',
    messageId: 'msg_test',
    timestamp: new Date(),
    language: 'en',
  };

  // Test commands
  const commands = [
    { text: '/start', name: 'Start' },
    { text: '/help', name: 'Help' },
    { text: '/profile', name: 'Profile' },
    { text: '/stats', name: 'Stats' },
    { text: '帮助', name: 'Help (Chinese)' },
  ];

  for (const cmd of commands) {
    console.log(`\nTest: ${cmd.name} command`);
    const message: Message = {
      from: '1234567890',
      id: `msg_${cmd.name}`,
      timestamp: '1234567890',
      type: 'text',
      text: { body: cmd.text },
    };

    const context = cmd.text === '帮助' 
      ? { ...mockContext, language: 'zh-CN' as const }
      : mockContext;

    try {
      await handler.handle(message, context);
      console.log(`✓ ${cmd.name} command handled successfully`);
    } catch (error) {
      console.error(`✗ Failed to handle ${cmd.name} command:`, error);
    }
  }

  // Test natural language
  console.log('\nTest: Natural language input');
  const nlMessage: Message = {
    from: '1234567890',
    id: 'msg_nl',
    timestamp: '1234567890',
    type: 'text',
    text: { body: 'I am 65kg now' },
  };

  try {
    await handler.handle(nlMessage, mockContext);
    console.log('✓ Natural language handled successfully');
  } catch (error) {
    console.error('✗ Failed to handle natural language:', error);
  }

  console.log(`\n📊 Total messages sent: ${sentMessages.length}`);
}

async function main() {
  console.log('🚀 Starting Message Router and Text Handler Tests\n');
  console.log('=' .repeat(60));

  try {
    await testMessageRouter();
    await testTextHandler();

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
