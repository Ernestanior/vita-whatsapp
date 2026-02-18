/**
 * Diagnose No Response Issue
 * Check if webhook is receiving messages and where it's failing
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';
const TEST_USER = '6583153431';

async function diagnose() {
  console.log('🔍 Diagnosing No Response Issue\n');
  console.log('=' .repeat(70));
  
  // Step 1: Check if webhook is accessible
  console.log('\n📡 Step 1: Checking webhook endpoint...');
  try {
    const response = await fetch(`${BASE_URL}/api/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 403) {
      console.log('   ✅ Webhook is accessible (verification failed as expected)');
    }
  } catch (error) {
    console.log(`   ❌ Webhook not accessible: ${error.message}`);
  }
  
  // Step 2: Send a test message and check response
  console.log('\n📝 Step 2: Sending test message "你好"...');
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
              body: '你好'
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
  const responseData = await response.json();

  console.log(`   Status: ${response.status}`);
  console.log(`   Response time: ${responseTime}ms`);
  console.log(`   Response: ${JSON.stringify(responseData)}`);
  
  // Step 3: Check diagnose endpoint
  console.log('\n🔍 Step 3: Checking diagnose endpoint...');
  try {
    const diagResponse = await fetch(`${BASE_URL}/api/diagnose-whatsapp?userId=${TEST_USER}`);
    const diagData = await diagResponse.json();
    
    console.log(`   User exists: ${diagData.user ? 'Yes' : 'No'}`);
    console.log(`   Profile exists: ${diagData.profile ? 'Yes' : 'No'}`);
    console.log(`   WhatsApp config: ${diagData.whatsappConfig ? 'OK' : 'Missing'}`);
    
    if (diagData.issues && diagData.issues.length > 0) {
      console.log(`   ⚠️  Issues found:`);
      diagData.issues.forEach(issue => console.log(`      - ${issue}`));
    }
  } catch (error) {
    console.log(`   ❌ Diagnose failed: ${error.message}`);
  }
  
  // Step 4: Try to send message directly via WhatsApp API
  console.log('\n📱 Step 4: Testing direct WhatsApp API call...');
  
  // Read .env file
  const fs = await import('fs');
  const envContent = fs.readFileSync('.env', 'utf8');
  const tokenMatch = envContent.match(/WHATSAPP_TOKEN=(.+)/);
  const phoneIdMatch = envContent.match(/WHATSAPP_PHONE_NUMBER_ID=(.+)/);
  
  if (!tokenMatch || !phoneIdMatch) {
    console.log('   ❌ Cannot read WhatsApp credentials from .env');
  } else {
    const token = tokenMatch[1].trim();
    const phoneId = phoneIdMatch[1].trim();
    
    try {
      const apiResponse = await fetch(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: TEST_USER,
            type: 'text',
            text: {
              body: '🔍 诊断测试：如果你收到这条消息，说明 WhatsApp API 是正常的。问题出在消息处理流程中。'
            },
          }),
        }
      );
      
      if (response.ok) {
        const data = await apiResponse.json();
        console.log(`   ✅ Direct API call successful!`);
        console.log(`   Message ID: ${data.messages?.[0]?.id}`);
        console.log(`   → This means WhatsApp API is working`);
        console.log(`   → Problem is in the message processing pipeline`);
      } else {
        const error = await apiResponse.text();
        console.log(`   ❌ Direct API call failed: ${error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Diagnosis Summary:');
  console.log('1. If webhook returns 200 → Webhook is receiving messages');
  console.log('2. If direct API works → WhatsApp API credentials are correct');
  console.log('3. If both work but no reply → Problem is in message handler');
  console.log('\n🔧 Next steps:');
  console.log('- Check Vercel logs for errors');
  console.log('- Check if TextHandlerV2 is being called');
  console.log('- Check if sendTextMessage is being called');
}

diagnose().catch(console.error);
