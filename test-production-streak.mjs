/**
 * Test Production Streak Command
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431'; // Your real number

async function testStreakCommand() {
  console.log('🧪 Testing Production Streak Command\n');
  console.log('URL:', PRODUCTION_URL);
  console.log('User:', TEST_USER);
  console.log('='.repeat(60), '\n');

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-prod-' + Date.now(),
                from: TEST_USER,
                type: 'text',
                text: { body: 'streak' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER,
              }],
            },
          }],
        }],
      }),
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('\nResponse:', text.substring(0, 200));

    if (response.status === 200) {
      console.log('\n✅ Request successful');
      console.log('📱 Check WhatsApp for the response');
    } else {
      console.log('\n❌ Request failed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStreakCommand();
