/**
 * Simple Image Test
 * Tests image recognition with a real food photo from the internet
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting simple image test...\n');

    // Test image URL (chicken rice from Unsplash)
    const imageUrl = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800';
    
    console.log(`📥 Downloading image from: ${imageUrl}`);
    
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ Image downloaded: ${imageBuffer.length} bytes`);

    // Import food recognizer
    const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
    
    console.log('🔍 Calling food recognizer...');
    
    // Call recognizer
    const result = await foodRecognizer.recognizeFood(imageBuffer, {
      userId: 'test_user',
      language: 'en',
      mealTime: new Date(),
    });

    console.log('✅ Recognition complete!');
    console.log(JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      result,
      imageSize: imageBuffer.length,
      imageUrl,
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
