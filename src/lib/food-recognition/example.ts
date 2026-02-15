/**
 * Example usage of the Food Recognition System
 * 
 * This file demonstrates how to use the food recognition components
 * in your application.
 */

import { foodRecognizer, imageHandler } from './index';
import type { RecognitionResponse } from './recognizer';

/**
 * Example 1: Basic food recognition from image URL
 */
export async function recognizeFoodFromUrl(
  imageUrl: string,
  userId: string,
  language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
): Promise<RecognitionResponse> {
  try {
    // 1. Download image
    const imageBuffer = await imageHandler.downloadImage(imageUrl);

    // 2. Recognize food
    const response = await foodRecognizer.recognizeFood(imageBuffer, {
      userId,
      language,
      mealTime: new Date(),
    });

    return response;
  } catch (error) {
    console.error('Failed to recognize food:', error);
    throw error;
  }
}

/**
 * Example 2: Process image and get hash for caching
 */
export async function processAndCacheImage(imageBuffer: Buffer): Promise<{
  hash: string;
  dataUrl: string;
  size: number;
}> {
  // Process image
  const processed = await imageHandler.processImage(imageBuffer);

  // Convert to data URL
  const dataUrl = imageHandler.toDataUrl(processed.buffer, processed.format);

  return {
    hash: processed.hash,
    dataUrl,
    size: processed.size,
  };
}

/**
 * Example 3: Handle recognition response
 */
export function handleRecognitionResponse(response: RecognitionResponse): void {
  if (response.success && response.result) {
    console.log('✅ Recognition successful!');
    console.log(`📊 Processing time: ${response.processingTime}ms`);
    console.log(`🔢 Tokens used: ${response.tokensUsed}`);
    console.log(`🍽️  Meal context: ${response.result.mealContext}`);
    console.log('\n🍴 Foods detected:');

    response.result.foods.forEach((food, index) => {
      console.log(`\n${index + 1}. ${food.name} (${food.nameLocal})`);
      console.log(`   Confidence: ${food.confidence}%`);
      console.log(`   Portion: ${food.portion}`);
      console.log(`   Calories: ${food.nutrition.calories.min}-${food.nutrition.calories.max} kcal`);
      console.log(`   Protein: ${food.nutrition.protein.min}-${food.nutrition.protein.max}g`);
      console.log(`   Carbs: ${food.nutrition.carbs.min}-${food.nutrition.carbs.max}g`);
      console.log(`   Fat: ${food.nutrition.fat.min}-${food.nutrition.fat.max}g`);
      console.log(`   Sodium: ${food.nutrition.sodium.min}-${food.nutrition.sodium.max}mg`);
    });

    console.log('\n📈 Total Nutrition:');
    const total = response.result.totalNutrition;
    console.log(`   Calories: ${total.calories.min}-${total.calories.max} kcal`);
    console.log(`   Protein: ${total.protein.min}-${total.protein.max}g`);
    console.log(`   Carbs: ${total.carbs.min}-${total.carbs.max}g`);
    console.log(`   Fat: ${total.fat.min}-${total.fat.max}g`);
    console.log(`   Sodium: ${total.sodium.min}-${total.sodium.max}mg`);
  } else if (response.error) {
    console.error('❌ Recognition failed!');
    console.error(`   Type: ${response.error.type}`);
    console.error(`   Message: ${response.error.message}`);
    if (response.error.suggestion) {
      console.error(`   Suggestion: ${response.error.suggestion}`);
    }
  }
}

/**
 * Example 4: Complete workflow with error handling
 */
export async function completeRecognitionWorkflow(
  imageUrl: string,
  userId: string,
  language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
): Promise<void> {
  console.log('🚀 Starting food recognition workflow...\n');

  try {
    // Step 1: Download image
    console.log('📥 Downloading image...');
    const imageBuffer = await imageHandler.downloadImage(imageUrl);
    console.log(`✅ Downloaded ${imageBuffer.length} bytes\n`);

    // Step 2: Validate image
    console.log('🔍 Validating image...');
    const isValid = await imageHandler.validateImage(imageBuffer);
    if (!isValid) {
      console.error('❌ Invalid image format');
      return;
    }
    console.log('✅ Image is valid\n');

    // Step 3: Process image
    console.log('⚙️  Processing image...');
    const processed = await imageHandler.processImage(imageBuffer);
    console.log(`✅ Processed: ${processed.size} bytes (hash: ${processed.hash.substring(0, 8)}...)\n`);

    // Step 4: Recognize food
    console.log('🤖 Recognizing food with AI...');
    const response = await foodRecognizer.recognizeFood(imageBuffer, {
      userId,
      language,
      mealTime: new Date(),
    });

    // Step 5: Handle response
    handleRecognitionResponse(response);

    // Step 6: Check for low confidence
    if (response.success && response.result) {
      const lowConfidenceFoods = response.result.foods.filter(f => f.confidence < 60);
      if (lowConfidenceFoods.length > 0) {
        console.log('\n⚠️  Warning: Some foods have low confidence:');
        lowConfidenceFoods.forEach(food => {
          console.log(`   - ${food.name}: ${food.confidence}%`);
        });
        console.log('   Consider asking the user to confirm or retake the photo.');
      }
    }
  } catch (error) {
    console.error('\n💥 Workflow failed:', error);
    throw error;
  }
}

/**
 * Example 5: Batch processing multiple images
 */
export async function batchRecognizeFood(
  imageUrls: string[],
  userId: string,
  language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
): Promise<RecognitionResponse[]> {
  console.log(`🔄 Processing ${imageUrls.length} images...\n`);

  const results: RecognitionResponse[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    console.log(`\n📸 Image ${i + 1}/${imageUrls.length}: ${imageUrls[i]}`);
    
    try {
      const response = await recognizeFoodFromUrl(imageUrls[i], userId, language);
      results.push(response);

      if (response.success) {
        console.log(`✅ Success: ${response.result!.foods.length} food(s) detected`);
      } else {
        console.log(`❌ Failed: ${response.error!.message}`);
      }
    } catch (error) {
      console.error(`💥 Error processing image ${i + 1}:`, error);
      results.push({
        success: false,
        error: {
          type: 'AI_API_ERROR' as any,
          message: 'Failed to process image',
        },
      });
    }

    // Add delay to avoid rate limiting
    if (i < imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✨ Batch processing complete: ${results.filter(r => r.success).length}/${imageUrls.length} successful`);

  return results;
}

// Example usage (commented out - uncomment to test):
/*
async function main() {
  const imageUrl = 'https://example.com/chicken-rice.jpg';
  const userId = 'test-user-123';
  const language = 'en';

  await completeRecognitionWorkflow(imageUrl, userId, language);
}

main().catch(console.error);
*/
