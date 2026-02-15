// @ts-nocheck
/**
 * Test endpoint to verify WhatsApp client configuration
 * GET /api/test-whatsapp
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { whatsappClient } from '@/lib/whatsapp/client';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      hasWhatsAppToken: !!env.WHATSAPP_TOKEN,
      hasPhoneNumberId: !!env.WHATSAPP_PHONE_NUMBER_ID,
      hasVerifyToken: !!env.WHATSAPP_VERIFY_TOKEN,
      hasAppSecret: !!env.WHATSAPP_APP_SECRET,
      hasOpenAIKey: !!env.OPENAI_API_KEY,
      hasSupabaseUrl: !!env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!env.SUPABASE_SERVICE_KEY,
      hasRedisUrl: !!env.UPSTASH_REDIS_URL,
      hasRedisToken: !!env.UPSTASH_REDIS_TOKEN,
    };

    // Try to send a test message (optional, comment out if you don't want to send)
    const testPhone = request.nextUrl.searchParams.get('phone');
    let sendResult = null;

    if (testPhone) {
      try {
        sendResult = await whatsappClient.sendTextMessage(
          testPhone,
          '🧪 Test message from Vita AI - Configuration is working!'
        );
      } catch (error) {
        sendResult = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      whatsappClient: {
        initialized: !!whatsappClient,
      },
      testMessage: sendResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
