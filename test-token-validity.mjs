/**
 * Test WhatsApp Token Validity
 * Check if the access token is still valid
 */

import 'dotenv/config';

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function testTokenValidity() {
  console.log('🔑 Testing WhatsApp Access Token Validity\n');
  console.log('=' .repeat(70));
  
  // Test 1: Get phone number info
  console.log('\n📱 Test 1: Getting phone number info...');
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token is VALID!');
      console.log(`   Phone Number: ${data.display_phone_number}`);
      console.log(`   Verified Name: ${data.verified_name}`);
      console.log(`   Quality Rating: ${data.quality_rating}`);
    } else {
      const error = await response.json();
      console.log('❌ Token is INVALID or EXPIRED!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(error, null, 2)}`);
      
      if (error.error?.code === 190) {
        console.log('\n🚨 ERROR CODE 190: Access token has expired or is invalid');
        console.log('   You need to generate a new access token from Meta Business Suite');
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Test 2: Try to send a message
  console.log('\n📤 Test 2: Trying to send a test message...');
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: '6583153431',
          type: 'text',
          text: {
            body: '🔑 Token validity test - if you receive this, token is working!'
          },
        }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Message sent successfully!');
      console.log(`   Message ID: ${data.messages[0].id}`);
      console.log('   → Token is working correctly');
    } else {
      const error = await response.json();
      console.log('❌ Failed to send message!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(error, null, 2)}`);
      
      if (error.error?.code === 190) {
        console.log('\n🚨 ERROR CODE 190: Access token has expired!');
        console.log('\n📝 How to fix:');
        console.log('1. Go to https://developers.facebook.com/apps');
        console.log('2. Select your app');
        console.log('3. Go to WhatsApp > API Setup');
        console.log('4. Generate a new "Temporary access token"');
        console.log('5. Update WHATSAPP_TOKEN in .env and Vercel');
      } else if (error.error?.code === 100) {
        console.log('\n⚠️  ERROR CODE 100: Invalid parameter');
        console.log('   Check if phone number ID is correct');
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
}

testTokenValidity().catch(console.error);
