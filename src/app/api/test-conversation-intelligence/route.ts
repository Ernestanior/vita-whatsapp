/**
 * Comprehensive Conversation Intelligence Test
 * Tests AI's ability to understand and route all types of messages
 */

import { NextResponse } from 'next/server';
import { conversationRouter } from '@/lib/ai/conversation-router';
import type { MessageContext } from '@/types/whatsapp';

interface TestCase {
  text: string;
  expectedAction: string;
  description: string;
  category: string;
  expectedData?: any;
}

const TEST_CASES: TestCase[] = [
  // ========== PROFILE VIEWING ==========
  {
    category: 'Profile Viewing',
    text: '我的个人信息',
    expectedAction: 'VIEW_PROFILE',
    description: 'Chinese: My personal info',
  },
  {
    category: 'Profile Viewing',
    text: '我的画像',
    expectedAction: 'VIEW_PROFILE',
    description: 'Chinese: My profile',
  },
  {
    category: 'Profile Viewing',
    text: 'show me my profile',
    expectedAction: 'VIEW_PROFILE',
    description: 'English: show me my profile',
  },
  {
    category: 'Profile Viewing',
    text: 'what is my profile',
    expectedAction: 'VIEW_PROFILE',
    description: 'English: what is my profile',
  },
  {
    category: 'Profile Viewing',
    text: 'profile',
    expectedAction: 'VIEW_PROFILE',
    description: 'Command: profile',
  },

  // ========== PROFILE UPDATING ==========
  {
    category: 'Profile Updating',
    text: "I'm now 79kg",
    expectedAction: 'UPDATE_PROFILE',
    description: 'English: Providing weight only',
    expectedData: { weight: 79 },
  },
  {
    category: 'Profile Updating',
    text: "My height is 165cm",
    expectedAction: 'UPDATE_PROFILE',
    description: 'English: Providing height only',
    expectedData: { height: 165 },
  },
  {
    category: 'Profile Updating',
    text: "I'm now 79kg and My height is 165cm",
    expectedAction: 'UPDATE_PROFILE',
    description: 'English: Providing both weight and height',
    expectedData: { weight: 79, height: 165 },
  },
  {
    category: 'Profile Updating',
    text: "我现在 79kg",
    expectedAction: 'UPDATE_PROFILE',
    description: 'Chinese: Providing weight',
    expectedData: { weight: 79 },
  },
  {
    category: 'Profile Updating',
    text: "我身高 165cm",
    expectedAction: 'UPDATE_PROFILE',
    description: 'Chinese: Providing height',
    expectedData: { height: 165 },
  },
  {
    category: 'Profile Updating',
    text: "25 170 65",
    expectedAction: 'UPDATE_PROFILE',
    description: 'Quick setup format: age height weight',
    expectedData: { age: 25, height: 170, weight: 65 },
  },
  {
    category: 'Profile Updating',
    text: "I'm 25 years old, 170cm tall, 65kg",
    expectedAction: 'UPDATE_PROFILE',
    description: 'Full profile info in natural language',
    expectedData: { age: 25, height: 170, weight: 65 },
  },
  {
    category: 'Profile Updating',
    text: "我25岁，身高170cm，体重65kg",
    expectedAction: 'UPDATE_PROFILE',
    description: 'Chinese: Full profile info',
    expectedData: { age: 25, height: 170, weight: 65 },
  },

  // ========== STATISTICS VIEWING ==========
  {
    category: 'Statistics',
    text: '我想看一下数据分析',
    expectedAction: 'VIEW_STATS',
    description: 'Chinese: I want to see data analysis',
  },
  {
    category: 'Statistics',
    text: '我的统计数据',
    expectedAction: 'VIEW_STATS',
    description: 'Chinese: My statistics',
  },
  {
    category: 'Statistics',
    text: 'show me my stats',
    expectedAction: 'VIEW_STATS',
    description: 'English: show me my stats',
  },
  {
    category: 'Statistics',
    text: 'stats',
    expectedAction: 'VIEW_STATS',
    description: 'Command: stats',
  },

  // ========== HISTORY VIEWING ==========
  {
    category: 'History',
    text: '我最近吃了什么',
    expectedAction: 'VIEW_HISTORY',
    description: 'Chinese: What did I eat recently',
  },
  {
    category: 'History',
    text: '历史记录',
    expectedAction: 'VIEW_HISTORY',
    description: 'Chinese: History records',
  },
  {
    category: 'History',
    text: 'what did I eat yesterday',
    expectedAction: 'VIEW_HISTORY',
    description: 'English: what did I eat yesterday',
  },
  {
    category: 'History',
    text: 'history',
    expectedAction: 'VIEW_HISTORY',
    description: 'Command: history',
  },

  // ========== HELP ==========
  {
    category: 'Help',
    text: '怎么用这个',
    expectedAction: 'HELP',
    description: 'Chinese: How to use this',
  },
  {
    category: 'Help',
    text: 'help',
    expectedAction: 'HELP',
    description: 'Command: help',
  },
  {
    category: 'Help',
    text: 'how do I use this',
    expectedAction: 'HELP',
    description: 'English: how do I use this',
  },

  // ========== START ==========
  {
    category: 'Start',
    text: 'start',
    expectedAction: 'START',
    description: 'Command: start',
  },
  {
    category: 'Start',
    text: '开始',
    expectedAction: 'START',
    description: 'Chinese: Start',
  },

  // ========== GENERAL CHAT ==========
  {
    category: 'Chat',
    text: '你好',
    expectedAction: 'CHAT',
    description: 'Chinese: Hello',
  },
  {
    category: 'Chat',
    text: 'hello',
    expectedAction: 'CHAT',
    description: 'English: Hello',
  },
  {
    category: 'Chat',
    text: 'how are you',
    expectedAction: 'CHAT',
    description: 'English: How are you',
  },
  {
    category: 'Chat',
    text: 'how many calories should I eat?',
    expectedAction: 'CHAT',
    description: 'English: Nutrition question',
  },
  {
    category: 'Chat',
    text: '什么是健康饮食？',
    expectedAction: 'CHAT',
    description: 'Chinese: What is healthy eating?',
  },
];

