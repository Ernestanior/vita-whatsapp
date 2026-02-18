/**
 * Test Profile Intelligence
 * Tests AI's ability to distinguish between viewing and updating profile
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';

const testCases = [
  // Viewing profile (should be PROFILE)
  { text: '我的个人信息', expected: 'PROFILE', description: 'Chinese: My personal info (VIEW)' },
  { text: '我的画像', expected: 'PROFILE', description: 'Chinese: My profile (VIEW)' },
  { text: 'show me my profile', expected: 'PROFILE', description: 'English: show me my profile (VIEW)' },
  { text: 'what is my profile', expected: 'PROFILE', description: 'English: what is my profile (VIEW)' },
  { text: 'profile', expected: 'PROFILE', description: 'Command: profile (VIEW)' },
  
  // Updating profile (should be UNKNOWN)
  { text: "I'm now 79kg", expected: 'UNKNOWN', description: 'English: Providing weight (UPDATE)' },
  { text: "My height is 165cm", expected: 'UNKNOWN', description: 'English: Providing height (UPDATE)' },
  { text: "I'm now 79kg and My height is 165cm", expected: 'UNKNOWN', description: 'English: Providing both (UPDATE)' },
  { text: "我现在 79kg", expected: 'UNKNOWN', description: 'Chinese: Providing weight (UPDATE)' },
  { text: "我身高 165cm", expected: 'UNKNOWN', description: 'Chinese: Providing height (UPDATE)' },
  { text: "25 170 65", expected: 'UNKNOWN', description: 'Quick setup format (UPDATE)' },
  { text: "I'm 25 years old, 170cm tall, 65kg", expected: 'UNKNOWN', description: 'Full profile info (UPDATE)' },
  
  // General conversation (should be UNKNOWN)
  { text: '你好', expected: 'UNKNOWN', description: 'Chinese: Hello' },
  { text: 'hello', expected: 'UNKNOWN', description: 'English: Hello' },
  { text: 'how are you', expected: 'UNKNOWN', description: 'English: How are you' },
];

async function testProfileIntelligence() {
  console.log('🧪 Testing Profile Intelligence (View vs Update)');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testCase.text,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.log(`❌ ${testCase.description}`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        console.log('');
        failed++;
        failures.push({
          ...testCase,
          error: result.error || 'Unknown error',
        });
        continue;
      }

      const detected = result.intent;
      const isCorrect = detected === testCase.expected;

      if (isCorrect) {
        console.log(`✅ ${testCase.description}`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   Intent: ${detected} ✓`);
        console.log('');
        passed++;
      } else {
        console.log(`❌ ${testCase.description}`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   Expected: ${testCase.expected}`);
        console.log(`   Got: ${detected}`);
        console.log('');
        failed++;
        failures.push({
          ...testCase,
          detected,
        });
      }

    } catch (error) {
      console.log(`❌ ${testCase.description}`);
      console.log(`   Text: "${testCase.text}"`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      failed++;
      failures.push({
        ...testCase,
        error: error.message,
      });
    }
  }

  console.log('='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);
  console.log(`📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach((failure, index) => {
      console.log(`\n${index + 1}. ${failure.description}`);
      console.log(`   Text: "${failure.text}"`);
      console.log(`   Expected: ${failure.expected}`);
      if (failure.detected) {
        console.log(`   Got: ${failure.detected}`);
      }
      if (failure.error) {
        console.log(`   Error: ${failure.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  
  if (passed === testCases.length) {
    console.log('🎉 All tests passed! AI is now intelligent enough to distinguish view vs update!');
  } else {
    console.log('⚠️  Some tests failed. AI needs more training.');
  }
}

// Run tests
testProfileIntelligence().catch(console.error);
