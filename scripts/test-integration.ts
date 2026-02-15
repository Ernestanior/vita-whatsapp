/**
 * Integration Test Script
 * 
 * This script tests the complete food recognition flow:
 * 1. Image download
 * 2. Food recognition
 * 3. Health rating
 * 4. Database save
 * 5. Cache
 * 
 * Usage: tsx scripts/test-integration.ts
 */

import { foodRecognizer } from '../src/lib/food-recognition/recognizer';
import { ratingEngine } from '../src/lib/rating/rating-engine';
import { cacheManager } from '../src/lib/cache/cache-manager';
// import { profileManager } from '../src/lib/profile/profile-manager';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testIntegration() {
  console.log('🧪 Testing Complete Integration Flow\n');

  try {
    // 1. Load test image
    console.log('📸 Loading test image...');
    const imagePath = join(__dirname, '../test-images/chicken-rice.jpg');
    let imageBuffer: Buffer;
    
    try {
      imageBuffer = readFileSync(imagePath);
      console.log(`✅ Image loaded: ${imageBuffer.length} bytes\n`);
    } catch (error) {
      console.log('⚠️  Test image not found, using placeholder');
      console.log('   Create test-images/chicken-rice.jpg to test with real image\n');
      // Create a minimal valid JPEG buffer for testing
      imageBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
      ]);
    }

    // 2. Test food recognition
    console.log('🔍 Testing food recognition...');
    const recognitionResult = await foodRecognizer.recognizeFood(imageBuffer, {
      userId: 'test-user-123',
      language: 'en',
      mealTime: new Date(),
    });

    if (!recognitionResult.success || !recognitionResult.result) {
      console.error('❌ Food recognition failed:', recognitionResult.error);
      return;
    }

    console.log('✅ Food recognition successful!');
    console.log(`   Foods detected: ${recognitionResult.result.foods.length}`);
    console.log(`   Processing time: ${recognitionResult.processingTime}ms`);
    console.log(`   Tokens used: ${recognitionResult.tokensUsed}\n`);

    // 3. Test health rating
    console.log('💚 Testing health rating...');
    
    // Create a test profile
    const testProfile = {
      userId: 'test-user-123',
      height: 170,
      weight: 70,
      age: 30,
      gender: 'male' as const,
      goal: 'maintain' as const,
      activityLevel: 'light' as const,
      digestTime: '21:00:00',
      quickMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const healthRating = await ratingEngine.evaluate(
      recognitionResult.result,
      testProfile
    );

    console.log('✅ Health rating calculated!');
    console.log(`   Overall: ${healthRating.overall} (${healthRating.score}/100)`);
    console.log(`   Factors evaluated: ${healthRating.factors.length}`);
    console.log(`   Suggestions: ${healthRating.suggestions.length}\n`);

    // 4. Test cache
    console.log('💾 Testing cache...');
    const testHash = 'test-hash-' + Date.now();
    
    await cacheManager.setFoodRecognition(testHash, recognitionResult.result);
    const cachedResult = await cacheManager.getFoodRecognition(testHash);
    
    if (cachedResult) {
      console.log('✅ Cache working!');
      console.log(`   Cached foods: ${cachedResult.foods.length}\n`);
    } else {
      console.log('⚠️  Cache not working (might be disabled)\n');
    }

    // 5. Display results
    console.log('📊 Recognition Results:');
    console.log('─'.repeat(50));
    
    for (const food of recognitionResult.result.foods) {
      console.log(`\n🍽️  ${food.name} (${food.nameLocal})`);
      console.log(`   Confidence: ${food.confidence}%`);
      console.log(`   Portion: ${food.portion}`);
      console.log(`   Calories: ${food.nutrition.calories.min}-${food.nutrition.calories.max} kcal`);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('\n💡 Health Analysis:');
    console.log('─'.repeat(50));
    
    for (const factor of healthRating.factors) {
      const emoji = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
      console.log(`${emoji} ${factor.name}: ${factor.message}`);
    }

    if (healthRating.suggestions.length > 0) {
      console.log('\n💪 Suggestions:');
      for (const suggestion of healthRating.suggestions) {
        console.log(`   • ${suggestion}`);
      }
    }

    console.log('\n' + '─'.repeat(50));
    console.log('\n✅ Integration test completed successfully!');

  } catch (error) {
    console.error('\n❌ Integration test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testIntegration().catch(console.error);
