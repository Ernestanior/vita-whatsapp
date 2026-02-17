import { NextRequest, NextResponse } from 'next/server';
import { messageRouter } from '@/lib/whatsapp/message-router';
import { logger } from '@/utils/logger';
import type { Message, MessageContext } from '@/types/whatsapp';

/**
 * Test endpoint to simulate WhatsApp messages
 * Usage: POST /api/test-message
 * Body: { "from": "6583153431", "text": "27 168 79", "type": "text" }
 * Body: { "from": "6583153431", "type": "image", "imageId": "test_image_id" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { from, text, type = 'text', imageId, interactive } = body;

    if (!from) {
      return NextResponse.json(
        { error: 'Missing required field: from' },
        { status: 400 }
      );
    }

    logger.info({
      type: 'test_message_received',
      from,
      text,
      messageType: type,
      interactive,
      imageId,
    });

    // Create test message
    const message: Message = {
      id: `test_${Date.now()}`,
      from,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: type as any,
      text: text ? { body: text } : undefined,
      image: imageId ? { id: imageId, mime_type: 'image/jpeg', sha256: 'test_hash' } : undefined,
      interactive: interactive ? interactive : undefined,
    };

    // Create test context
    const context: MessageContext = {
      userId: from,
      messageId: message.id,
      timestamp: new Date(),
      language: 'en',
      userName: 'Test User',
    };

    // Route the message
    const logs: any[] = [];
    const originalLog = logger.info;
    const originalError = logger.error;
    const originalWarn = logger.warn;
    
    // Capture logs
    (logger as any).info = (data: any) => {
      logs.push({ level: 'info', ...data });
      originalLog.call(logger, data);
    };
    
    (logger as any).error = (data: any) => {
      logs.push({ level: 'error', ...data });
      originalError.call(logger, data);
    };

    (logger as any).warn = (data: any) => {
      logs.push({ level: 'warn', ...data });
      originalWarn.call(logger, data);
    };

    try {
      await messageRouter.route(message, context);
    } finally {
      // Restore original logger
      (logger as any).info = originalLog;
      (logger as any).error = originalError;
      (logger as any).warn = originalWarn;
    }

    logger.info({
      type: 'test_message_completed',
      from,
      logsCount: logs.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Test message processed',
      logs,
      messageId: message.id,
      note: type === 'image' ? 'Image processing requires actual image data and OpenAI API' : undefined,
    });
  } catch (error) {
    logger.error({
      type: 'test_message_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to show usage instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp Message Test Endpoint',
    usage: {
      method: 'POST',
      endpoint: '/api/test-message',
      body: {
        from: 'string (required) - Phone number',
        text: 'string (optional) - Message text',
        type: 'string (optional) - Message type: text, image, etc. Default: text',
        imageId: 'string (optional) - Image ID for image messages',
        interactive: 'object (optional) - Interactive message data',
      },
      examples: [
        {
          description: 'Test quick setup',
          body: {
            from: '6583153431',
            text: '27 168 79',
          },
        },
        {
          description: 'Test command',
          body: {
            from: '6583153431',
            text: '/start',
          },
        },
        {
          description: 'Test image message (simulated)',
          body: {
            from: '6583153431',
            type: 'image',
            imageId: 'test_image_123',
          },
        },
      ],
    },
  });
}
