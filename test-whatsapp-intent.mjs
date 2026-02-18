/**
 * Test WhatsApp Intent Recognition End-to-End
 * Simulates a real WhatsApp message to test the full flow
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER_ID = '6583153431'; // User's WhatsApp number

async function testWhatsAppIntent(text) {
  console.log(`\n🧪 Testing: "${text}"`);
  console.log('='.repeat(60));

  try {
    // Simulate WhatsApp webhook payload
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test_entry',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+65 8315 3431',
              phone_number_id: '975292692337720'
            },
            contacts: [{
              profile: {
                name: 'Test User'
              },
              wa_id: TEST_USER_ID
            }],
            messages: [{
              from: TEST_USER_ID,
              id: 'test_msg_' + Date.now(),
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: {
                body: text
              }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    console.log('📤 Sending webhook request...');
    const response = await fetch(`${PRODUCTION_URL}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Webhook processed successfully');
      console.log('📱 Check your WhatsApp for the response!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Webhook failed');
      console.log('Error:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log('❌ Request failed');
    console.log('Error:', error.message);
  }
}

// Test the exact commands the user reported as not working
async function runTests() {
  console.log('🚀 Testing WhatsApp Intent Recognition End-to-End');
  console.log('📍 URL:', PRODUCTION_URL);
  console.log('📱 Test User:', TEST_USER_ID);
  console.log('\n⚠️  Note: This will send actual messages to WhatsApp!');
  console.log('Check your WhatsApp (+65 8315 3431) for responses.\n');

  // Wait a bit between tests to avoid rate limiting
  await testWhatsAppIntent('我想看一下数据分析');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testWhatsAppIntent('我最近吃了什么');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testWhatsAppIntent('我的统计数据');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n' + '='.repeat(60));
  console.log('✅ All test messages sent!');
  console.log('📱 Check your WhatsApp (+65 8315 3431) for responses.');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
