/**
 * AI-Powered Conversation Router
 * Uses AI to understand context and route messages intelligently
 * 
 * Instead of simple intent classification, this uses AI to:
 * 1. Understand the full conversation context
 * 2. Decide what action to take
 * 3. Execute the appropriate handler
 */

import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import type { MessageContext } from '@/types/whatsapp';

export interface ConversationDecision {
  action: 'VIEW_PROFILE' | 'UPDATE_PROFILE' | 'VIEW_STATS' | 'VIEW_HISTORY' | 
          'HELP' | 'START' | 'SETTINGS' | 'CHAT' | 'UNKNOWN';
  confidence: number;
  reasoning: string;
  extractedData?: {
    height?: number;
    weight?: number;
    age?: number;
    gender?: 'male' | 'female';
    goal?: string;
    activityLevel?: string;
  };
}

const SYSTEM_PROMPT = `You are an intelligent conversation router for a nutrition tracking WhatsApp bot.

Your job is to understand what the user wants and decide what action to take.

Available actions:
- VIEW_PROFILE: User wants to SEE their profile information
- UPDATE_PROFILE: User is PROVIDING profile information (height, weight, age, etc.)
- VIEW_STATS: User wants to see nutrition statistics/analysis
- VIEW_HISTORY: User wants to see meal history
- HELP: User needs help
- START: User wants to start/restart
- SETTINGS: User wants to change settings
- CHAT: General conversation, questions about nutrition, etc.
- UNKNOWN: Unclear intent

CRITICAL THINKING PROCESS:
1. Is the user ASKING for information or PROVIDING information?
   - "show me my profile" → VIEW_PROFILE (asking)
   - "I'm 79kg" → UPDATE_PROFILE (providing)
   
2. What data is the user providing?
   - Extract: height, weight, age, gender, goal, activity level
   
3. What is the user's real intent?
   - Consider context, tone, and specific words used

Response format (JSON):
{
  "action": "ACTION_NAME",
  "confidence": 0.95,
  "reasoning": "User is providing weight and height information, not asking to view profile",
  "extractedData": {
    "height": 165,
    "weight": 79
  }
}

Examples:

User: "我的个人信息"
{
  "action": "VIEW_PROFILE",
  "confidence": 0.98,
  "reasoning": "User is asking to view their profile information"
}

User: "I'm now 79kg and My height is 165cm"
{
  "action": "UPDATE_PROFILE",
  "confidence": 0.99,
  "reasoning": "User is providing weight (79kg) and height (165cm) to update their profile",
  "extractedData": {
    "height": 165,
    "weight": 79
  }
}

User: "我想看一下数据分析"
{
  "action": "VIEW_STATS",
  "confidence": 0.97,
  "reasoning": "User wants to see data analysis/statistics"
}

User: "25 170 65"
{
  "action": "UPDATE_PROFILE",
  "confidence": 0.95,
  "reasoning": "User is providing profile data in quick setup format: age 25, height 170cm, weight 65kg",
  "extractedData": {
    "age": 25,
    "height": 170,
    "weight": 65
  }
}

User: "你好"
{
  "action": "CHAT",
  "confidence": 0.90,
  "reasoning": "User is greeting, this is general conversation"
}

User: "how many calories should I eat?"
{
  "action": "CHAT",
  "confidence": 0.92,
  "reasoning": "User is asking a nutrition question, should be handled by AI chat"
}`;

export class ConversationRouter {
  /**
   * Analyze message and decide what action to take
   */
  async analyze(
    text: string,
    context: MessageContext
  ): Promise<ConversationDecision> {
    try {
      // Try Gemini first (cheaper, faster)
      return await this.analyzeWithGemini(text, context);
    } catch (geminiError) {
      logger.warn({
        type: 'gemini_conversation_analysis_failed',
        error: geminiError instanceof Error ? geminiError.message : 'Unknown error',
        text: text.substring(0, 50),
      });

      try {
        // Fallback to GPT-4o-mini
        return await this.analyzeWithOpenAI(text, context);
      } catch (openaiError) {
        logger.error({
          type: 'all_conversation_analysis_failed',
          geminiError: geminiError instanceof Error ? geminiError.message : 'Unknown',
          openaiError: openaiError instanceof Error ? openaiError.message : 'Unknown',
          text: text.substring(0, 50),
        });

        // Return UNKNOWN if both fail
        return {
          action: 'UNKNOWN',
          confidence: 0,
          reasoning: 'AI analysis failed',
        };
      }
    }
  }

  /**
   * Analyze with Gemini 2.0 Flash
   */
  private async analyzeWithGemini(
    text: string,
    context: MessageContext
  ): Promise<ConversationDecision> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent decisions
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `${SYSTEM_PROMPT}

User context:
- Language: ${context.language}
- User ID: ${context.userId}

User message: "${text}"

Analyze and respond with JSON:`;
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseTime = Date.now() - startTime;
    
    const response = result.response;
    const jsonText = response.text().trim();

    logger.info({
      type: 'gemini_conversation_analyzed',
      text: text.substring(0, 50),
      responseTime,
      provider: 'gemini',
    });

    try {
      const decision = JSON.parse(jsonText) as ConversationDecision;
      return decision;
    } catch (parseError) {
      logger.error({
        type: 'gemini_json_parse_error',
        jsonText,
        error: parseError instanceof Error ? parseError.message : 'Unknown',
      });
      throw new Error('Failed to parse Gemini response');
    }
  }

  /**
   * Analyze with OpenAI GPT-4o-mini (fallback)
   */
  private async analyzeWithOpenAI(
    text: string,
    context: MessageContext
  ): Promise<ConversationDecision> {
    const { OpenAI } = await import('openai');
    
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `User context:
- Language: ${context.language}
- User ID: ${context.userId}

User message: "${text}"

Analyze and respond with JSON:` 
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    const responseTime = Date.now() - startTime;

    const jsonText = response.choices[0]?.message?.content?.trim() || '{}';

    logger.info({
      type: 'openai_conversation_analyzed',
      text: text.substring(0, 50),
      tokensUsed: response.usage?.total_tokens || 0,
      responseTime,
      provider: 'openai',
    });

    try {
      const decision = JSON.parse(jsonText) as ConversationDecision;
      return decision;
    } catch (parseError) {
      logger.error({
        type: 'openai_json_parse_error',
        jsonText,
        error: parseError instanceof Error ? parseError.message : 'Unknown',
      });
      throw new Error('Failed to parse OpenAI response');
    }
  }
}

// Singleton instance
export const conversationRouter = new ConversationRouter();
