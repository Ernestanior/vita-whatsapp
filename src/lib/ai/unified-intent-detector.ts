/**
 * Unified Intent Detector
 * Single AI call to classify ALL user intents + extract structured data.
 * Primary: Gemini 2.0 Flash | Fallback: GPT-4o-mini
 */

import { logger } from '@/utils/logger';
import { env } from '@/config/env';

// ─── Intent Enum ───────────────────────────────────────
export enum UserIntent {
  // Core commands
  START = 'START',
  HELP = 'HELP',
  PROFILE = 'PROFILE',
  STATS = 'STATS',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  // AI-detected intents
  FOOD_LOG = 'FOOD_LOG',
  MEAL_ADVICE = 'MEAL_ADVICE',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  QUICK_SETUP = 'QUICK_SETUP',
  GREETING = 'GREETING',
  // Manual macro input (P35 C40 F12)
  MACRO_LOG = 'MACRO_LOG',
  // Phase 3
  STREAK = 'STREAK',
  BUDGET = 'BUDGET',
  // Fallback
  GENERAL = 'GENERAL',
}

export interface IntentResult {
  intent: UserIntent;
  confidence: number;
  extractedData?: {
    // PROFILE_UPDATE
    height?: number;
    weight?: number;
    age?: number;
    gender?: 'male' | 'female';
    weightChange?: number;
    goal?: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain';
    // FOOD_LOG
    foodDescription?: string;
    // QUICK_SETUP
    quickSetupAge?: number;
    quickSetupHeight?: number;
    quickSetupWeight?: number;
  };
}

// ─── Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an intent classifier for a WhatsApp nutrition tracking bot (Singapore market).

Classify the user message into ONE intent and optionally extract structured data.

INTENTS:
- FOOD_LOG: User DESCRIBES food they ate/are eating. "吃了鸡饭", "I had pasta", "午饭吃了皮蛋粥", "早餐喝了咖啡吃了面包"
- MEAL_ADVICE: User ASKS what to eat / wants food suggestions. "午饭吃什么好", "what should I eat", "推荐午餐"
- PROFILE_UPDATE: User PROVIDES or IMPLIES personal info changes. "I'm 65kg now", "我身高170", "胖了两斤", "我怀孕了"(implies female), "做了变性手术"(implies gender change), "我今年30了"(age=30), "我想减肥"(goal change), "I want to gain muscle"(goal change)
- QUICK_SETUP: Exactly 2-3 numbers = age height weight. "25 170 65"
- STATS: User wants to VIEW statistics/analysis. "看数据", "show stats", "数据分析"
- HISTORY: User wants to VIEW past meal records. "最近吃了什么", "show my meals", "查看历史", "帮我看看最近吃的", "review my meals"
- PROFILE: User wants to VIEW their profile info. "我的资料", "show profile"
- HELP: User needs help/instructions. "怎么用", "help"
- START: User wants to start/restart. "开始", "start"
- SETTINGS: User wants to change settings/language.
- STREAK: Streak/check-in info. "连续", "打卡", "streak"
- BUDGET: Calorie budget. "预算", "budget"
- GREETING: Simple greeting. "你好", "hi", "hello", "嗨"
- GENERAL: Anything else — nutrition questions, general chat, unclear.

CRITICAL RULES:
1. "吃了X" / "I had X" / "ate X" = FOOD_LOG (logging food, NOT asking about it)
2. "吃什么好" / "what should I eat" = MEAL_ADVICE (asking for suggestions)
3. "看历史" / "show meals" / "看看最近吃的" = HISTORY (viewing records)
4. "X健康吗" / "is X healthy" = GENERAL (asking about food, NOT logging)
5. Numbers with body context ("65kg", "170cm", "胖了") = PROFILE_UPDATE
6. Exactly 2-3 bare numbers ("25 170 65") = QUICK_SETUP
7. 1斤 = 0.5kg, 1 pound = 0.4536kg — always convert to kg in extractedData
8. Life events implying profile changes = PROFILE_UPDATE. Examples:
   - "我怀孕了" → gender: "female"
   - "做了变性手术" / "I transitioned" → infer new gender from context
   - "我今年30了" → age: 30
9. Goal changes = PROFILE_UPDATE. Extract goal as: "lose-weight", "gain-muscle", "control-sugar", or "maintain". Examples:
   - "我想减肥" / "I want to lose weight" → goal: "lose-weight"
   - "我要增肌" / "I want to gain muscle" → goal: "gain-muscle"
   - "我不想增肌了，想减肥" → goal: "lose-weight"
   - "帮我控糖" / "control my sugar" → goal: "control-sugar"
10. If user mentions reviewing/evaluating their past eating habits → HISTORY (not GENERAL)

Respond with JSON only, no explanation:
{"intent":"INTENT_NAME","confidence":0.95,"extractedData":{}}

