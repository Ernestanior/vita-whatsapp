/**
 * Test script for WhatsApp webhook endpoint
 * 
 * Usage:
 *   npx tsx scripts/test-webhook.ts
 */

import { env } from '../src/config/env';

const WEBHOOK_URL = env.NEXT_PUBLIC_URL + '/api/webhook';

async function testWebhookVerification() {
  console.log('🔍 Testing webhook verification...\n');

  const url = new URL(WEBHOOK_URL);
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', env.WHATSAPP_VERIFY_TOKEN);
  url.searchParams.set('hub.challenge', 'test-challenge-123');

  try {
    const response = await fetch(url.toString());
    const text = await response.text();

    if (response.ok && text === 'test-challenge-123') {
      console.log('✅ Webhook verification: PASSED');
      console.log(`   Response: ${text}\n`);
      return true;
    } else {
      console.log('❌ Webhook verification: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${text}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook verification: ERROR');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return false;
  }
}

async function testWebhookMessage() {
  console.log('📨 Testing webhook message handling...\n');

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID,
              },
              contacts: [
                {
                  profile: { name: 'Test User' },
                  wa_id: '1234567890',
                },
              ],
              messages: [
                {
                  from: '1234567890',
                  id: 'test-msg-id',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: 'Hello Vita AI!' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Webhook message handling: PASSED');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return true;
    } else {
      console.log('❌ Webhook message handling: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook message handling: ERROR');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return false;
  }
}

async function testWebhookImage() {
  console.log('🖼️  Testing webhook image handling...\n');

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry-id',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID,
              },
              contacts: [
                {
                  profile: { name: 'Test User' },
                  wa_id: '1234567890',
                },
              ],
              messages: [
                {
                  from: '1234567890',
                  id: 'test-img-msg-id',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'image',
                  image: {
                    id: 'test-media-id',
                    mime_type: 'image/jpeg',
                    sha256: 'test-hash',
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Webhook image handling: PASSED');
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return true;
    } else {
      console.log('❌ Webhook image handling: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(data)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook image handling: ERROR');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 WhatsApp Webhook Test Suite\n');
  console.log(`Testing endpoint: ${WEBHOOK_URL}\n`);
  console.log('=' .repeat(60) + '\n');

  const results = {
    verification: await testWebhookVerification(),
    message: await testWebhookMessage(),
    image: await testWebhookImage(),
  };

  console.log('=' .repeat(60) + '\n');
  console.log('📊 Test Results:\n');
  console.log(`   Verification: ${results.verification ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Message:      ${results.message ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Image:        ${results.image ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
