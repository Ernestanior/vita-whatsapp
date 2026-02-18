/**
 * Test Image Recognition with URL
 * Tests the image recognition system with a public image URL
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use a public food image URL for testing
    const testImageUrl = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800'; // Fried rice
    
    console.log('Fetching test image from:', testImageUrl);
    
    // Fetch the image
    const imageResponse = await fetch(testImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log('Image fetched, size:', imageBuffer.length);
    
    // Test image recognition
    const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
    
    const result = await foodRecognizer.recognizeFood(imageBuffer, {
      userId: 'test_user',
      language: 'zh-CN',
      mealTime: new Date(),
    });
    
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
