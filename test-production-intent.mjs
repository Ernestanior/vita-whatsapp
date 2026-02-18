/**
 * Test AI Intent Recognition on Production
 * Tests the exact commands the user reported as not working
 */

const PRODUCTION_URL = 'https://vita-whatsapp.vercel.app';

const testCases = [
  // Chinese commands that were NOT working
  { text: '我想看一下数据分析', expected: 'STATS', description: 'Chinese: I want to see data analysis' },
  { text: '我最近吃了什么', expected: 'HISTORY', description: 'Chinese: What did I eat recently' },
  { text: '我的统计数据', expected: 'STATS', description: 'Chinese: My statistics' },
  { text: '我的个人信息', expected: 'PROFILE', description: 'Chinese: My personal info' },
  { text: '帮我看看历史记录', expected: 'HISTORY', description: 'Chinese: Help me check history' },
  
  // English natural language
  { text: 'show me my stats', expected: 'STATS', description: 'English: show me my stats' },
  { text: 'what did I eat yesterday', expected: 'HISTORY', description: 'English: what did I eat yesterday' },
  { text: 'I want to see my profile', expected: 'PROFILE', description: 'English: I want to see my profile' },
  
  // Exact commands (should still work)
  { text: 'stats', expected: 'STATS', description: 'Exact command: stats' },
  { text: 'history', expected: 'HISTORY', description: 'Exact command: history' },
  { text: 'profile', expected: 'PROFILE', description: 'Exact command: profile' },
  
  // General conversation (should be UNKNOWN)
  { text: '你好', expected: 'UNKNOWN', description: 'Chinese: Hello' },
  { text: 'hello', expected: 'UNKNOWN', description: 'English: Hello' },
];

async function testIntentRecognition() {
  console.log('🧪 Testing AI Intent Recognition on Production\n');
  console.log(`📍 URL: ${PRODUCTION_URL}/api/test-ai-intent\n`);
  
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
        console.log(`   Intent: ${detected} (${result.provider})`);
        console.log(`   Time: ${result.responseTime}ms`);
        console.log('');
        passed++;
      } else {
        console.log(`❌ ${testCase.description}`);
        console.log(`   Text: "${testCase.text}"`);
        console.log(`   Expected: ${testCase.expected}`);
        console.log(`   Got: ${detected} (${result.provider})`);
        console.log(`   Time: ${result.responseTime}ms`);
        console.log('');
        failed++;
        failures.push({
          ...testCase,
          detected,
          provider: result.provider,
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

  console.log('\n' + '='.repeat(60));
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
        console.log(`   Got: ${failure.detected} (${failure.provider})`);
      }
      if (failure.error) {
        console.log(`   Error: ${failure.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(60));
  
  if (passed === testCases.length) {
    console.log('🎉 All tests passed! AI intent recognition is working perfectly!');
  } else {
    console.log('⚠️  Some tests failed. Check the failures above.');
  }
}

// Run tests
testIntentRecognition().catch(console.error);
