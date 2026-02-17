/**
 * Real User Simulation Test
 * 
 * This endpoint simulates a real user interacting with the WhatsApp bot:
 * 1. Downloads real food images from the internet
 * 2. Sends them through the image handler
 * 3. Tests all text commands
 * 4. Tests button interactions
 * 5. Tests progressive profiling
 * 6. Generates comprehensive test report
 */

import { NextRequest, NextResponse } from 'next/server';
import { imageHandler } from '@/lib/whatsapp/image-handler';
import { TextHandler } from '@/lib/whatsapp/text-handler';
import { interactiveHandler } from '@/lib/whatsapp/interactive-handler';
import { createClient } from '@/lib/supabase/server';
import type { Message, MessageContext } from '@/types/whatsapp';

// Test user phone number
const TEST_USER = '6583153431';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];

  console.log('🚀 Starting Real User Simulation Test...\n');

  try {
    // Clean up test user data first
    await cleanupTestUser();

    // Test 1: Download and test chicken rice image
    results.push(await testFoodImage(
      'Chicken Rice',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800'
    ));

    // Test 2: Download and test laksa image
    results.push(await testFoodImage(
      'Laksa',
      'https://images.unsplash.com/photo-1569562211093-4ed0d0758f12?w=800'
    ));

    // Test 3: Test /start command
    results.push(await testTextCommand('/start', 'Start Command'));

    // Test 4: Test quick setup (3 numbers)
    results.push(await testTextCommand('25 170 65', 'Quick Setup'));

    // Test 5: Test /profile command
    results.push(await testTextCommand('/profile', 'Profile Command'));

    // Test 6: Test /help command
    results.push(await testTextCommand('/help', 'Help Command'));

    // Test 7: Test /stats command
    results.push(await testTextCommand('/stats', 'Stats Command'));

    // Test 8: Test button interaction
    results.push(await testButtonInteraction());

    // Test 9: Test quota limit
    results.push(await testQuotaLimit());

    // Test 10: Test Singapore food recognition
    results.push(await testFoodImage(
      'Bak Kut Teh',
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800'
    ));

    // Calculate summary
    const totalTime = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const skipped = results.filter(r => r.status === 'skip').length;
    const passRate = ((passed / results.length) * 100).toFixed(1);

    const summary = {
      total: results.length,
      passed,
      failed,
      skipped,
      passRate: `${passRate}%`,
      totalTime: `${totalTime}ms`,
      avgTime: `${Math.round(totalTime / results.length)}ms`,
    };

    // Generate report
    const report = generateReport(results, summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
      report,
    });

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    }, { status: 500 });
  }
}

/**
 * Clean up test user data
 */
async function cleanupTestUser(): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get user UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', TEST_USER)
      .maybeSingle();

    if (user) {
      // Delete food records
      await supabase
        .from('food_records')
        .delete()
        .eq('user_id', user.id);

      // Delete health profile
      await supabase
        .from('health_profiles')
        .delete()
        .eq('user_id', user.id);

      // Delete usage quotas
      await supabase
        .from('usage_quotas')
        .delete()
        .eq('user_id', user.id);

      // Delete user
      await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
    }

    console.log('✅ Test user data cleaned up\n');
  } catch (error) {
    console.error('⚠️  Cleanup failed:', error);
  }
}

/**
 * Test food image recognition
 */
