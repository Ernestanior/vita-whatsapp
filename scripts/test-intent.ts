/**
 * Intent Detection Test Script
 * Tests unified-intent-detector with edge cases
 * Run: npx tsx scripts/test-intent.ts
 */

import 'dotenv/config';

// Inline the prompt + call logic to avoid Next.js module resolution
const SYSTEM_PROMPT = `You are an intent classifier for a WhatsApp nutrition tracking bot (Singapore market).

Classify the user message into ONE intent and optionally extract structured data.

INTENTS:
- FOOD_LOG: User DESCRIBES food they ate/are eating. "吃了鸡饭", "I had pasta", "午饭吃了皮蛋粥", "早餐喝了咖啡吃了面包"
- MEAL_ADVICE: User ASKS what to eat / wants food suggestions. "午饭吃什么好", "what should I eat", "推荐午餐"
- PROFILE_UPDATE: User PROVIDES or IMPLIES personal info changes. "I'm 65kg now", "我身高170", "胖了两斤", "我怀孕了"(implies female), "做了变性手术"(implies gender change), "我今年30了"(age=30)
- QUICK_SETUP: Exactly 2-3 numbers = age height weight. "25 170 65"
- STATS: User wants to VIEW statistics/analysis. "看数据", "show stats", "数据分析"
- HISTORY: User wants to VIEW past meal records. "最近吃了什么", "show my meals", "查看历史", "帮我看看最近吃的", "review my meals"
- PROFILE: User wants to VIEW their profile info. "我的资料", "show profile"
- HELP: User needs help/instructions. "怎么用", "help"
- START: User wants to start/restart. "开始", "start"
- SETTINGS: User wants to change settings/language.
- STREAK: Streak/check-in info. "连续", "打卡", "streak"
- BUDGET: Calorie budget. "预算", "budget"
- CARD: Nutrition card. "卡片", "card"
- REMINDERS: Manage reminders. "提醒", "reminders"
- COMPARE: Compare meals. "对比", "compare"
- PROGRESS: Progress report. "进度", "progress"
- PREFERENCES: Dietary preferences. "偏好", "preferences"
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
9. If user mentions reviewing/evaluating their past eating habits → HISTORY (not GENERAL)

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
User: "我今年30了" → {"intent":"PROFILE_UPDATE","confidence":0.95,"extractedData":{"age":30}}`;
// ─── Test cases ───────────────────────────────────────
interface TestCase {
  input: string;
  expectedIntent: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  // === 模糊 / 隐含意图 ===
  { input: '我刚做了变性手术', expectedIntent: 'PROFILE_UPDATE', description: '隐含性别变更' },
  { input: '我怀孕了', expectedIntent: 'PROFILE_UPDATE', description: '隐含性别=female' },
  { input: '最近瘦了不少', expectedIntent: 'PROFILE_UPDATE', description: '模糊体重变化，无具体数字' },
  { input: '我今年30了', expectedIntent: 'PROFILE_UPDATE', description: '隐含年龄更新' },

  // === 食物记录 vs 建议 ===
  { input: '中午随便吃了点沙拉', expectedIntent: 'FOOD_LOG', description: '模糊食物描述' },
  { input: '晚上想吃火锅', expectedIntent: 'MEAL_ADVICE', description: '"想吃"=建议而非记录' },
  { input: '刚喝了杯奶茶', expectedIntent: 'FOOD_LOG', description: '饮品记录' },
  { input: '奶茶热量高吗', expectedIntent: 'GENERAL', description: '问营养问题，不是记录' },
  { input: '今天吃了麦当劳巨无霸套餐加可乐', expectedIntent: 'FOOD_LOG', description: '复杂食物描述' },

  // === 数字歧义 ===
  { input: '170 65', expectedIntent: 'QUICK_SETUP', description: '两个数字=身高体重' },
  { input: '我吃了3个苹果', expectedIntent: 'FOOD_LOG', description: '数字+食物=食物记录' },
  { input: '胖了5斤', expectedIntent: 'PROFILE_UPDATE', description: '体重变化+斤' },
  { input: '长高了2cm', expectedIntent: 'PROFILE_UPDATE', description: '身高变化' },

  // === 混合意图 ===
  { input: '我175cm 70kg 想减肥', expectedIntent: 'PROFILE_UPDATE', description: '个人信息+目标' },
  { input: '帮我看看我最近吃的健不健康', expectedIntent: 'HISTORY', description: '查看+评价历史' },

  // === 边界 case ===
  { input: '😊', expectedIntent: 'GREETING', description: '纯 emoji' },
  { input: '...', expectedIntent: 'GENERAL', description: '无意义输入' },
  { input: 'laksa', expectedIntent: 'FOOD_LOG', description: '单个食物名（新加坡）' },
  { input: 'nasi lemak with extra sambal', expectedIntent: 'FOOD_LOG', description: '新加坡食物英文' },
  { input: '不想活了', expectedIntent: 'GENERAL', description: '负面情绪，不应误判' },
  { input: '取消', expectedIntent: 'GENERAL', description: '取消操作' },
];

// ─── Call OpenAI (GPT-4o-mini) ───────────────────────
async function callAI(text: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '{}';

  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(cleaned);
}

// ─── Run tests ────────────────────────────────────────
async function main() {
  console.log('🧪 Intent Detection Test\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const tc of TEST_CASES) {
    try {
      const result = await callAI(tc.input);
      const intent = (result.intent || '').toUpperCase();
      const ok = intent === tc.expectedIntent;

      if (ok) {
        passed++;
        console.log(`✅ "${tc.input}" → ${intent} (${tc.description})`);
      } else {
        failed++;
        const msg = `❌ "${tc.input}" → ${intent} (expected ${tc.expectedIntent}) [${tc.description}]`;
        console.log(msg);
        failures.push(msg);
      }

      if (result.extractedData && Object.keys(result.extractedData).length > 0) {
        console.log(`   📦 extractedData: ${JSON.stringify(result.extractedData)}`);
      }
    } catch (err) {
      failed++;
      const msg = `💥 "${tc.input}" → ERROR: ${err instanceof Error ? err.message : err}`;
      console.log(msg);
      failures.push(msg);
    }

    // Rate limit: ~100ms between calls
    await new Promise(r => setTimeout(r, 150));
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Results: ${passed}/${passed + failed} passed (${failed} failed)\n`);

  if (failures.length > 0) {
    console.log('Failed cases:');
    failures.forEach(f => console.log(`  ${f}`));
  }
}

main().catch(console.error);
