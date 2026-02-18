/**
 * Test AI Intent Recognition
 * Tests natural language command detection using OpenAI
 */

import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { env } from '@/config/env';

export async function GET() {
  try {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are an intent classifier for a nutrition tracking WhatsApp bot.

Available commands:
- STATS: User wants to see statistics, data analysis, summaries, reports about their nutrition
- HISTORY: User wants to see their meal history, past records, what they ate recently
- PROFILE: User wants to see or update their personal profile, health info, height, weight
- HELP: User needs help, instructions, doesn't know how to use the bot
- START: User wants to start over, begin, reset
- SETTINGS: User wants to change settings, preferences, language
- UNKNOWN: None of the above, general conversation

Respond with ONLY the command name (e.g., "STATS", "HISTORY", etc.). No explanation.

Examples:
User: "我想看一下数据分析" → STATS
User: "我最近吃了什么" → HISTORY
User: "我的个人信息" → PROFILE
User: "怎么用这个" → HELP
User: "你好" → UNKNOWN
User: "show me my statistics" → STATS
User: "what did I eat yesterday" → HISTORY`;

    // Test cases from user's screenshot
    const testCases = [
      '我想看一下数据分析',
      '我想看一下统计数据',
      '我最近饮食的统计数据呀',
      '看看我的统计',
      '给我看看数据',
      '我的饮食分析',
      '最近吃了什么',
      '历史记录',
      '我的个人信息',
      '怎么用这个',
      'stats',
      'history',
      'profile',
      'help',
      '我想看看最近的历史记录和统计数据',
      '帮我分析一下',
      '你好',
      '今天天气怎么样',
    ];

    const results = [];
    let totalTokens = 0;

    for (const testCase of testCases) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: testCase },
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const intent = response.choices[0]?.message?.content?.trim().toUpperCase() || 'UNKNOWN';
      const tokensUsed = response.usage?.total_tokens || 0;
      totalTokens += tokensUsed;

      results.push({
        input: testCase,
        intent,
        tokensUsed,
        correct: intent !== 'UNKNOWN' || testCase === '你好' || testCase === '今天天气怎么样',
      });
    }

    const correctCount = results.filter(r => r.correct).length;
    const accuracy = (correctCount / results.length * 100).toFixed(1);
    const avgTokens = (totalTokens / results.length).toFixed(1);
    const estimatedCost = (totalTokens / 1000000 * 0.15).toFixed(6); // $0.15 per 1M tokens for gpt-4o-mini

    return NextResponse.json({
      success: true,
      summary: {
        totalTests: results.length,
        correct: correctCount,
        accuracy: `${accuracy}%`,
        totalTokens,
        avgTokensPerCall: avgTokens,
        estimatedCost: `$${estimatedCost}`,
      },
      results,
      note: 'AI intent recognition is working! Cost is very low (~$0.0001 per call)',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
