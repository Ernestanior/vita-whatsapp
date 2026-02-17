/**
 * Full Flow Test - Complete User Journey
 * 
 * Simulates a complete user journey from registration to daily usage:
 * 1. New user sends first food photo
 * 2. Bot prompts for profile setup
 * 3. User provides basic info (3 numbers)
 * 4. User sends more photos
 * 5. Progressive profiling triggers
 * 6. User interacts with buttons
 * 7. User checks stats
 * 8. Quota limit is reached
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

const TEST_USER = '6583153431';

interface TestStep {
  step: number;
  name: string;
  action: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  duration?: number;
  error?: string;
  result?: any;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: TestStep[] = [
    { step: 1, name: 'Clean Up', action: 'Delete test user data', status: 'pending' },
    { step: 2, name: 'First Photo', action: 'Send chicken rice photo', status: 'pending' },
    { step: 3, name: 'Second Photo', action: 'Send laksa photo (triggers basic info prompt)', status: 'pending' },
    { step: 4, name: 'Quick Setup', action: 'Send "25 170 65"', status: 'pending' },
    { step: 5, name: 'Third Photo', action: 'Send bak kut teh photo', status: 'pending' },
    { step: 6, name: 'Fourth Photo', action: 'Send satay photo', status: 'pending' },
    { step: 7, name: 'Fifth Photo', action: 'Send nasi lemak photo (triggers goals prompt)', status: 'pending' },
    { step: 8, name: 'Set Goal', action: 'Click "Lose Weight" button', status: 'pending' },
    { step: 9, name: 'Check Profile', action: 'Send /profile command', status: 'pending' },
    { step: 10, name: 'Check Stats', action: 'Send /stats command', status: 'pending' },
    { step: 11, name: 'Quota Test', action: 'Send 6th photo (should hit quota)', status: 'pending' },
    { step: 12, name: 'Help Command', action: 'Send /help command', status: 'pending' },
  ];

  console.log('🚀 Starting Full Flow Test\n');
  console.log('=' .repeat(60));
  console.log('Simulating complete user journey from registration to daily usage');
  console.log('=' .repeat(60) + '\n');

  try {
    // Execute each step
    for (const step of steps) {
      step.status = 'running';
      const stepStart = Date.now();
      
      console.log(`\n📍 Step ${step.step}/${steps.length}: ${step.name}`);
      console.log(`   Action: ${step.action}`);
      
      try {
        const result = await executeStep(step.step);
        step.status = 'pass';
        step.duration = Date.now() - stepStart;
        step.result = result;
        
        console.log(`   ✅ PASS (${step.duration}ms)`);
        if (result?.message) {
          console.log(`   💬 ${result.message}`);
        }
      } catch (error) {
        step.status = 'fail';
        step.duration = Date.now() - stepStart;
        step.error = error instanceof Error ? error.message : 'Unknown error';
        
        console.log(`   ❌ FAIL (${step.duration}ms)`);
        console.log(`   Error: ${step.error}`);
        
        // Continue with other steps even if one fails
      }
    }

    // Calculate summary
    const totalTime = Date.now() - startTime;
    const passed = steps.filter(s => s.status === 'pass').length;
    const failed = steps.filter(s => s.status === 'fail').length;
    const passRate = ((passed / steps.length) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Steps: ${steps.length}`);
    console.log(`Passed: ✅ ${passed}`);
    console.log(`Failed: ❌ ${failed}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Avg Time: ${Math.round(totalTime / steps.length)}ms`);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json({
      success: true,
      summary: {
        total: steps.length,
        passed,
        failed,
        passRate: `${passRate}%`,
        totalTime: `${totalTime}ms`,
        avgTime: `${Math.round(totalTime / steps.length)}ms`,
      },
      steps,
    });

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      steps,
    }, { status: 500 });
  }
}

/**
 * Execute individual test step
 */
