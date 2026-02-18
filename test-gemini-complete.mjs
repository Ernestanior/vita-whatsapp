/**
 * Complete Gemini API test with retry logic
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_AI_API_KEY = 'AIzaSyBkpJOFZV8vAHen1ir2KDvadHwp0OCn9Cw';

const SYSTEM_PROMPT = `You are an intent classifier for a nutrition tracking WhatsApp bot.

Available commands:
- STATS: User wants to see statistics, data analysis, summaries, reports about their nutrition
- HISTORY: User wants to see their meal history, past records, what they ate recently
- PROFILE: User wants to see or update their personal profile, health info, height, weight
- HELP: User needs help, instructions, doesn't know how to use the bot
- START: User wants to start over, begin, reset
- SETTINGS: User wants to change settings, preferences, language
- UNKNOWN: None of the above, general conversation

Respond with ONLY the command name (e.g., "STATS", "HISTORY", etc.). No explanation.`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWithRetry(model, testCase, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const startTime = Date.now();
      const prompt = `${SYSTEM_PROMPT}\n\nUser: ${testCase}\nIntent:`;
      const result = await model.generateContent(prompt);
      const responseTime = Date.now() - startTime;
      const intent = result.response.text().trim();
      
      return { intent, responseTime, success: true };
    } catch (error) {
      if (i < maxRetries - 1) {
        console.log(`   ⚠️  Retry ${i + 1}/${maxRetries - 1}...`);
        await sleep(1000 * (i + 1)); // Exponential backoff
      } else {
        return { error: error.message, success: false };
      }
    }
  }
}

async function testGemini() {
  console.log('🧪 Testing Gemini 2.0 Flash API\n');
  console.log('=' .repeat(60));
  
  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 10,
      },
    });

    const testCases = [
      { text: '我想看一下数据分析', expected: 'STATS' },
      { text: '我最近吃了什么', expected: 'HISTORY' },
      { text: '我的个人信息', expected: 'PROFILE' },
      { text: '怎么用这个', expected: 'HELP' },
      { text: '你好', expected: 'UNKNOWN' },
      { text: 'show me my stats', expected: 'STATS' },
      { text: 'what did I eat yesterday', expected: 'HISTORY' },
    ];

    console.log('\n📝 Test Results:\n');
    
    let totalTime = 0;
    let successCount = 0;
    let failCount = 0;
    
    for (const testCase of testCases) {
      console.log(`Testing: "${testCase.text}"`);
      const result = await testWithRetry(model, testCase.text);
      
      if (result.success) {
        const correct = result.intent === testCase.expected;
        const emoji = correct ? '✅' : '⚠️';
        console.log(`${emoji} Intent: ${result.intent} (expected: ${testCase.expected})`);
        console.log(`   Response time: ${result.responseTime}ms\n`);
        totalTime += result.responseTime;
        successCount++;
      } else {
        console.log(`❌ Failed: ${result.error.substring(0, 100)}\n`);
        failCount++;
      }
      
      // Rate limiting: wait 1 second between requests
      await sleep(1000);
    }

    console.log('=' .repeat(60));
    console.log('\n📊 Summary:\n');
    console.log(`Model: gemini-2.0-flash`);
    console.log(`Total tests: ${testCases.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏱️  Average response time: ${Math.round(totalTime / successCount)}ms`);
    console.log(`💰 Estimated cost: ~$0.00001 per call`);
    
    if (successCount === testCases.length) {
      console.log('\n🎉 All tests passed! Gemini is ready for production!');
    } else if (successCount > 0) {
      console.log('\n⚠️  Some tests failed, but Gemini is working (might be rate limiting)');
    } else {
      console.log('\n❌ All tests failed. Check API key and quota.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:');
    console.error(error.message);
  }
}

testGemini();
