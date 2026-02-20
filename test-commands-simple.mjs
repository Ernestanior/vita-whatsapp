/**
 * Simple Phase 3 Command Test
 * Just sends commands to webhook and checks response
 */

const TEST_USER_PHONE = '+6512345678';

async function sendCommand(commandText, description) {
  console.log(`\n📤 Sending: "${commandText}" (${description})`);
  
  try {
    const response = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: commandText },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ Success');
    } else {
      const text = await response.text();
      console.log('   ❌ Failed:', text.substring(0, 100));
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Wait 2 seconds between requests
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function runTests() {
  console.log('🧪 Testing Phase 3 Commands\n');
  console.log('=' .repeat(50));

  await sendCommand('streak', 'English streak command');
  await sendCommand('连续', 'Chinese streak command');
  await sendCommand('budget', 'Budget view command');
  await sendCommand('budget set 1800', 'Budget set command');
  await sendCommand('preferences', 'Preferences command');
  await sendCommand('偏好', 'Chinese preferences command');

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ All commands sent!');
  console.log('📱 Check your WhatsApp for responses\n');
}

runTests();
