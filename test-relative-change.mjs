/**
 * Test Relative Weight Change
 * Test "我胖了两斤" (I gained 2 jin = 1kg)
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431';

async function testRelativeChange() {
  console.log('🧪 Testing Relative Weight Change\n');
  
  // Step 1: Get current weight
  console.log('📊 Step 1: Getting current weight...');
  const checkResponse = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
  const userData = await checkResponse.json();
  const currentWeight = userData.profile?.weight;
  
  console.log(`   Current weight: ${currentWeight}kg\n`);
  
  // Step 2: Send "我胖了两斤" message
  console.log('📝 Step 2: Sending "我胖了两斤" (gained 2 jin = 1kg)...');
  
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-entry',
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
            wa_id: TEST_USER
          }],
          messages: [{
            from: TEST_USER,
            id: `test-${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            type: 'text',
            text: {
              body: '我胖了两斤'
            }
          }]
        },
        field: 'messages'
      }]
    }]
  };

  const startTime = Date.now();
  const response = await fetch(`${BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });
  const responseTime = Date.now() - startTime;

  console.log(`   Response status: ${response.status}`);
  console.log(`   Response time: ${responseTime}ms\n`);

  if (!response.ok) {
    console.log('❌ Webhook failed');
    return;
  }

  // Step 3: Wait for processing
  console.log('⏳ Step 3: Waiting for processing (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 4: Check if weight was updated
  console.log('\n📊 Step 4: Checking if weight was updated...');
  const checkResponse2 = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
  const userData2 = await checkResponse2.json();
  const newWeight = userData2.profile?.weight;
  
  console.log(`   Previous weight: ${currentWeight}kg`);
  console.log(`   New weight: ${newWeight}kg`);
  console.log(`   Expected: ${currentWeight + 1}kg (gained 1kg)\n`);
  
  if (newWeight === currentWeight + 1) {
    console.log('✅ SUCCESS! Weight updated correctly.');
  } else if (newWeight === currentWeight) {
    console.log('❌ FAILED: Weight was not updated.');
    console.log('   This means the AI did not understand "我胖了两斤"');
  } else {
    console.log(`⚠️  UNEXPECTED: Weight changed to ${newWeight}kg`);
  }
}

testRelativeChange().catch(console.error);