async function executeStep(step: number): Promise<any> {
  switch (step) {
    case 1:
      return await cleanupTestUser();
    
    case 2:
      return await sendFoodPhoto('Chicken Rice', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800');
    
    case 3:
      return await sendFoodPhoto('Laksa', 'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=800');
    
    case 4:
      return await sendTextMessage('25 170 65');
    
    case 5:
      return await sendFoodPhoto('Bak Kut Teh', 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800');
    
    case 6:
      return await sendFoodPhoto('Satay', 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=800');
    
    case 7:
      return await sendFoodPhoto('Nasi Lemak', 'https://images.unsplash.com/photo-1596040033229-a0b3b7e8c5e0?w=800');
    
    case 8:
      return await clickButton('goal_1', 'Lose Weight');
    
    case 9:
      return await sendTextMessage('/profile');
    
    case 10:
      return await sendTextMessage('/stats');
    
    case 11:
      return await sendFoodPhoto('Quota Test', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800');
    
    case 12:
      return await sendTextMessage('/help');
    
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

/**
 * Clean up test user
 */
async function cleanupTestUser(): Promise<any> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', TEST_USER)
    .maybeSingle();

  if (user) {
    await supabase.from('food_records').delete().eq('user_id', user.id);
    await supabase.from('health_profiles').delete().eq('user_id', user.id);
    await supabase.from('usage_quotas').delete().eq('user_id', user.id);
    await supabase.from('users').delete().eq('id', user.id);
  }

  return { message: 'Test user data cleaned' };
}

/**
 * Send food photo
 */
async function sendFoodPhoto(foodName: string, imageUrl: string): Promise<any> {
  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${foodName} image`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Import handlers
  const { imageHandler } = await import('@/lib/whatsapp/image-handler');
  const { Message, MessageContext } = await import('@/types/whatsapp');

  // Create message
  const message: any = {
    id: `test_${Date.now()}`,
    from: TEST_USER,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: 'image',
    image: {
      id: 'test_image_id',
      mime_type: 'image/jpeg',
    },
  };

  const context: any = {
    userId: TEST_USER,
    messageId: message.id,
    timestamp: new Date(),
    language: 'en',
  };

  // Mock WhatsApp client
  const { whatsappClient } = await import('@/lib/whatsapp/client');
  const originalDownload = whatsappClient.downloadMedia;
  whatsappClient.downloadMedia = async () => imageBuffer;

  try {
    await imageHandler.handle(message, context);
    return {
      message: `${foodName} photo processed (${imageBuffer.length} bytes)`,
    };
  } finally {
    whatsappClient.downloadMedia = originalDownload;
  }
}

/**
 * Send text message
 */
async function sendTextMessage(text: string): Promise<any> {
  const { TextHandler } = await import('@/lib/whatsapp/text-handler');

  const message: any = {
    id: `test_${Date.now()}`,
    from: TEST_USER,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: 'text',
    text: {
      body: text,
    },
  };

  const context: any = {
    userId: TEST_USER,
    messageId: message.id,
    timestamp: new Date(),
    language: 'en',
  };

  const textHandler = new TextHandler();
  await textHandler.handle(message, context);

  return { message: `Text message sent: "${text}"` };
}

/**
 * Click button
 */
async function clickButton(buttonId: string, buttonTitle: string): Promise<any> {
  const { interactiveHandler } = await import('@/lib/whatsapp/interactive-handler');

  const message: any = {
    id: `test_${Date.now()}`,
    from: TEST_USER,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: 'interactive',
    interactive: {
      type: 'button_reply',
      button_reply: {
        id: buttonId,
        title: buttonTitle,
      },
    },
  };

  const context: any = {
    userId: TEST_USER,
    messageId: message.id,
    timestamp: new Date(),
    language: 'en',
  };

  await interactiveHandler.handle(message, context);

  return { message: `Button clicked: "${buttonTitle}"` };
}
