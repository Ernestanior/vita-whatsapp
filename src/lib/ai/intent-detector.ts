/**
 * AI Intent Detector
 * Supports multiple AI providers with fallback
 * Primary: Gemini 2.0 Flash (cheaper, faster)
 * Fallback: GPT-4o-mini (more stable)
 */

import { logger } from '@/utils/logger';
import { env } from '@/config/env';

export enum Intent {
  STATS = 'STATS',
  HISTORY = 'HISTORY',
  PROFILE = 'PROFILE',
  HELP = 'HELP',
  START = 'START',
  SETTINGS = 'SETTINGS',
  UNKNOWN = 'UNKNOWN',
}

const SYSTEM_PROMPT = `You are an intent classifier for a nutrition tracking WhatsApp bot.

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

export class IntentDetector {
  /**
   * Detect intent using AI (with fallback)
   */
  async detect(text: string): Promise<Intent> {
    try {
      // Try Gemini first (cheaper, faster)
      return await this.detectWithGemini(text);
    } catch (geminiError) {
      logger.warn({
        type: 'gemini_intent_detection_failed',
        error: geminiError instanceof Error ? geminiError.message : 'Unknown error',
        text: text.substring(0, 50),
      });

      try {
        // Fallback to GPT-4o-mini
        return await this.detectWithOpenAI(text);
      } catch (openaiError) {
        logger.error({
          type: 'all_intent_detection_failed',
          geminiError: geminiError instanceof Error ? geminiError.message : 'Unknown',
          openaiError: openaiError instanceof Error ? openaiError.message : 'Unknown',
          text: text.substring(0, 50),
        });

        // Return UNKNOWN if both fail
        return Intent.UNKNOWN;
      }
    }
  }

  /**
   * Detect intent using Gemini 2.0 Flash
   * Cost: $0.075/1M input tokens, $0.30/1M output tokens
   * Free tier: 1500 requests/day
   */
  private async detectWithGemini(text: string): Promise<Intent> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 10,
      },
    });

    const prompt = `${SYSTEM_PROMPT}\n\nUser: ${text}\nIntent:`;
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseTime = Date.now() - startTime;
    
    const response = result.response;
    const intent = response.text().trim().toUpperCase();

    logger.info({
      type: 'gemini_intent_detected',
      text: text.substring(0, 50),
      intent,
      responseTime,
      provider: 'gemini',
    });

    return this.mapToIntent(intent);
  }

  /**
   * Detect intent using OpenAI GPT-4o-mini (fallback)
   * Cost: $0.15/1M input tokens, $0.60/1M output tokens
   */
  private async detectWithOpenAI(text: string): Promise<Intent> {
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 10,
      temperature: 0,
    });
    const responseTime = Date.now() - startTime;

    const intent = response.choices[0]?.message?.content?.trim().toUpperCase() || 'UNKNOWN';
    const tokensUsed = response.usage?.total_tokens || 0;

    logger.info({
      type: 'openai_intent_detected',
      text: text.substring(0, 50),
      intent,
      tokensUsed,
      responseTime,
      provider: 'openai',
    });

    return this.mapToIntent(intent);
  }

  /**
   * Map AI response to Intent enum
   */
  private mapToIntent(response: string): Intent {
    const intentMap: Record<string, Intent> = {
      'STATS': Intent.STATS,
      'HISTORY': Intent.HISTORY,
      'PROFILE': Intent.PROFILE,
      'HELP': Intent.HELP,
      'START': Intent.START,
      'SETTINGS': Intent.SETTINGS,
      'UNKNOWN': Intent.UNKNOWN,
    };

    return intentMap[response] || Intent.UNKNOWN;
  }
}

// Singleton instance
export const intentDetector = new IntentDetector();
