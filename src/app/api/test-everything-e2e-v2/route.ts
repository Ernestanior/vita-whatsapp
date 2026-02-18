/**
 * End-to-End Comprehensive Test Suite V2
 * Tests EVERYTHING by directly calling functions (no HTTP fetch)
 */

import { NextResponse } from 'next/server';
import { conversationRouter } from '@/lib/ai/conversation-router';
import type { MessageContext } from '@/types/whatsapp';

const TEST_USER_ID = '6583153431';

interface TestResult {
  category: string;
  test: string;
  passed: boolean;
  expected: string;
  actual?: string;
  error?: string;
}

export async function GET() {
  const results: TestResult[] = [];
  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  const context: MessageContext = {
    userId: TEST_USER_ID,
    userName: 'Test User',
    language: 'en',
    timestamp: new Date(),
  };

  console.log('🚀 Starting End-to-End Comprehensive Test Suite V2...\n');

  // ========== TEST 1: Profile Viewing ==========
  console.log('👤 TEST 1: Profile Viewing');
  
  const profileViewTests = [
    { text: '我的个人信息', expected: 'VIEW_PROFILE', description: 'Chinese: My personal info' },
    { text: 'show me my profile', expected: 'VIEW_PROFILE', description: 'English: show me my profile' },
    { text: 'profile', expected: 'VIEW_PROFILE', description: 'Command: profile' },
  ];

  for (const test of profileViewTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'Profile Viewing',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Profile Viewing',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Profile Viewing',
        test: test.description,
        passed: false,
        expected: test.expected,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error - ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  // ========== TEST 2: Profile Updating ==========
  console.log('\n✏️ TEST 2: Profile Updating');
  
  const profileUpdateTests = [
    { text: "I'm now 79kg", expected: 'UPDATE_PROFILE', description: 'English: Providing weight' },
    { text: "My height is 165cm", expected: 'UPDATE_PROFILE', description: 'English: Providing height' },
    { text: "I'm now 79kg and My height is 165cm", expected: 'UPDATE_PROFILE', description: 'English: Providing both' },
    { text: "25 170 65", expected: 'UPDATE_PROFILE', description: 'Quick setup format' },
    { text: "我现在 79kg", expected: 'UPDATE_PROFILE', description: 'Chinese: Providing weight' },
  ];

  for (const test of profileUpdateTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'Profile Updating',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Profile Updating',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Profile Updating',
        test: test.description,
        passed: false,
        expected: test.expected,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 3: Statistics ==========
  console.log('\n📊 TEST 3: Statistics');
  
  const statsTests = [
    { text: '我想看一下数据分析', expected: 'VIEW_STATS', description: 'Chinese: I want to see data analysis' },
    { text: 'show me my stats', expected: 'VIEW_STATS', description: 'English: show me my stats' },
    { text: 'stats', expected: 'VIEW_STATS', description: 'Command: stats' },
  ];

  for (const test of statsTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'Statistics',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Statistics',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Statistics',
        test: test.description,
        passed: false,
        expected: test.expected,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 4: History ==========
  console.log('\n📜 TEST 4: History');
  
  const historyTests = [
    { text: '我最近吃了什么', expected: 'VIEW_HISTORY', description: 'Chinese: What did I eat recently' },
    { text: 'what did I eat yesterday', expected: 'VIEW_HISTORY', description: 'English: what did I eat yesterday' },
    { text: 'history', expected: 'VIEW_HISTORY', description: 'Command: history' },
  ];

  for (const test of historyTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'History',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'History',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'History',
        test: test.description,
        passed: false,
        expected: test.expected,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 5: Help & Start ==========
  console.log('\n❓ TEST 5: Help & Start');
  
  const helpTests = [
    { text: 'help', expected: 'HELP', description: 'Command: help' },
    { text: '怎么用这个', expected: 'HELP', description: 'Chinese: How to use this' },
    { text: 'start', expected: 'START', description: 'Command: start' },
  ];

  for (const test of helpTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'Help & Start',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Help & Start',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Help & Start',
        test: test.description,
        passed: false,
        expected: test.expected,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.log(`❌ ${test.description}: Error`);
    }
  }

  // ========== TEST 6: Chat ==========
  console.log('\n💬 TEST 6: Chat');
  
  const chatTests = [
    { text: '你好', expected: 'CHAT', description: 'Chinese: Hello' },
    { text: 'hello', expected: 'CHAT', description: 'English: Hello' },
    { text: 'how many calories should I eat?', expected: 'CHAT', description: 'English: Nutrition question' },
  ];

  for (const test of chatTests) {
    totalTests++;
    try {
      const decision = await conversationRouter.analyze(test.text, context);
      
      if (decision.action === test.expected) {
        passed++;
        results.push({
          category: 'Chat',
          test: test.description,
          passed: true,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`✅ ${test.description}`);
      } else {
        failed++;
        results.push({
          category: 'Chat',
          test: test.description,
          passed: false,
          expected: test.expected,
          actual: decision.action,
        });
        console.log(`❌ ${test.description}: Expected ${test.expected}, got ${decision.action}`);
      }
    } catch (error) {
      failed++;
      results.push({
        category: 'Chat',
        test: test.description,
        passed: false,
        expected: test.expected,
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
