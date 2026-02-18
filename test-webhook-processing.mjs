/**
 * Test Webhook Processing
 * Call the test endpoint to see detailed logs
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';

async function testWebhookProcessing() {
  console.log('🔍 Testing Webhook Processing with Detailed Logs\n');
  console.log('=' .repeat(70));
  
  const tests = [
    { text: '你好', description: 'Simple greeting' },
    { text: 'show me my profile', description: 'View profile' },
  ];
  
  for (const test of tests) {
    console.log(`\n📝 Testing: "${test.text}" (${test.description})`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/test-webhook-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: test.text,
          userId: '6583153431',
        }),
      });
      
      const data = await response.json();
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Success: ${data.success}`);
      
      if (data.logs) {
        console.log('\n   📋 Logs:');
        data.logs.forEach(log => console.log(`      ${log}`));
      }
      
      if (data.error) {
        console.log(`\n   ❌ Error: ${data.error}`);
        if (data.stack) {
          console.log(`   Stack: ${data.stack.substring(0, 200)}...`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log('\n   ⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Check your WhatsApp to see if you received responses');
}

testWebhookProcessing().catch(console.error);
