/**
 * Test Full Message Flow
 * Simulate real WhatsApp messages and check if bot responds
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431';

async function sendMessageAndWait(text, description) {
  console.log(`\n📝 Sending: "${text}"`);
  console.log(`   Description: ${description}`);
  
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
            id: `test-${Date.now()}-${Math.random()}`,
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

  const startTime = Date.now();
  const response = await fetch(`${BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhookPayload),
  });
  const responseTime = Date.now() - startTime;

  console.log(`   ✅ Webhook response: ${response.status} (${responseTime}ms)`);
  
  // Wait for processing
  console.log(`   ⏳ Waiting 3 seconds for processing...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return response.ok;
}

async function checkProfile() {
  const response = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
  const data = await response.json();
  return data.profile;
}

async function testFullFlow() {
  console.log('🧪 Testing Full Message Flow\n');
  console.log('=' .repeat(70));
  
  // Test 1: Check current profile
  console.log('\n📊 Step 1: Checking current profile...');
  let profile = await checkProfile();
  console.log(`   Current: age=${profile?.age}, weight=${profile?.weight}kg, height=${profile?.height}cm`);
  
  // Test 2: Send "我查了一下我现在只有28岁"
  await sendMessageAndWait(
    '我查了一下我现在只有28岁',
    'Update age to 28'
  );
  
  profile = await checkProfile();
  console.log(`   After update: age=${profile?.age}`);
  if (profile?.age === 28) {
    console.log('   ✅ Age updated successfully!');
  } else {
    console.log(`   ❌ Age NOT updated (still ${profile?.age})`);
  }
  
  // Test 3: Send "我胖了两斤"
  const weightBefore = profile?.weight;
  await sendMessageAndWait(
    '我胖了两斤',
    'Gained 2 jin (1kg)'
  );
  
  profile = await checkProfile();
  console.log(`   Before: ${weightBefore}kg, After: ${profile?.weight}kg`);
  if (profile?.weight === weightBefore + 1) {
    console.log('   ✅ Weight updated successfully!');
  } else {
    console.log(`   ❌ Weight NOT updated`);
  }
  
  // Test 4: Send "你好"
  await sendMessageAndWait(
    '你好',
    'Greeting (should get chat response)'
  );
  console.log('   ✅ Greeting sent (check WhatsApp for response)');
  
  // Test 5: Send "show me my profile"
  await sendMessageAndWait(
    'show me my profile',
    'View profile (should get profile info)'
  );
  console.log('   ✅ Profile request sent (check WhatsApp for response)');
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Summary:');
  console.log('- All messages sent successfully');
  console.log('- Check your WhatsApp to see if you received responses');
  console.log('- If no responses, there is a problem with message sending');
  console.log('\n⚠️  IMPORTANT: The bot should send messages to WhatsApp');
  console.log('   If you did not receive any messages, the WhatsApp client is broken');
}

testFullFlow().catch(console.error);
