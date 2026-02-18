/**
 * Test AI Direct Call
 * Directly test conversation router via API
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';

async function testAIDirect() {
  console.log('🤖 Testing AI Conversation Router\n');
  
  const tests = [
    '我胖了两斤',
    '我瘦了3公斤',
    'I gained 2kg',
    '我现在70kg',
    'show me my profile',
  ];

  for (const text of tests) {
    console.log(`\n📝 Testing: "${text}"`);
    
    // Simulate webhook message
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
              wa_id: '6583153431'
            }],
            messages: [{
              from: '6583153431',
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
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ All messages sent. Check WhatsApp for responses!');
}

testAIDirect().catch(console.error);
