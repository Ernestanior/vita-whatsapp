// @ts-nocheck
/**
 * Test endpoint to simulate webhook and check processing
 * POST /api/webhook-test
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookHandler } from '@/lib/whatsapp/webhook-handler';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const testPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "TEST_ACCOUNT_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15550000000",
                  phone_number_id: "975292692337720"
                },
                contacts: [
                  {
                    profile: {
                      name: "Test User"
                    },
                    wa_id: "6583153431"
                  }
                ],
                messages: [
                  {
                    from: "6583153431",
                    id: `wamid.test_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: {
                      body: "Test message from webhook-test endpoint"
                    },
                    type: "text"
                  }
                ]
              },
              field: "messages"
            }
          ]
        }
      ]
    };

    logger.info({
      type: 'webhook_test_started',
      payload: testPayload,
    });

    // Process the test webhook (without signature verification)
    await webhookHandler.handleWebhook(
      testPayload,
      JSON.stringify(testPayload),
      null // No signature for test
    );

    return NextResponse.json({
      success: true,
      message: 'Test webhook processed. Check if you received a WhatsApp message.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      type: 'webhook_test_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
