/**
 * Test Webhook Image Handler
 * Simulates WhatsApp sending an image message to test the complete flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookHandler } from '@/lib/whatsapp/webhook-handler';
import type { WebhookPayload } from '@/types/whatsapp';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing webhook image handler...\n');

    // Create a mock WhatsApp webhook payload for an image message
    const mockPayload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'test_entry_id',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '6583153431',
                  phone_number_id: '975292692337720',
                },
                contacts: [
                  {
                    profile: {
                      name: 'Test User',
                    },
                    wa_id: '6583153431',
                  },
                ],
                messages: [
                  {
                    from: '6583153431',
                    id: `test_msg_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'image',
                    image: {
                      caption: 'Test food image',
                      mime_type: 'image/jpeg',
                      sha256: 'test_sha256',
                      id: 'test_image_id_12345',
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    console.log('📦 Mock payload created:');
    console.log(JSON.stringify(mockPayload, null, 2));

    // Mock the downloadMedia function to return a test image
    const { whatsappClient } = await import('@/lib/whatsapp/client');
    const originalDownload = whatsappClient.downloadMedia;
    
    // Download a real food image from Unsplash
    console.log('\n📥 Downloading test image from Unsplash...');
    const imageUrl = 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800';
    const imageResponse = await fetch(imageUrl);
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    
    console.log(`✅ Image downloaded: ${imageBuffer.length} bytes`);

    // Mock the download function
    whatsappClient.downloadMedia = async (mediaId: string) => {
      console.log(`🔄 Mock downloadMedia called with ID: ${mediaId}`);
      return imageBuffer;
    };

    // Mock the sendTextMessage function to log instead of sending
    const originalSendText = whatsappClient.sendTextMessage;
    const sentMessages: string[] = [];
    
    whatsappClient.sendTextMessage = async (to: string, text: string) => {
      console.log(`\n📤 Would send message to ${to}:`);
      console.log(text);
      console.log('---');
      sentMessages.push(text);
      return { messaging_product: 'whatsapp', contacts: [], messages: [] };
    };

    // Mock sendButtonMessage
    const originalSendButton = whatsappClient.sendButtonMessage;
    whatsappClient.sendButtonMessage = async (to: string, text: string, buttons: any[]) => {
      console.log(`\n🔘 Would send button message to ${to}:`);
      console.log(text);
      console.log('Buttons:', buttons.map(b => b.title).join(', '));
      console.log('---');
      sentMessages.push(text);
      return { messaging_product: 'whatsapp', contacts: [], messages: [] };
    };

    // Process the webhook
    console.log('\n🔄 Processing webhook...');
    const rawBody = JSON.stringify(mockPayload);
    await webhookHandler.handleWebhook(mockPayload, rawBody, null);

    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Restore original functions
    whatsappClient.downloadMedia = originalDownload;
    whatsappClient.sendTextMessage = originalSendText;
    whatsappClient.sendButtonMessage = originalSendButton;

    console.log('\n✅ Test completed!');
    console.log(`📊 Total messages sent: ${sentMessages.length}`);

    return NextResponse.json({
      success: true,
      messagesSent: sentMessages.length,
      messages: sentMessages,
      imageSize: imageBuffer.length,
      testPayload: mockPayload,
    });

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
