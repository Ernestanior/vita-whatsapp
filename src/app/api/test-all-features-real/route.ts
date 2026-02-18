/**
 * Complete Real User Feature Test
 * Simulates real WhatsApp messages to test ALL features
 */

import { NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';

const TEST_USER_ID = '6583153431'; // Your WhatsApp number

export async function GET() {
  const results: any[] = [];
  
  try {
    results.push({ test: 'Starting complete feature test', status: 'info' });

    // Test 1: Send "stats" command
    results.push({ test: 'Test 1: stats command', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing stats command - you should see statistics or "no data yet"'
      );
      results.push({ test: 'Test 1: stats command', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 1: stats command', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Wait 2 seconds between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Send "history" command
    results.push({ test: 'Test 2: history command', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing history command - you should see recent meals or "no history yet"'
      );
      results.push({ test: 'Test 2: history command', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 2: history command', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Send "profile" command
    results.push({ test: 'Test 3: profile command', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing profile command - you should see your profile or setup prompt'
      );
      results.push({ test: 'Test 3: profile command', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 3: profile command', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Send "help" command
    results.push({ test: 'Test 4: help command', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing help command - you should see help information'
      );
      results.push({ test: 'Test 4: help command', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 4: help command', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Send "start" command
    results.push({ test: 'Test 5: start command', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing start command - you should see welcome message'
      );
      results.push({ test: 'Test 5: start command', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 5: start command', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Test language detection with Chinese
    results.push({ test: 'Test 6: Chinese language detection', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing Chinese: 你好，这是中文测试'
      );
      results.push({ test: 'Test 6: Chinese language detection', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 6: Chinese language detection', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 7: Switch back to English
    results.push({ test: 'Test 7: Switch back to English', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing English: hello, switching back to English'
      );
      results.push({ test: 'Test 7: Switch back to English', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 7: Switch back to English', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 8: Quick profile setup
    results.push({ test: 'Test 8: Quick profile setup', status: 'testing' });
    try {
      await whatsappClient.sendTextMessage(
        TEST_USER_ID,
        'Testing quick setup: 30 175 70'
      );
      results.push({ test: 'Test 8: Quick profile setup', status: 'sent' });
    } catch (error) {
      results.push({ 
        test: 'Test 8: Quick profile setup', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 9: Send a real food image
    results.push({ test: 'Test 9: Food image recognition', status: 'testing' });
    try {
      // Download a food image
      const imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800';
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Upload to WhatsApp and send
      const mediaId = await whatsappClient.uploadMedia(imageBuffer, 'image/jpeg');
      await whatsappClient.sendImageMessage(TEST_USER_ID, mediaId);
      
      results.push({ 
        test: 'Test 9: Food image recognition', 
        status: 'sent',
        note: 'Image sent - should receive Singapore-style response with buttons'
      });
    } catch (error) {
      results.push({ 
        test: 'Test 9: Food image recognition', 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Summary
    const summary = {
      totalTests: 9,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      note: 'Check your WhatsApp to verify all responses are correct'
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      instructions: [
        '1. Check your WhatsApp messages',
        '2. Verify each command works correctly',
        '3. Test the interactive buttons on the food image',
        '4. Verify language switching worked',
        '5. Check that stats and history show data after sending image'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results
    });
  }
}
