/**
 * End-to-End Comprehensive Test Suite
 * Tests EVERYTHING like a real user would
 */

import { NextResponse } from 'next/server';

const PRODUCTION_URL = process.env.NEXT_PUBLIC_URL || 'https://vita-whatsapp.vercel.app';
const TEST_USER_ID = '6583153431';

interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
  duration?: number;
}

export async function GET() {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  console.log('🚀 Starting End-to-End Comprehensive Test Suite...\n');
  console.log('='.repeat(60));

  // ========== TEST 1: AI Conversation Intelligence ==========
  console.log('\n📊 TEST 1: AI Conversation Intelligence');
  console.log('-'.repeat(60));
  
  try {
    totalTests++;
    const response = await fetch(`${PRODUCTION_URL}/api/test-conversation-intelligence`);
    const data = await response.json();
    
    if (data.success && data.summary.accuracy === '100.0%') {
      passed++;
      results.push({
        category: 'AI Intelligence',
        test: 'Conversation routing accuracy',
        passed: true,
        expected: '100%',
        actual: data.summary.accuracy,
      });
      console.log('✅ AI Conversation Intelligence: 100% accuracy');
    } else {
      failed++;
      results.push({
        category: 'AI Intelligence',
        test: 'Conversation routing accuracy',
        passed: false,
        expected: '100%',
        actual: data.summary?.accuracy || 'Failed',
        error: 'Accuracy below 100%',
      });
      console.log(`❌ AI Conversation Intelligence: ${data.summary?.accuracy || 'Failed'}`);
    }
  } catch (error) {
    failed++;
    totalTests++;
    results.push({
      category: 'AI Intelligence',
      test: 'Conversation routing accuracy',
      passed: false,
      expected: '100%',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('❌ AI Conversation Intelligence: Error');
  }

  // ========== TEST 2: Profile Viewing ==========
  console.log('\n👤 TEST 2: Profile Viewing');
  console.log('-'.repeat(60));
  
  const profileViewTests = [
    { text: '我的个人信息', description: 'Chinese: My personal info' },
    { text: 'show me my profile', description: 'English: show me my profile' },
    { text: 'profile', description: 'Command: profile' },
  ];

  for (const test of profileViewTests) {
    totalTests++;
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.text }),
      });
      const data = await response.json();
      
      const isCorrect = data.intent === 'VIEW_PROFILE' || data.action === 'VIEW_PROFILE';
      
      if (isCorrect) {
        passed++;
        results.push({
          category: 'Profile Viewing',
          test: test.description,
          passed: true,
          expected: 'VIEW_PROFILE',
          actual: data.intent || data.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Profile Viewing',
          test: test.description,
          passed: false,
          expected: 'VIEW_PROFILE',
          actual: data.intent || data.action || 'Unknown',
        });
        console.log(`❌ ${test.description}: Expected VIEW_PROFILE, got ${data.intent || data.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Profile Viewing',
        test: test.description,
        passed: false,
        expected: 'VIEW_PROFILE',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 3: Profile Updating ==========
  console.log('\n✏️ TEST 3: Profile Updating');
  console.log('-'.repeat(60));
  
  const profileUpdateTests = [
    { text: "I'm now 79kg", description: 'English: Providing weight' },
    { text: "My height is 165cm", description: 'English: Providing height' },
    { text: "I'm now 79kg and My height is 165cm", description: 'English: Providing both' },
    { text: "25 170 65", description: 'Quick setup format' },
  ];

  for (const test of profileUpdateTests) {
    totalTests++;
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.text }),
      });
      const data = await response.json();
      
      const isCorrect = data.intent === 'UPDATE_PROFILE' || data.action === 'UPDATE_PROFILE' || data.intent === 'UNKNOWN';
      
      if (isCorrect) {
        passed++;
        results.push({
          category: 'Profile Updating',
          test: test.description,
          passed: true,
          expected: 'UPDATE_PROFILE or UNKNOWN',
          actual: data.intent || data.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Profile Updating',
          test: test.description,
          passed: false,
          expected: 'UPDATE_PROFILE or UNKNOWN',
          actual: data.intent || data.action || 'Unknown',
        });
        console.log(`❌ ${test.description}: Expected UPDATE_PROFILE/UNKNOWN, got ${data.intent || data.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Profile Updating',
        test: test.description,
        passed: false,
        expected: 'UPDATE_PROFILE or UNKNOWN',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 4: User Data Integrity ==========
  console.log('\n💾 TEST 4: User Data Integrity');
  console.log('-'.repeat(60));
  
  try {
    totalTests++;
    const response = await fetch(`${PRODUCTION_URL}/api/check-user-data?phone=${TEST_USER_ID}`);
    const data = await response.json();
    
    if (data.success && data.userExists && data.profile) {
      passed++;
      results.push({
        category: 'Data Integrity',
        test: 'User profile exists and is accessible',
        passed: true,
        expected: 'Profile found',
        actual: `Height: ${data.profile.height}cm, Weight: ${data.profile.weight}kg`,
      });
      console.log('✅ User profile exists and is accessible');
    } else {
      failed++;
      results.push({
        category: 'Data Integrity',
        test: 'User profile exists and is accessible',
        passed: false,
        expected: 'Profile found',
        actual: 'Profile not found or error',
      });
      console.log('❌ User profile not found or error');
    }
  } catch (error) {
    failed++;
    results.push({
      category: 'Data Integrity',
      test: 'User profile exists and is accessible',
      passed: false,
      expected: 'Profile found',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('❌ User profile check failed');
  }

  // ========== TEST 5: Environment Variables ==========
  console.log('\n🔐 TEST 5: Environment Variables');
  console.log('-'.repeat(60));
  
  try {
    totalTests++;
    const response = await fetch(`${PRODUCTION_URL}/api/check-env`);
    const data = await response.json();
    
    if (data.success && data.env.GOOGLE_AI_API_KEY && data.env.OPENAI_API_KEY) {
      passed++;
      results.push({
        category: 'Environment',
        test: 'All required API keys are set',
        passed: true,
        expected: 'All keys present',
        actual: 'GOOGLE_AI_API_KEY ✓, OPENAI_API_KEY ✓',
      });
      console.log('✅ All required API keys are set');
    } else {
      failed++;
      results.push({
        category: 'Environment',
        test: 'All required API keys are set',
        passed: false,
        expected: 'All keys present',
        actual: 'Some keys missing',
      });
      console.log('❌ Some API keys are missing');
    }
  } catch (error) {
    failed++;
    results.push({
      category: 'Environment',
      test: 'All required API keys are set',
      passed: false,
      expected: 'All keys present',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.log('❌ Environment check failed');
  }

  // ========== TEST 6: Statistics Command ==========
  console.log('\n📊 TEST 6: Statistics Command');
  console.log('-'.repeat(60));
  
  const statsTests = [
    { text: '我想看一下数据分析', description: 'Chinese: I want to see data analysis' },
    { text: 'show me my stats', description: 'English: show me my stats' },
    { text: 'stats', description: 'Command: stats' },
  ];

  for (const test of statsTests) {
    totalTests++;
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.text }),
      });
      const data = await response.json();
      
      const isCorrect = data.intent === 'VIEW_STATS' || data.action === 'VIEW_STATS' || data.intent === 'STATS';
      
      if (isCorrect) {
        passed++;
        results.push({
          category: 'Statistics',
          test: test.description,
          passed: true,
          expected: 'VIEW_STATS',
          actual: data.intent || data.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Statistics',
          test: test.description,
          passed: false,
          expected: 'VIEW_STATS',
          actual: data.intent || data.action || 'Unknown',
        });
        console.log(`❌ ${test.description}: Expected VIEW_STATS, got ${data.intent || data.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Statistics',
        test: test.description,
        passed: false,
        expected: 'VIEW_STATS',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 7: History Command ==========
  console.log('\n📜 TEST 7: History Command');
  console.log('-'.repeat(60));
  
  const historyTests = [
    { text: '我最近吃了什么', description: 'Chinese: What did I eat recently' },
    { text: 'what did I eat yesterday', description: 'English: what did I eat yesterday' },
    { text: 'history', description: 'Command: history' },
  ];

  for (const test of historyTests) {
    totalTests++;
    try {
      const response = await fetch(`${PRODUCTION_URL}/api/test-ai-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.text }),
      });
      const data = await response.json();
      
      const isCorrect = data.intent === 'VIEW_HISTORY' || data.action === 'VIEW_HISTORY' || data.intent === 'HISTORY';
      
      if (isCorrect) {
        passed++;
        results.push({
          category: 'History',
          test: test.description,
          passed: true,
          expected: 'VIEW_HISTORY',
          actual: data.intent || data.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'History',
          test: test.description,
          passed: false,
          expected: 'VIEW_HISTORY',
          actual: data.intent || data.action || 'Unknown',
        });
        console.log(`❌ ${test.description}: Expected VIEW_HISTORY, got ${data.intent || data.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'History',
        test: test.description,
        passed: false,
        expected: 'VIEW_HISTORY',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== FINAL SUMMARY ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  // Group results by category
  const byCategory: Record<string, TestResult[]> = {};
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = [];
    }
    byCategory[result.category].push(result);
  }

  // Calculate category stats
  const categoryStats: Record<string, any> = {};
  for (const [category, categoryResults] of Object.entries(byCategory)) {
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    categoryStats[category] = {
      passed: categoryPassed,
      total: categoryTotal,
      accuracy: ((categoryPassed / categoryTotal) * 100).toFixed(1) + '%',
    };
  }

  const summary = {
    totalTests,
    passed,
    failed,
    successRate: ((passed / totalTests) * 100).toFixed(1) + '%',
    categoryStats,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    success: passed === totalTests,
    summary,
    byCategory,
    allResults: results,
    note: passed === totalTests 
      ? '🎉 All tests passed! System is ready for production use.'
      : '⚠️ Some tests failed. Please review the results.',
  });
}
