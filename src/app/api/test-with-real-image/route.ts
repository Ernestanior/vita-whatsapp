/**
 * Test with Real Food Image
 * Downloads a food image from the internet and tests the complete flow
 */

import { NextResponse } from 'next/server';
import { foodRecognizer } from '@/lib/food-recognition/recognizer';
import { ratingEngine } from '@/lib/rating/rating-engine';
import { responseFormatterSG } from '@/lib/whatsapp/response-formatter-sg';

export async function GET() {
  const results: any[] = [];

  try {
    // Test with a real food image URL
    const imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
    
    results.push({
      step: 'Downloading image',
      status: 'in_progress',
      url: imageUrl,
    });

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    results.push({
      step: 'Image downloaded',
      status: 'success',
      size: imageBuffer.length,
    });

    // Test food recognition
    results.push({
      step: 'Calling food recognizer',
      status: 'in_progress',
    });

    const recognitionResponse = await foodRecognizer.recognizeFood(
      imageBuffer,
      {
        userId: 'test_user',
        language: 'en',
        mealTime: new Date(),
      }
    );

    if (!recognitionResponse.success || !recognitionResponse.result) {
      results.push({
        step: 'Food recognition',
        status: 'failed',
        error: recognitionResponse.error,
      });
      
      return NextResponse.json({
        success: false,
        results,
      });
    }

    results.push({
      step: 'Food recognition',
      status: 'success',
      result: recognitionResponse.result,
      tokensUsed: recognitionResponse.tokensUsed,
    });

    // Test health rating
    results.push({
      step: 'Calculating health rating',
      status: 'in_progress',
    });

    const healthRating = await ratingEngine.evaluate(
      recognitionResponse.result,
      {
        userId: 'test_user',
        height: 170,
        weight: 65,
        age: 30,
        gender: 'male',
        goal: 'maintain',
        activityLevel: 'light',
        digestTime: '21:00:00',
        quickMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    results.push({
      step: 'Health rating',
      status: 'success',
      rating: healthRating,
    });

    // Test response formatting
    results.push({
      step: 'Formatting response',
      status: 'in_progress',
    });

    const formattedResponse = responseFormatterSG.formatResponse(
      recognitionResponse.result,
      healthRating,
      'uncle'
    );

    results.push({
      step: 'Response formatted',
      status: 'success',
      response: formattedResponse,
    });

    // Summary
    const summary = {
      totalSteps: results.filter(r => r.status === 'success').length,
      imageSize: imageBuffer.length,
      tokensUsed: recognitionResponse.tokensUsed,
      foodDetected: recognitionResponse.result.foods[0]?.name,
      healthScore: healthRating.score,
      processingTime: Date.now(),
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      formattedResponse,
    });
  } catch (error) {
    results.push({
      step: 'Error',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    });
  }
}
