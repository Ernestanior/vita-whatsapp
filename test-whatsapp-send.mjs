/**
 * Test WhatsApp Send Message
 * Directly test if we can send messages to WhatsApp
 */

import 'dotenv/config';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TEST_USER = '6583153431';

async function testSendMessage() {
  console.log('📱 Testing WhatsApp Send Message\n');
  console.log('=' .repeat(60));
  
  if (!WHATSAPP_TOKEN) {
    console.log('❌ WHATSAPP_TOKEN not found in .env');
    return;
  }
  
  if (!PHONE_NUMBER_ID) {
    console.log('❌ WHATSAPP_PHONE_NUMBER_ID not found in .env');
    return;
  }
  
  console.log(`✅ Token: ${WHATSAPP_TOKEN.substring(0, 20)}...`);
  console.log(`✅ Phone Number ID: ${PHONE_NUMBER_ID}`);
  console.log(`✅ Recipient: ${TEST_USER}\n`);
  
  // Test 1: Send simple text message
  console.log('📝 Test 1: Sending simple text message...');
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: TEST_USER,
          type: 'text',
          text: {
            body: '🧪 Test message from automated test script'
          },
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Message sent successfully!');
      console.log(`   Message ID: ${data.messages[0].id}`);
    } else {
      console.log('❌ Failed to send message');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  // Test 2: Send Chinese message
  console.log('\n📝 Test 2: Sending Chinese message...');
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: TEST_USER,
          type: 'text',
          text: {
            body: '✅ 测试消息：您的体重已更新！\n\n新体重：76kg\n之前体重：75kg\n\n继续加油！💪'
          },
        }),
      }
    );
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Chinese message sent successfully!');
      console.log(`   Message ID: ${data.messages[0].id}`);
    } else {
      console.log('❌ Failed to send Chinese message');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${JSON.stringify(data, null, 2)}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Check your WhatsApp to see if you received the messages!');
}

testSendMessage().catch(console.error);
