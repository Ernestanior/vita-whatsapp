/**
 * Test all commands locally by simulating webhook processing
 * This tests the ACTUAL code path without needing WhatsApp
 */

import { NextResponse } from 'next/server';
import { TextHandler } from '@/lib/whatsapp/text-handler';
import type { Message, MessageContext } from '@/types/whatsapp';

const TEST_USER_ID = '6583153431';

export async function GET() {
  const results: any[] = [];
  const textHandler = new TextHandler();

  const commands = [
    'stats',
    'history',
    'profile',
    'help',
    'start',
    'settings',
    '/stats',
    '/history',
  ];

  for (const command of commands) {
    try {
      results.push({ command, status: 'testing' });

      const message: Message = {
        id: `test_${command}_${Date.now()}`,
        from: TEST_USER_ID,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: {
          body: command
        }
      };

      const context: MessageContext = {
        userId: TEST_USER_ID,
        userName: 'Test User',
        language: 'en',
        timestamp: new Date(),
      };

      // Call text handler directly
      await textHandler.handle(message, context);

      results.push({ 
        command, 
        status: 'success',
        note: 'Check WhatsApp for response'
      });

    } catch (error) {
      results.push({ 
        command, 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    // Wait 2 seconds between commands
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const summary = {
    totalCommands: commands.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
  };

  return NextResponse.json({
    success: true,
    summary,
    results,
    note: 'Check your WhatsApp to verify all commands worked correctly'
  });
}
