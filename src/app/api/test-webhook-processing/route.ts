/**
 * Test Webhook Processing
 * Detailed logging of message processing flow
 */

import { NextResponse } from 'next/server';
import { messageRouter } from '@/lib/whatsapp/message-router';
import type { Message, MessageContext } from '@/types/whatsapp';

export async function POST(request: Request) {
  const logs: string[] = [];
  
  function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    logs.push(logMessage);
    console.log(logMessage);
  }
  
  try {
    const body = await request.json();
    const { text, userId } = body;
    
    log(`Starting test with text: "${text}", userId: ${userId}`);
    
    // Create test message
    const message: Message = {
      id: `test-${Date.now()}`,
      from: userId,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'text',
      text: {
        body: text,
      },
    };
    
    log('Created test message');
    
    // Create context
    const context: MessageContext = {
      userId,
      messageId: message.id,
      timestamp: new Date(),
      language: 'zh-CN',
      userName: 'Test User',
    };
    
    log('Created context');
    
    // Route message
    log('Calling messageRouter.route()...');
    
    try {
      await messageRouter.route(message, context);
      log('✅ messageRouter.route() completed successfully');
    } catch (routeError) {
      log(`❌ messageRouter.route() threw error: ${routeError instanceof Error ? routeError.message : 'Unknown'}`);
      log(`Stack: ${routeError instanceof Error ? routeError.stack : 'No stack'}`);
      throw routeError;
    }
    
    log('Test completed successfully');
    
    return NextResponse.json({
      success: true,
      logs,
      message: 'Processing completed - check WhatsApp for response',
    });
    
  } catch (error) {
    log(`❌ Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`);
    log(`Stack: ${error instanceof Error ? error.stack : 'No stack'}`);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      logs,
    }, { status: 500 });
  }
}
