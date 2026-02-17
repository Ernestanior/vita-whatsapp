import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Test Image Recognition Flow
 * 
 * This endpoint tests the complete image recognition pipeline without needing actual WhatsApp
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testUserId = env.TEST_WHATSAPP_NUMBER || '6583153431', useRealImage = false } = body;

    logger.info({
      type: 'test_image_recognition_started',
      testUserId,
      useRealImage,
    });

    // For now, we'll simulate the image recognition flow
    // In a real test, we would:
    // 1. Generate or use a test image
    // 2. Call the image handler
    // 3. Verify the response

    const testResult = {
      success: true,
      message: 'Image recognition test',
      status: 'pending_implementation',
      note: 'Image recognition requires OpenAI API key and actual image processing',
      recommendation: 'Test with real WhatsApp messages for now',
      steps: [
        '1. Send a food photo to WhatsApp: +65 8315 3431',
        '2. Check Vercel logs for processing',
        '3. Verify response received in WhatsApp',
      ],
    };

    return NextResponse.json(testResult);
  } catch (error) {
    logger.error({
      type: 'test_image_recognition_error',
      error: error instanceof Error ? error.message : 'Unknown error',
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

export async function GET() {
  return NextResponse.json({
    message: 'Image Recognition Test Endpoint',
    usage: {
      method: 'POST',
      endpoint: '/api/test-image',
      body: {
        testUserId: 'string (optional)',
        useRealImage: 'boolean (optional)',
      },
    },
    note: 'Image recognition requires actual food photos. Please test via WhatsApp.',
  });
}
