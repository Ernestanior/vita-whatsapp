/**
 * Send Test Message via WhatsApp API
 * This endpoint will send a real message to your WhatsApp number
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';

const TEST_NUMBER = '6583153431';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('🚀 Sending test message via WhatsApp API...\n');

    // Send a simple text message first
    log('📤 Sending text message...');
    const result = await whatsappClient.sendTextMessage(
      TEST_NUMBER,
      '🧪 Test message from Vita AI!\n\nIf you receive this, the WhatsApp API is working correctly.\n\nNow please send me a food photo to test image recognition! 📸'
    );

    log(`✅ Message sent successfully!`);
    log(`Message ID: ${result.messages?.[0]?.id || 'unknown'}`);

    return NextResponse.json({
      success: true,
      result,
      logs,
    });

  } catch (error) {
    log(`❌ Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      logs,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
