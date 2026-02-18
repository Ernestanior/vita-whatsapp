/**
 * Test Image Recognition with URL
 * Tests the image recognition system with a public image URL
 */

import { NextResponse } from 'next/server';
import { imageHandler } from '@/lib/whatsapp/image-handler';

export async function GET() {
  try {
    // Use a public food image URL for testing
    const testImageUrl = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800'; // Fried rice
    
    // Create a mock message
    const mockMessage = {
      from: '6583153431',
      id: 'test_' + Date.now(),
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'image' as const,
      image: {
        id: 'test_image',
        mime_type: 'image/jpeg',
        sha256: 'test',
      },
    };

    const mockContext = {
      userId: '6583153431',
      messageId: mockMessage.id,
      timestamp: new Date(),
      language: 'zh-CN' as const,
    };

    // Test image recognition directly
    const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
    
    console.log('Testing image recognition with URL:', testImageUrl);
    
    const result = await foodRecognizer.recognizeFromUrl(testImageUrl);
    
    return NextResponse.json({
      success: true,
      testImageUrl,
      result,
      message: 'Image recognition test completed',
    });
  } catch (error) {
    console.error('Image recognition test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
