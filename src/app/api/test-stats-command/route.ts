/**
 * Test stats command directly by simulating webhook
 */

import { NextResponse } from 'next/server';
import { textHandler } from '@/lib/whatsapp/text-handler';
import type { Message, MessageContext } from '@/types/whatsapp';

const TEST_USER_ID = '6583153431';

export async function GET() {
  try {
    // Simulate a "stats" message from webhook
    const message: Message = {
      id: 'test_stats_' + Date.now(),
      from: TEST_USER_ID,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'text',
      text: {
        body: 'stats'
      }
    };

    const context: MessageContext = {
      userId: TEST_USER_ID,
      userName: 'Test User',
      language: 'en',
      timestamp: new Date(),
    };

    // Call the text handler directly
    await textHandler.handle(message, context);

    return NextResponse.json({
      success: true,
      message: 'Stats command processed - check your WhatsApp',
      testData: {
        messageId: message.id,
        userId: TEST_USER_ID,
        command: 'stats'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
