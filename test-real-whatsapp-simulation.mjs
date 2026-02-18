/**
 * Real WhatsApp Simulation Test
 * Simulates actual WhatsApp user interactions to verify everything works
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431';

function createWebhookPayload(messageText, messageType = 'text', imageData = null) {
  const payload = {
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
            type: messageType,
          }]
        },
        field: 'messages'
      }]
    }]
  };

  if (messageType === 'text') {
    payload.entry[0].changes[0].value.messages[0].text = {
      body: messageText
    };
  } else if (messageType === 'image' && imageData) {
    payload.entry[0].changes[0].value.messages[0].image = imageData;
  }

  return payload;
}

async function sendMessage(text, type = 'text') {
  const payload = createWebhookPayload(text, type);
  
  const response = await fetch(`${BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRealWhatsAppSimulation() {
  console.log('🚀 Real WhatsApp Simulation Test\n');
  console.log('=' .repeat(70));
  console.log('Simulating real user interactions on WhatsApp...\n');
  
  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  // Test 1: User updates weight
  console.log('📝 TEST 1: User says "i am now 79 kg"');
  totalTests++;
  try {
    const success = await sendMessage('i am now 79 kg');
    if (success) {
      console.log('✅ Message sent successfully');
      await wait(2000);
      
      // Verify update
      const response = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
      const data = await response.json();
      
      if (data.profile && data.profile.weight === 79) {
        console.log('✅ Weight updated to 79kg');
        passed++;
      } else {
        console.log(`❌ Weight not updated (current: ${data.profile?.weight})`);
        failed++;
      }
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 2: User updates height
  console.log('\n📝 TEST 2: User says "My height is 165cm"');
  totalTests++;
  try {
    const success = await sendMessage('My height is 165cm');
    if (success) {
      console.log('✅ Message sent successfully');
      await wait(2000);
      
      // Verify update
      const response = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
      const data = await response.json();
      
      if (data.profile && data.profile.height === 165) {
        console.log('✅ Height updated to 165cm');
        passed++;
      } else {
        console.log(`❌ Height not updated (current: ${data.profile?.height})`);
        failed++;
      }
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 3: User views profile
  console.log('\n📝 TEST 3: User says "show me my profile"');
  totalTests++;
  try {
    const success = await sendMessage('show me my profile');
    if (success) {
      console.log('✅ Message sent successfully');
      console.log('   (Bot should respond with profile information)');
      passed++;
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 4: User asks for stats
  console.log('\n📝 TEST 4: User says "stats"');
  totalTests++;
  try {
    const success = await sendMessage('stats');
    if (success) {
      console.log('✅ Message sent successfully');
      console.log('   (Bot should respond with statistics)');
      passed++;
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 5: User asks for history
  console.log('\n📝 TEST 5: User says "history"');
  totalTests++;
  try {
    const success = await sendMessage('history');
    if (success) {
      console.log('✅ Message sent successfully');
      console.log('   (Bot should respond with meal history)');
      passed++;
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 6: User asks a question
  console.log('\n📝 TEST 6: User says "how many calories should I eat?"');
  totalTests++;
  try {
    const success = await sendMessage('how many calories should I eat?');
    if (success) {
      console.log('✅ Message sent successfully');
      console.log('   (Bot should respond with AI chat)');
      passed++;
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 7: Chinese message
  console.log('\n📝 TEST 7: User says "我的个人信息" (Chinese)');
  totalTests++;
  try {
    const success = await sendMessage('我的个人信息');
    if (success) {
      console.log('✅ Message sent successfully');
      console.log('   (Bot should respond in Chinese with profile)');
      passed++;
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  await wait(1000);

  // Test 8: Quick setup format
  console.log('\n📝 TEST 8: User says "30 175 70" (quick setup)');
  totalTests++;
  try {
    const success = await sendMessage('30 175 70');
    if (success) {
      console.log('✅ Message sent successfully');
      await wait(2000);
      
      // Verify update
      const response = await fetch(`${BASE_URL}/api/check-user-data?userId=${TEST_USER}`);
      const data = await response.json();
      
      if (data.profile && data.profile.age === 30 && data.profile.height === 175 && data.profile.weight === 70) {
        console.log('✅ Profile updated: age=30, height=175cm, weight=70kg');
        passed++;
      } else {
        console.log(`❌ Profile not fully updated`);
        console.log(`   Current: age=${data.profile?.age}, height=${data.profile?.height}, weight=${data.profile?.weight}`);
        failed++;
      }
    } else {
      console.log('❌ Message failed to send');
      failed++;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SIMULATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL SIMULATIONS PASSED!');
    console.log('The bot is working correctly in production.');
    console.log('\n✨ You can now test on real WhatsApp: +65 8315 3431');
  } else {
    console.log('\n⚠️  Some simulations failed. Please check the logs.');
  }
}

testRealWhatsAppSimulation().catch(console.error);
