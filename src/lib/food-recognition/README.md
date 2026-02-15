# Food Recognition System

This module implements the food recognition system for Vita AI, optimized for Singapore local foods.

## Architecture

The food recognition system consists of three main components:

### 1. ImageHandler (`image-handler.ts`)

Handles image processing and optimization:
- Downloads images from URLs
- Validates image formats (JPEG, PNG, WebP)
- Compresses and optimizes images (target: 1024x1024, 85% quality)
- Calculates SHA256 hashes for caching
- Converts images to base64 data URLs for OpenAI API

**Key Features:**
- Maximum image size: 10MB
- Automatic compression to reduce API costs
- SHA256 hashing for cache keys

### 2. Prompt Engineering (`prompts.ts`)

Implements sophisticated prompt engineering for accurate Singapore food recognition:

**System Prompt Features:**
- Singapore-specific food database (Chicken Rice, Laksa, Bak Chor Mee, etc.)
- Detailed nutrition estimation rules
- Meal context detection (breakfast/lunch/dinner/snack)
- Confidence scoring guidelines
- Multi-language support (English, 简体中文, 繁體中文)

**Nutrition Estimation Rules:**
- Provides ranges (min-max) instead of exact values
- Accounts for hidden calories (oil, sauces, cooking methods)
- Conservative estimates (slightly overestimate for health awareness)
- Singapore-specific portion sizes and cooking methods

### 3. FoodRecognizer (`recognizer.ts`)

Core recognition logic using OpenAI GPT-4o-mini Vision API:

**Process Flow:**
1. Validate image format
2. Process and optimize image
3. Build context-aware prompts
4. Call OpenAI Vision API
5. Parse and validate JSON response
6. Handle low confidence cases (< 60%)
7. Enrich result with meal context

**Error Handling:**
- Invalid image format
- Low confidence recognition
- API timeouts and rate limits
- Malformed responses

## Usage

### Basic Recognition

```typescript
import { foodRecognizer } from '@/lib/food-recognition';

const imageBuffer = await downloadImage(imageUrl);

const response = await foodRecognizer.recognizeFood(imageBuffer, {
  userId: 'user-123',
  language: 'en',
  mealTime: new Date(),
});

if (response.success) {
  console.log('Foods:', response.result.foods);
  console.log('Total Nutrition:', response.result.totalNutrition);
  console.log('Tokens Used:', response.tokensUsed);
} else {
  console.error('Error:', response.error);
}
```

### Image Processing Only

```typescript
import { imageHandler } from '@/lib/food-recognition';

const processed = await imageHandler.processImage(imageBuffer);
console.log('Hash:', processed.hash);
console.log('Size:', processed.size);
console.log('Format:', processed.format);
```

### Custom Prompts

```typescript
import { buildFoodRecognitionPrompt, detectMealContext } from '@/lib/food-recognition';

const systemPrompt = buildFoodRecognitionPrompt({
  language: 'zh-CN',
  mealTime: new Date(),
});

const mealContext = detectMealContext(new Date());
console.log('Meal Context:', mealContext); // 'breakfast', 'lunch', 'dinner', or 'snack'
```

## Response Format

### Success Response

```typescript
{
  success: true,
  result: {
    foods: [
      {
        name: "Chicken Rice",
        nameLocal: "海南鸡饭",
        confidence: 92,
        portion: "1 plate",
        nutrition: {
          calories: { min: 500, max: 600 },
          protein: { min: 25, max: 30 },
          carbs: { min: 60, max: 70 },
          fat: { min: 15, max: 20 },
          sodium: { min: 800, max: 1000 }
        }
      }
    ],
    totalNutrition: {
      calories: { min: 500, max: 600 },
      protein: { min: 25, max: 30 },
      carbs: { min: 60, max: 70 },
      fat: { min: 15, max: 20 },
      sodium: { min: 800, max: 1000 }
    },
    mealContext: "lunch"
  },
  tokensUsed: 1234,
  processingTime: 2500
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    type: "UNSUPPORTED_CONTENT",
    message: "Invalid image format. Please send a clear photo of your food.",
    suggestion: "Try taking a new photo with better lighting and focus."
  }
}
```

## Singapore Food Database

The system is optimized for these common Singapore dishes:

1. **Chicken Rice (海南鸡饭)**: 500-600 cal, high sodium
2. **Laksa (叻沙)**: 600-700 cal, high fat (coconut milk)
3. **Roti Prata (印度煎饼)**: 300-350 cal per piece
4. **Bak Chor Mee (肉脞面)**: 400-500 cal, high sodium
5. **Nasi Lemak (椰浆饭)**: 600-700 cal, high fat
6. **Char Kway Teow (炒粿条)**: 700-900 cal, very high fat/sodium
7. **Mixed Rice (杂菜饭)**: 400-800 cal (varies by dishes)
8. **Hokkien Mee (福建面)**: 500-600 cal
9. **Satay (沙爹)**: 30-40 cal per stick
10. **Kaya Toast (咖椰吐司)**: 300-400 cal, high sugar

## Confidence Levels

- **90-100**: Very clear image, well-known dish, all components visible
- **70-89**: Good image quality, recognizable dish, some uncertainty
- **60-69**: Moderate quality, dish partially visible or less common
- **Below 60**: Poor quality, unclear dish, or non-food item (requires user confirmation)

## Cost Optimization

The system implements several cost optimization strategies:

1. **Image Compression**: Reduces image size to ~1024x1024 pixels
2. **SHA256 Hashing**: Enables caching of identical images
3. **Model Selection**: Uses GPT-4o-mini ($0.15/1M input tokens)
4. **Token Limits**: Max 1000 output tokens per request
5. **Low Temperature**: 0.3 for consistent, focused responses

**Estimated Cost per Recognition:**
- Input tokens: ~1500 (image + prompt)
- Output tokens: ~300 (JSON response)
- Total cost: ~$0.0004 per recognition

## Error Types

- `INVALID_INPUT`: Invalid image format or size
- `UNSUPPORTED_CONTENT`: Image doesn't contain food
- `AI_API_ERROR`: OpenAI API error or malformed response
- `TIMEOUT_ERROR`: Recognition took too long
- `QUOTA_EXCEEDED`: User exceeded daily quota (handled elsewhere)

## Testing

See `__tests__/food-recognition.test.ts` for unit tests and property-based tests.

## Future Enhancements

1. Support for video/multiple images
2. Ingredient-level recognition for mixed rice
3. Brand recognition for packaged foods
4. Barcode scanning integration
5. User feedback loop for improving accuracy
