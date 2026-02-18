/**
 * Diagnose Image Recognition Issues
 * Tests each step of the image recognition pipeline
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const diagnostics: any[] = [];
  
  try {
    // Get the last image message from debug logs
    const { default: debugLogsModule } = await import('@/app/api/debug-logs/route');
    
    diagnostics.push({
      step: 'debug_logs_loaded',
      success: true,
    });

    // Check if we can access WhatsApp client
    try {
      const { whatsappClient } = await import('@/lib/whatsapp/client');
      diagnostics.push({
        step: 'whatsapp_client_loaded',
        success: true,
      });
    } catch (error) {
      diagnostics.push({
        step: 'whatsapp_client_loaded',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check if we can access food recognizer
    try {
      const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
      diagnostics.push({
        step: 'food_recognizer_loaded',
        success: true,
      });
    } catch (error) {
      diagnostics.push({
        step: 'food_recognizer_loaded',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Check OpenAI API key
    try {
      const { env } = await import('@/config/env');
      diagnostics.push({
        step: 'openai_api_key_check',
        success: !!env.OPENAI_API_KEY,
        hasKey: !!env.OPENAI_API_KEY,
        keyLength: env.OPENAI_API_KEY?.length || 0,
      });
    } catch (error) {
      diagnostics.push({
        step: 'openai_api_key_check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test OpenAI API connection
    try {
      const { OpenAI } = await import('openai');
      const { env } = await import('@/config/env');
      
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      const testResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });

      diagnostics.push({
        step: 'openai_api_test',
        success: true,
        model: testResponse.model,
        tokensUsed: testResponse.usage?.total_tokens,
      });
    } catch (error) {
      diagnostics.push({
        step: 'openai_api_test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary: {
        totalSteps: diagnostics.length,
        successfulSteps: diagnostics.filter(d => d.success).length,
        failedSteps: diagnostics.filter(d => !d.success).length,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run diagnostics',
    usage: 'POST /api/diagnose-image',
  });
}
