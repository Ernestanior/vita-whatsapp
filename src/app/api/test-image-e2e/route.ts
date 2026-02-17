/**
 * End-to-End Image Test
 * Downloads a real food image and tests the complete flow
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log('🚀 Starting End-to-End Image Test\n');
    log('=' .repeat(60));

    // Step 1: Download a real food image
    log('\n📥 Step 1: Downloading chicken rice image from Unsplash...');
    const imageUrl = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800';
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }
    
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    log(`✅ Image downloaded: ${imageBuffer.length} bytes`);

    // Step 2: Process image
    log('\n🔄 Step 2: Processing image...');
    const { imageHandler: imageProcessor } = await import('@/lib/food-recognition/image-handler');
    const processed = await imageProcessor.processImage(imageBuffer);
    log(`✅ Image processed: ${processed.size} bytes, hash: ${processed.hash.substring(0, 10)}...`);

    // Step 3: Call OpenAI Vision API
    log('\n🤖 Step 3: Calling OpenAI Vision API...');
    const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
    
    const recognitionResult = await foodRecognizer.recognizeFood(imageBuffer, {
      userId: '6583153431',
      language: 'en',
      mealTime: new Date(),
    });

    if (!recognitionResult.success) {
      log(`❌ Recognition failed: ${recognitionResult.error?.message}`);
      return NextResponse.json({
        success: false,
        error: recognitionResult.error,
        logs,
      }, { status: 500 });
    }

    log(`✅ Food recognized: ${recognitionResult.result?.foods.length} items`);
    log(`   Tokens used: ${recognitionResult.tokensUsed}`);
    log(`   Processing time: ${recognitionResult.processingTime}ms`);

    // Step 4: Calculate health rating
    log('\n📊 Step 4: Calculating health rating...');
    const { ratingEngine } = await import('@/lib/rating/rating-engine');
    
    const healthRating = await ratingEngine.evaluate(recognitionResult.result!, {
      userId: '6583153431',
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
    });

    log(`✅ Health rating: ${healthRating.overall} (${healthRating.score}/100)`);
    log(`   Factors: ${healthRating.factors.length}`);
    log(`   Suggestions: ${healthRating.suggestions.length}`);

    // Step 5: Format response message
    log('\n💬 Step 5: Formatting response message...');
    const message = formatResponseMessage(recognitionResult.result!, healthRating);
    log(`✅ Message formatted: ${message.length} characters`);

    // Step 6: Test complete flow with webhook
    log('\n🔗 Step 6: Testing complete webhook flow...');
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '6583153431',
              phone_number_id: '975292692337720',
            },
            contacts: [{
              profile: { name: 'Test User' },
              wa_id: '6583153431',
            }],
            messages: [{
              from: '6583153431',
              id: `test_msg_${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'image',
              image: {
                caption: 'Test chicken rice',
                mime_type: 'image/jpeg',
                sha256: processed.hash,
                id: 'test_image_id',
              },
            }],
          },
          field: 'messages',
        }],
      }],
    };

    // Mock WhatsApp client
    const { whatsappClient } = await import('@/lib/whatsapp/client');
    const originalDownload = whatsappClient.downloadMedia;
    const originalSendText = whatsappClient.sendTextMessage;
    const originalSendButton = whatsappClient.sendButtonMessage;
    
    const sentMessages: string[] = [];
    
    whatsappClient.downloadMedia = async () => imageBuffer;
    whatsappClient.sendTextMessage = async (to: string, text: string) => {
      log(`📤 Would send to ${to}: ${text.substring(0, 100)}...`);
      sentMessages.push(text);
      return { messaging_product: 'whatsapp', contacts: [], messages: [] };
    };
    whatsappClient.sendButtonMessage = async (to: string, text: string, buttons: any[]) => {
      log(`🔘 Would send buttons to ${to}: ${buttons.length} buttons`);
      sentMessages.push(text);
      return { messaging_product: 'whatsapp', contacts: [], messages: [] };
    };

    // Process webhook
    const { webhookHandler } = await import('@/lib/whatsapp/webhook-handler');
    await webhookHandler.handleWebhook(webhookPayload, JSON.stringify(webhookPayload), null);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Restore
    whatsappClient.downloadMedia = originalDownload;
    whatsappClient.sendTextMessage = originalSendText;
    whatsappClient.sendButtonMessage = originalSendButton;

    log(`✅ Webhook processed, ${sentMessages.length} messages sent`);

    log('\n' + '='.repeat(60));
    log('✅ ALL TESTS PASSED!');
    log('='.repeat(60));

    return NextResponse.json({
      success: true,
      summary: {
        imageSize: imageBuffer.length,
        foodsDetected: recognitionResult.result?.foods.length,
        tokensUsed: recognitionResult.tokensUsed,
        processingTime: recognitionResult.processingTime,
        healthRating: healthRating.overall,
        healthScore: healthRating.score,
        messagesSent: sentMessages.length,
      },
      recognitionResult: recognitionResult.result,
      healthRating,
      formattedMessage: message,
      sentMessages,
      logs,
    });

  } catch (error) {
    log(`\n❌ TEST FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    log(`Stack: ${error instanceof Error ? error.stack : 'No stack'}`);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      logs,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

function formatResponseMessage(result: any, rating: any): string {
  const ratingEmoji = { green: '🟢', yellow: '🟡', red: '🔴' };
  const ratingText = { green: 'Healthy', yellow: 'Moderate', red: 'Unhealthy' };

  let message = '';
  message += `${ratingEmoji[rating.overall]} ${ratingText[rating.overall]} (${rating.score}/100)\n\n`;
  message += '🍽️ Detected Food:\n';
  
  for (const food of result.foods) {
    const avgCal = Math.round((food.nutrition.calories.min + food.nutrition.calories.max) / 2);
    message += `• ${food.name} (${food.portion})\n`;
    message += `  ${avgCal} kcal\n`;
  }

  message += '\n📊 Total Nutrition:\n';
  const avgCal = Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);
  const avgProtein = Math.round((result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2);
  const avgCarbs = Math.round((result.totalNutrition.carbs.min + result.totalNutrition.carbs.max) / 2);
  const avgFat = Math.round((result.totalNutrition.fat.min + result.totalNutrition.fat.max) / 2);
  
  message += `• Calories: ${avgCal} kcal\n`;
  message += `• Protein: ${avgProtein}g\n`;
  message += `• Carbs: ${avgCarbs}g\n`;
  message += `• Fat: ${avgFat}g\n`;

  message += '\n💡 Health Analysis:\n';
  for (const factor of rating.factors) {
    const emoji = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
    message += `${emoji} ${factor.message}\n`;
  }

  if (rating.suggestions.length > 0) {
    message += '\n💪 Suggestions:\n';
    for (const suggestion of rating.suggestions) {
      message += `• ${suggestion}\n`;
    }
  }

  return message;
}
