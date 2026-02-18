/**
 * Test AI Relative Change Recognition
 * Test if AI can understand "我胖了两斤"
 */

const BASE_URL = 'https://vita-whatsapp.vercel.app';

async function testAIRecognition() {
  console.log('🤖 Testing AI Relative Change Recognition\n');
  console.log('=' .repeat(70));
  
  const tests = [
    { text: '我胖了两斤', expected: 'NEED_CURRENT_DATA', weightChange: 1 },
    { text: '我瘦了3公斤', expected: 'NEED_CURRENT_DATA', weightChange: -3 },
    { text: 'I gained 2kg', expected: 'NEED_CURRENT_DATA', weightChange: 2 },
    { text: 'I lost 5 pounds', expected: 'NEED_CURRENT_DATA', weightChange: -2.27 },
    { text: '我现在70kg', expected: 'UPDATE_PROFILE', weight: 70 },
  ];

  for (const test of tests) {
    console.log(`\n📝 Testing: "${test.text}"`);
    console.log(`   Expected action: ${test.expected}`);
    
    try {
      // Call the conversation intelligence test endpoint
      const response = await fetch(
        `${BASE_URL}/api/test-conversation-intelligence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: test.text,
            userId: '6583153431',
            language: 'zh-CN',
          }),
        }
      );
      
      if (!response.ok) {
        console.log(`   ❌ API error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const decision = data.decision;
      
      console.log(`   Actual action: ${decision.action}`);
      console.log(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      if (decision.extractedData) {
        console.log(`   Extracted data: ${JSON.stringify(decision.extractedData)}`);
      }
      
      if (decision.action === test.expected) {
        console.log(`   ✅ Correct action!`);
        
        if (test.weightChange !== undefined && decision.extractedData?.weightChange) {
          if (Math.abs(decision.extractedData.weightChange - test.weightChange) < 0.1) {
            console.log(`   ✅ Correct weight change!`);
          } else {
            console.log(`   ❌ Wrong weight change: expected ${test.weightChange}, got ${decision.extractedData.weightChange}`);
          }
        }
      } else {
        console.log(`   ❌ Wrong action! Expected ${test.expected}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
}

testAIRecognition().catch(console.error);