Examples:
User: "午饭吃了鸡饭" → {"intent":"FOOD_LOG","confidence":0.97,"extractedData":{"foodDescription":"午饭吃了鸡饭"}}
User: "I had 2 roti prata" → {"intent":"FOOD_LOG","confidence":0.96,"extractedData":{"foodDescription":"2 roti prata"}}
User: "午饭吃什么好" → {"intent":"MEAL_ADVICE","confidence":0.95,"extractedData":{}}
User: "我现在65kg" → {"intent":"PROFILE_UPDATE","confidence":0.97,"extractedData":{"weight":65}}
User: "胖了两斤" → {"intent":"PROFILE_UPDATE","confidence":0.90,"extractedData":{"weightChange":1}}
User: "25 170 65" → {"intent":"QUICK_SETUP","confidence":0.99,"extractedData":{"quickSetupAge":25,"quickSetupHeight":170,"quickSetupWeight":65}}
User: "鸡饭健康吗" → {"intent":"GENERAL","confidence":0.92,"extractedData":{}}
User: "你好" → {"intent":"GREETING","confidence":0.99,"extractedData":{}}
User: "查看历史记录" → {"intent":"HISTORY","confidence":0.98,"extractedData":{}}
User: "我的连续打卡" → {"intent":"STREAK","confidence":0.95,"extractedData":{}}
User: "我怀孕了" → {"intent":"PROFILE_UPDATE","confidence":0.88,"extractedData":{"gender":"female"}}
User: "帮我看看我最近吃的健不健康" → {"intent":"HISTORY","confidence":0.90,"extractedData":{}}
User: "我今年30了" → {"intent":"PROFILE_UPDATE","confidence":0.95,"extractedData":{"age":30}}
User: "我想减肥" → {"intent":"PROFILE_UPDATE","confidence":0.95,"extractedData":{"goal":"lose-weight"}}
User: "I want to gain muscle" → {"intent":"PROFILE_UPDATE","confidence":0.95,"extractedData":{"goal":"gain-muscle"}}
User: "不想增肌了，想减脂" → {"intent":"PROFILE_UPDATE","confidence":0.93,"extractedData":{"goal":"lose-weight"}}`;
// ─── Valid intents for parsing ─────────────────────────
const VALID_INTENTS = new Set(Object.values(UserIntent));

// ─── Detector Class ────────────────────────────────────
export class UnifiedIntentDetector {

  async detect(text: string): Promise<IntentResult> {
    try {
      return await this.detectWithGemini(text);
    } catch (geminiError) {
      logger.warn({
        type: 'unified_gemini_failed',
        error: geminiError instanceof Error ? geminiError.message : 'Unknown',
        text: text.substring(0, 50),
      });
      try {
        return await this.detectWithOpenAI(text);
      } catch (openaiError) {
        logger.error({
          type: 'unified_all_providers_failed',
          geminiError: geminiError instanceof Error ? geminiError.message : 'Unknown',
          openaiError: openaiError instanceof Error ? openaiError.message : 'Unknown',
          text: text.substring(0, 50),
        });
        return { intent: UserIntent.GENERAL, confidence: 0 };
      }
    }
  }

  // ── Gemini 2.0 Flash ──────────────────────────────────
  private async detectWithGemini(text: string): Promise<IntentResult> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 150,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `${SYSTEM_PROMPT}\n\nUser: "${text}"`;
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseTime = Date.now() - startTime;
    const raw = result.response.text().trim();

    logger.info({
      type: 'unified_gemini_response',
      text: text.substring(0, 50),
      raw: raw.substring(0, 200),
      responseTime,
    });

    return this.parseResponse(raw, text);
  }

  // ── GPT-4o-mini fallback ──────────────────────────────
  private async detectWithOpenAI(text: string): Promise<IntentResult> {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: 150,
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const responseTime = Date.now() - startTime;
    const raw = response.choices[0]?.message?.content?.trim() || '{}';

    logger.info({
      type: 'unified_openai_response',
      text: text.substring(0, 50),
      raw: raw.substring(0, 200),
      responseTime,
      tokens: response.usage?.total_tokens,
    });

    return this.parseResponse(raw, text);
  }

  // ── Parse JSON response ───────────────────────────────
  private parseResponse(raw: string, originalText: string): IntentResult {
    try {
      // Strip markdown code fences if present
      let cleaned = raw;
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      const intentStr = (parsed.intent || '').toUpperCase();

      if (!VALID_INTENTS.has(intentStr as UserIntent)) {
        logger.warn({ type: 'unified_unknown_intent', raw: intentStr, text: originalText.substring(0, 50) });
        return { intent: UserIntent.GENERAL, confidence: 0.5 };
      }

      return {
        intent: intentStr as UserIntent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        extractedData: parsed.extractedData || undefined,
      };
    } catch (e) {
      logger.warn({
        type: 'unified_parse_error',
        raw: raw.substring(0, 200),
        error: e instanceof Error ? e.message : 'Unknown',
      });
      return { intent: UserIntent.GENERAL, confidence: 0 };
    }
  }
}

// Singleton
export const unifiedIntentDetector = new UnifiedIntentDetector();
