/**
 * Complete User Journey Test
 * Tests the entire user flow from start to finish
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const testResults: any[] = [];
  const testUserId = `test_${Date.now()}`;

  try {
    // Test 1: Download multiple food images
    testResults.push({ step: 'Downloading test images', status: 'in_progress' });
    
    const imageUrls = [
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', // Salad
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800', // Pizza
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800', // Pancakes
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800', // Salad bowl
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', // Burger
    ];

    const images: Buffer[] = [];
    for (const url of imageUrls) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      images.push(Buffer.from(arrayBuffer));
    }

    testResults.push({
      step: 'Images downloaded',
      status: 'success',
      count: images.length,
    });

    // Test 2: Process each image through the complete flow
    const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
    const { ratingEngine } = await import('@/lib/rating/rating-engine');
    const { responseFormatterSG } = await import('@/lib/whatsapp/response-formatter-sg');

    const processedResults = [];

    for (let i = 0; i < images.length; i++) {
      testResults.push({
        step: `Processing image ${i + 1}`,
        status: 'in_progress',
      });

      const startTime = Date.now();

      // Recognize food
      const recognitionResponse = await foodRecognizer.recognizeFood(
        images[i],
        {
          userId: testUserId,
          language: 'en',
          mealTime: new Date(),
        }
      );

      if (!recognitionResponse.success || !recognitionResponse.result) {
        testResults.push({
          step: `Image ${i + 1} recognition`,
          status: 'failed',
          error: recognitionResponse.error,
        });
        continue;
      }

      // Calculate health rating
      const healthRating = await ratingEngine.evaluate(
        recognitionResponse.result,
        {
          userId: testUserId,
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

      // Format response
      const formattedResponse = responseFormatterSG.formatResponse(
        recognitionResponse.result,
        healthRating,
        'uncle'
      );

      const processingTime = Date.now() - startTime;

      processedResults.push({
        imageIndex: i + 1,
        foodDetected: recognitionResponse.result.foods[0]?.name,
        calories: Math.round(
          (recognitionResponse.result.totalNutrition.calories.min +
            recognitionResponse.result.totalNutrition.calories.max) /
            2
        ),
        healthScore: healthRating.score,
        healthRating: healthRating.overall,
        processingTime,
        tokensUsed: recognitionResponse.tokensUsed,
        response: formattedResponse,
      });

      testResults.push({
        step: `Image ${i + 1} processed`,
        status: 'success',
        processingTime,
      });
    }

    // Test 3: Verify all features
    testResults.push({ step: 'Verifying features', status: 'in_progress' });

    const featureTests = {
      foodRecognition: processedResults.every(r => r.foodDetected),
      healthRating: processedResults.every(r => r.healthScore > 0),
      responseFormatting: processedResults.every(r => r.response.length > 0),
      performanceAcceptable: processedResults.every(r => r.processingTime < 45000), // < 45s
    };

    testResults.push({
      step: 'Feature verification',
      status: 'success',
      features: featureTests,
    });

    // Summary
    const summary = {
      totalImages: images.length,
      successfulProcessing: processedResults.length,
      averageProcessingTime: Math.round(
        processedResults.reduce((sum, r) => sum + r.processingTime, 0) /
          processedResults.length
      ),
      totalTokensUsed: processedResults.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      allFeaturesWorking: Object.values(featureTests).every(v => v),
    };

    return NextResponse.json({
      success: true,
      summary,
      processedResults,
      featureTests,
      testResults,
    });
  } catch (error) {
    testResults.push({
      step: 'Error',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      testResults,
    });
  }
}