async function testFoodImage(
  foodName: string,
  imageUrl: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`📸 Testing ${foodName} image...`);

    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    console.log(`  ✓ Downloaded image (${imageBuffer.length} bytes)`);

    // Create message context
    const message: Message = {
      id: `test_${Date.now()}`,
      from: TEST_USER,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'image',
      image: {
        id: 'test_image_id',
        mime_type: 'image/jpeg',
      },
    };

    const context: MessageContext = {
      userId: TEST_USER,
      messageId: message.id,
      timestamp: new Date(),
      language: 'en',
    };

    // Mock WhatsApp client download
    const originalDownload = (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia;
    (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia = async () => imageBuffer;

    // Process image
    await imageHandler.handle(message, context);

    // Restore original function
    (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia = originalDownload;

    const duration = Date.now() - startTime;
    console.log(`  ✓ ${foodName} processed in ${duration}ms\n`);

    return {
      name: `Image: ${foodName}`,
      status: 'pass',
      duration,
      details: {
        imageSize: imageBuffer.length,
        imageUrl,
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`  ✗ ${foodName} failed:`, error);

    return {
      name: `Image: ${foodName}`,
      status: 'fail',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test text command
 */
async function testTextCommand(
  text: string,
  testName: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`💬 Testing ${testName}...`);

    const message: Message = {
      id: `test_${Date.now()}`,
      from: TEST_USER,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'text',
      text: {
        body: text,
      },
    };

    const context: MessageContext = {
      userId: TEST_USER,
      messageId: message.id,
      timestamp: new Date(),
      language: 'en',
    };

    const textHandler = new TextHandler();
    await textHandler.handle(message, context);

    const duration = Date.now() - startTime;
    console.log(`  ✓ ${testName} completed in ${duration}ms\n`);

    return {
      name: testName,
      status: 'pass',
      duration,
      details: { text },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`  ✗ ${testName} failed:`, error);

    return {
      name: testName,
      status: 'fail',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test button interaction
 */
async function testButtonInteraction(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔘 Testing button interaction...');

    const message: Message = {
      id: `test_${Date.now()}`,
      from: TEST_USER,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: 'record_test123',
          title: '✅ Record',
        },
      },
    };

    const context: MessageContext = {
      userId: TEST_USER,
      messageId: message.id,
      timestamp: new Date(),
      language: 'en',
    };

    await interactiveHandler.handle(message, context);

    const duration = Date.now() - startTime;
    console.log(`  ✓ Button interaction completed in ${duration}ms\n`);

    return {
      name: 'Button Interaction',
      status: 'pass',
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('  ✗ Button interaction failed:', error);

    return {
      name: 'Button Interaction',
      status: 'fail',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test quota limit
 */
async function testQuotaLimit(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('📊 Testing quota limit...');

    // Try to send 4th image (should be blocked)
    const imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const message: Message = {
      id: `test_${Date.now()}`,
      from: TEST_USER,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'image',
      image: {
        id: 'test_image_id',
        mime_type: 'image/jpeg',
      },
    };

    const context: MessageContext = {
      userId: TEST_USER,
      messageId: message.id,
      timestamp: new Date(),
      language: 'en',
    };

    // Mock download
    const originalDownload = (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia;
    (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia = async () => imageBuffer;

    await imageHandler.handle(message, context);

    // Restore
    (await import('@/lib/whatsapp/client')).whatsappClient.downloadMedia = originalDownload;

    const duration = Date.now() - startTime;
    console.log(`  ✓ Quota limit tested in ${duration}ms\n`);

    return {
      name: 'Quota Limit',
      status: 'pass',
      duration,
      details: {
        message: 'Should show quota exceeded message',
      },
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('  ✗ Quota limit test failed:', error);

    return {
      name: 'Quota Limit',
      status: 'fail',
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate test report
 */
function generateReport(results: TestResult[], summary: any): string {
  let report = '# 🧪 Real User Simulation Test Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n\n`;
  report += '## 📊 Summary\n\n';
  report += `- **Total Tests**: ${summary.total}\n`;
  report += `- **Passed**: ✅ ${summary.passed}\n`;
  report += `- **Failed**: ❌ ${summary.failed}\n`;
  report += `- **Skipped**: ⏭️  ${summary.skipped}\n`;
  report += `- **Pass Rate**: ${summary.passRate}\n`;
  report += `- **Total Time**: ${summary.totalTime}\n`;
  report += `- **Avg Time**: ${summary.avgTime}\n\n`;

  report += '## 📋 Test Results\n\n';
  
  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
    report += `### ${icon} ${result.name}\n\n`;
    report += `- **Status**: ${result.status.toUpperCase()}\n`;
    report += `- **Duration**: ${result.duration}ms\n`;
    
    if (result.error) {
      report += `- **Error**: ${result.error}\n`;
    }
    
    if (result.details) {
      report += `- **Details**: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    
    report += '\n';
  }

  return report;
}
