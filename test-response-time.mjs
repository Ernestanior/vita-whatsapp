/**
 * Test Response Time and Message Flow
 * Check if user receives immediate acknowledgment
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';

async function testResponseTime() {
  console.log('⏱️  Testing Response Time and Message Flow\n');
  console.log('=' .repeat(60));
  
  const tests = [
    { text: '我胖了两斤', description: 'Relative change (Chinese)' },
    { text: 'I gained 2kg', description: 'Relative change (English)' },
    { text: 'show me my profile', description: 'View profile' },
    { text: '我的个人信息', description: 'View profile (Chinese)' },
  ];

  for (const test of tests) {
    console.log(`\n📝 Testing: "${test.text}" (${test.description})`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          entry: [{
            id: 'test',
            changes: [{
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+65 8315 3431',
                  phone_number_id: '975292692337720'
                },
                contacts: [{
                  profile: { name: 'Test' },
                  wa_id: '6583153431'
                }],
                messages: [{
                  from: '6583153431',
                  id: `test-${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: test.text }
                }]
              },
              field: 'messages'
            }]
          }]
        }),
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response time: ${responseTime}ms`);
      
      if (responseTime < 3000) {
        console.log('   ✅ Fast response (< 3s)');
      } else if (responseTime < 5000) {
        console.log('   ⚠️  Slow response (3-5s)');
      } else {
        console.log('   ❌ Very slow response (> 5s)');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Analysis:');
  console.log('- WhatsApp expects response within 3 seconds');
  console.log('- If response > 3s, user sees "waiting" indicator');
  console.log('- If response > 10s, WhatsApp may timeout');
  console.log('\n💡 Solution:');
  console.log('- Send immediate acknowledgment (< 1s)');
  console.log('- Process in background');
  console.log('- Send final result when ready');
}

testResponseTime().catch(console.error);
