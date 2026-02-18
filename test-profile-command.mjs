/**
 * Test Profile Command
 * Simulates clicking the "My Profile" button
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER_ID = '6583153431';

async function testProfileCommand() {
  console.log('🧪 Testing Profile Command');
  console.log('='.repeat(60));
  console.log(`User: ${TEST_USER_ID}`);
  console.log('');

  try {
    // First, check if user has a profile
    console.log('1️⃣ Checking if user has a profile...');
    const checkResponse = await fetch(`${PRODUCTION_URL}/api/check-user-data?phone=${TEST_USER_ID}`);
    const checkData = await checkResponse.json();

    if (checkData.profile) {
      console.log('✅ User has a profile:');
      console.log(`   Height: ${checkData.profile.height}cm`);
      console.log(`   Weight: ${checkData.profile.weight}kg`);
      console.log(`   Age: ${checkData.profile.age}`);
      console.log(`   Gender: ${checkData.profile.gender}`);
      console.log('');
    } else {
      console.log('❌ User does NOT have a profile');
      console.log('');
      return;
    }

    // Now test the profile command
    console.log('2️⃣ Testing /profile command...');
    
    // Simulate the profile command message
    const testMessage = {
      id: 'test_profile_' + Date.now(),
      from: TEST_USER_ID,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: 'text',
      text: {
        body: '/profile'
      }
    };

    const testContext = {
      userId: TEST_USER_ID,
      userName: 'Test User',
      language: 'en',
      timestamp: new Date(),
    };

    // Call the test endpoint
    const response = await fetch(`${PRODUCTION_URL}/api/test-commands-local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        context: testContext,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✅ Profile command executed successfully');
      console.log('');
      console.log('📱 Expected behavior:');
      console.log('   - Should display existing profile information');
      console.log('   - Should NOT ask for height/weight/age');
      console.log('   - Should show BMI and daily calories');
      console.log('');
      console.log('📱 Check your WhatsApp to verify the response!');
    } else {
      console.log('❌ Profile command failed');
      console.log('Error:', result.error || 'Unknown error');
    }

  } catch (error) {
    console.log('❌ Test failed');
    console.log('Error:', error.message);
  }

  console.log('');
  console.log('='.repeat(60));
}

// Run test
testProfileCommand().catch(console.error);
