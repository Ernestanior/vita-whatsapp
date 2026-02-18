/**
 * Test AI Intent Recognition
 * Tests natural language command detection using AI (Gemini + GPT fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { intentDetector } from '@/lib/ai/intent-detector';

/**
 * POST - Test a single text input
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid "text" parameter',
      }, { status: 400 });
    }

    const startTime = Date.now();
    const intent = await intentDetector.detect(text);
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      text,
      intent,
      responseTime,
      provider: 'gemini-or-openai',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * GET - Run comprehensive test suite
 */
export async function GET() {
  try {
    // Test cases from user's screenshot
    const testCases = [
      { text: '我想看一下数据分析', expected: 'STATS' },
      { text: '我想看一下统计数据', expected: 'STATS' },
      { text: '我最近饮食的统计数据呀', expected: 'STATS' },
      { text: '看看我的统计', expected: 'STATS' },
      { text: '给我看看数据', expected: 'STATS' },
      { text: '我的饮食分析', expected: 'STATS' },
      { text: '最近吃了什么', expected: 'HISTORY' },
      { text: '历史记录', expected: 'HISTORY' },
      { text: '我的个人信息', expected: 'PROFILE' },
      { text: '怎么用这个', expected: 'HELP' },
      { text: 'stats', expected: 'STATS' },
      { text: 'history', expected: 'HISTORY' },
      { text: 'profile', expected: 'PROFILE' },
      { text: 'help', expected: 'HELP' },
      { text: '我想看看最近的历史记录和统计数据', expected: 'HISTORY' },
      { text: '帮我分析一下', expected: 'STATS' },
      { text: '你好', expected: 'UNKNOWN' },
      { text: '今天天气怎么样', expected: 'UNKNOWN' },
    ];

    const results = [];
    let totalTime = 0;

    for (const testCase of testCases) {
      const startTime = Date.now();
      const intent = await intentDetector.detect(testCase.text);
      const responseTime = Date.now() - startTime;
      totalTime += responseTime;

      results.push({
        input: testCase.text,
        expected: testCase.expected,
        detected: intent,
        correct: intent === testCase.expected,
        responseTime,
      });
    }

    const correctCount = results.filter(r => r.correct).length;
    const accuracy = (correctCount / results.length * 100).toFixed(1);
    const avgTime = (totalTime / results.length).toFixed(0);

    return NextResponse.json({
      success: true,
      summary: {
        totalTests: results.length,
        correct: correctCount,
        failed: results.length - correctCount,
        accuracy: `${accuracy}%`,
        avgResponseTime: `${avgTime}ms`,
        totalTime: `${totalTime}ms`,
      },
      results,
      note: 'Using Gemini 2.0 Flash (primary) with GPT-4o-mini fallback',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
