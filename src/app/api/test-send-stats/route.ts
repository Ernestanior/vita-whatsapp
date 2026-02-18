/**
 * Test by sending actual "stats" message to user's WhatsApp
 */

import { NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';

const TEST_USER_ID = '6583153431';

export async function GET() {
  try {
    // Send a message asking user to reply with "stats"
    await whatsappClient.sendTextMessage(
      TEST_USER_ID,
      '🧪 TEST: Please reply with the word "stats" (without quotes) to test the stats command.'
    );

    return NextResponse.json({
      success: true,
      message: 'Test message sent. Please reply with "stats" on WhatsApp.',
      instructions: [
        '1. Check your WhatsApp',
        '2. Reply with: stats',
        '3. You should receive your statistics or "no data yet"',
        '4. Check debug logs at /api/debug-logs to see processing'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
