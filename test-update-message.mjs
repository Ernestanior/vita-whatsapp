/**
 * Test AI Intent Detection for Profile Update Message
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';

const testMessage = "I'm now 79kg and My height is 165cm";

async function testIntent() {
  console.log('🧪 Testing AI Intent Detection');
  console.log('='.repeat(60));
  console.log(`Message: "${testMessage}"`);
  console.log('');

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: testMessage,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Intent detected:');
      console.log(`   Intent: ${result.intent}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      console.log('');
      
      if (result.intent === 'UNKNOWN') {
        console.log('✅ CORRECT: Should be UNKNOWN so it can be parsed as profile update');
      } else {
        console.log(`❌ WRONG: Should be UNKNOWN, not ${result.intent}`);
        console.log('   This prevents natural language profile updates from working!');
      }
    } else {
      console.log('❌ Request failed');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.log('❌ Test failed');
    console.log('Error:', error.message);
  }

  console.log('');
  console.log('='.repeat(60));
}

testIntent().catch(console.error);
