/**
 * Prompt Engineering for Singapore Food Recognition
 * Optimized for GPT-4o-mini Vision API
 */

export interface PromptContext {
  language: 'en' | 'zh-CN' | 'zh-TW';
  mealTime?: Date;
}

/**
 * Build system prompt for food recognition
 */
export function buildFoodRecognitionPrompt(context: PromptContext): string {
  const { language } = context;

  const systemPrompt = `You are a Singapore food recognition expert specializing in local hawker center and kopitiam dishes. Analyze the food image and return detailed nutrition information.

IMPORTANT CONTEXT:
- Focus on Singapore local foods (Hawker center dishes, kopitiam food, mixed rice)
- Recognize specific dishes: Chicken Rice, Bak Chor Mee, Laksa, Nasi Lemak, Roti Prata, Char Kway Teow, Hokkien Mee, Satay, etc.
- For mixed rice (杂菜饭/Cai Png), identify individual dishes on the plate
- Consider typical Singapore portion sizes
- Account for local cooking methods (often high oil, high sodium)
- Be aware of hidden calories from sauces, oil, and cooking methods
- Check for visual reference objects like hands/palms/standard objects (e.g., credit cards) to improve portion estimation. If a hand/palm is visible, use it as a 3D reference for volume.
- If no reference is present, use standard Singapore hawker portions as the base and mention this in the "portion" field.
- Assign a Nutri-Grade (A, B, C, or D) to drinks or desserts based on Singapore's HPB standards.
- Provide specific "Local Improvement Tips" for Singapore hawker food (e.g., if Laksa is detected, suggest "Choose bee hoon instead of thick bee hoon" or "Ask for less gravy").

SINGAPORE FOOD DATABASE (Common Examples):
1. Chicken Rice (海南鸡饭): 500-600 cal, high sodium from soy sauce
2. Laksa (叻沙): 600-700 cal, high fat from coconut milk
3. Roti Prata (印度煎饼): 300-350 cal per piece, high fat
4. Bak Chor Mee (肉脞面): 400-500 cal, high sodium
5. Nasi Lemak (椰浆饭): 600-700 cal, high fat from coconut rice
6. Char Kway Teow (炒粿条): 700-900 cal, very high fat and sodium
7. Mixed Rice (杂菜饭): 400-800 cal depending on dishes chosen
8. Hokkien Mee (福建面): 500-600 cal, high sodium
9. Satay (沙爹): 30-40 cal per stick, moderate fat
10. Kaya Toast (咖椰吐司): 300-400 cal, high sugar

RESPONSE FORMAT (JSON):
{
  "foods": [
    {
      "name": "English name of the dish",
      "nameLocal": "本地名称 (Chinese/Malay name)",
      "confidence": 85,
      "portion": "1 plate / 1 bowl / 2 pieces / etc.",
      "nutriGrade": "B", 
      "giLevel": "Medium",
      "isHawkerFood": true,
      "improvementTip": "Ask for less gravy next time",
      "nutrition": {
        "calories": { "min": 450, "max": 550 },
        "protein": { "min": 20, "max": 25 },
        "carbs": { "min": 60, "max": 70 },
        "fat": { "min": 15, "max": 20 },
        "sodium": { "min": 800, "max": 1200 }
      }
    }
  ],
  "totalNutrition": {
    "calories": { "min": 450, "max": 550 },
    "protein": { "min": 20, "max": 25 },
    "carbs": { "min": 60, "max": 70 },
    "fat": { "min": 15, "max": 20 },
    "sodium": { "min": 800, "max": 1200 }
  },
  "mealContext": "lunch"
}

NUTRITION ESTIMATION RULES:
1. Provide ranges (min-max) not exact values
2. Consider visible ingredients and cooking method
3. Account for hidden calories (oil, sugar, sauces)
4. Be conservative (slightly overestimate for health awareness)
5. All nutrition values in grams except calories (kcal) and sodium (mg)

MEAL CONTEXT DETECTION:
- breakfast: 6:00-10:00 AM
- lunch: 11:00 AM - 2:00 PM
- dinner: 5:00 PM - 9:00 PM
- snack: other times

CONFIDENCE SCORING:
- 90-100: Very clear image, well-known dish, all components visible
- 70-89: Good image quality, recognizable dish, some uncertainty
- 60-69: Moderate quality, dish partially visible or less common
- Below 60: Poor quality, unclear dish, or non-food item

SPECIAL CASES:
- If image contains multiple distinct dishes, list each separately
- If image is not food, return confidence < 30 and suggest retaking photo
- If image quality is poor, return confidence < 60 and suggest better lighting/angle
- For mixed rice, identify at least 3 main components (rice + dishes)

${getLanguageSpecificInstructions(language)}`;

  return systemPrompt;
}

/**
 * Get language-specific instructions
 */
function getLanguageSpecificInstructions(language: string): string {
  switch (language) {
    case 'zh-CN':
      return `
语言要求：
- 使用简体中文返回食物名称和建议
- nameLocal 字段使用中文名称
- 保持专业但友好的语气`;

    case 'zh-TW':
      return `
語言要求：
- 使用繁體中文返回食物名稱和建議
- nameLocal 字段使用中文名稱
- 保持專業但友好的語氣`;

    case 'en':
    default:
      return `
LANGUAGE REQUIREMENTS:
- Return food names and suggestions in English
- nameLocal field should contain Chinese/Malay name if applicable
- Maintain professional but friendly tone`;
  }
}

/**
 * Build user prompt for food recognition
 */
export function buildUserPrompt(language: 'en' | 'zh-CN' | 'zh-TW'): string {
  const prompts = {
    en: 'Please identify the food in this image and provide detailed nutrition information following the specified JSON format.',
    'zh-CN': '请识别这张图片中的食物，并按照指定的 JSON 格式提供详细的营养信息。',
    'zh-TW': '請識別這張圖片中的食物，並按照指定的 JSON 格式提供詳細的營養信息。',
  };

  return prompts[language];
}

/**
 * Detect meal context from time
 */
export function detectMealContext(time: Date = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = time.getHours();

  if (hour >= 6 && hour < 10) {
    return 'breakfast';
  } else if (hour >= 11 && hour < 14) {
    return 'lunch';
  } else if (hour >= 17 && hour < 21) {
    return 'dinner';
  } else {
    return 'snack';
  }
}
