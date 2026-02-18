/**
 * Test Old Handler
 * Test if reverting to TextHandler fixes the issue
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431';

async function testOldHandler() {
  console.log('🧪 Testing Old TextHandler\n');
  
  const tests = [
    '你好',
    'show me my profile',
    'stats',
  ];

  for (const text of tests) {
    console.log(`\n📝 Sending: "${text}"`);
    
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'test',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+65 8315 3431',
              phone_number_id: '975292692337720'
            },
            contacts: [{
              profile: { name: 'Test' },
              wa_id: TEST_USER
            }],
            messages: [{
              from: TEST_USER,
              id: `test-${Date.now()}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: 'text',
              text: { body: text }
            }]
          },
          field: 'messages'
        }]
      }]
    };

    const response = await fetch(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    console.log(`   Response: ${response.status}`);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ All messages sent.');
  console.log('💡 Check your WhatsApp - you should receive responses now!');
  console.log('   If you receive responses, the problem was in TextHandlerV2');
  console.log('   If you still don\'t receive responses, the problem is elsewhere');
}

testOldHandler().catch(console.error);