export async function GET() {
  const results: any[] = [];
  let totalTests = 0;
  let passed = 0;
  let failed = 0;

  const context: MessageContext = {
    userId: '6583153431',
    userName: 'Test User',
    language: 'en',
    timestamp: new Date(),
  };

  console.log('🧪 Starting Comprehensive Conversation Intelligence Test...\n');

  for (const testCase of TEST_CASES) {
    totalTests++;
    
    try {
      const decision = await conversationRouter.analyze(testCase.text, context);

      const isCorrect = decision.action === testCase.expectedAction;
      
      // Check extracted data if expected
      let dataCorrect = true;
      if (testCase.expectedData) {
        for (const [key, value] of Object.entries(testCase.expectedData)) {
          if (decision.extractedData?.[key as keyof typeof decision.extractedData] !== value) {
            dataCorrect = false;
            break;
          }
        }
      }

      const testPassed = isCorrect && dataCorrect;

      if (testPassed) {
        passed++;
      } else {
        failed++;
      }

      results.push({
        category: testCase.category,
        description: testCase.description,
        text: testCase.text,
        expected: testCase.expectedAction,
        actual: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        extractedData: decision.extractedData,
        expectedData: testCase.expectedData,
        passed: testPassed,
        correct: isCorrect,
        dataCorrect,
      });

    } catch (error) {
      failed++;
      results.push({
        category: testCase.category,
        description: testCase.description,
        text: testCase.text,
        expected: testCase.expectedAction,
        error: error instanceof Error ? error.message : 'Unknown error',
        passed: false,
      });
    }
  }

  // Group results by category
  const byCategory: Record<string, any[]> = {};
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
    accuracy: ((passed / totalTests) * 100).toFixed(1) + '%',
    categoryStats,
  };

  return NextResponse.json({
    success: true,
    summary,
    byCategory,
    allResults: results,
    note: 'Comprehensive conversation intelligence test completed',
  });
}
