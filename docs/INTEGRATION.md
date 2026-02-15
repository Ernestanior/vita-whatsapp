# Component Integration Documentation

## Overview

This document describes the complete integration of all components in the Vita AI WhatsApp Health Bot. The integration implements the full food recognition flow from image receipt to response with quick reply buttons.

## Architecture

```
User sends image
    ↓
WhatsApp Webhook
    ↓
Message Router
    ↓
Image Handler (orchestrates the flow)
    ├─→ Profile Manager (check user profile)
    ├─→ Quota Check (verify user has quota)
    ├─→ Image Processor (download & process)
    ├─→ Cache Manager (check for cached result)
    ├─→ Food Recognizer (OpenAI Vision API)
    ├─→ Rating Engine (health evaluation)
    ├─→ Supabase Storage (upload image)
    ├─→ Database (save record)
    └─→ WhatsApp Client (send response + buttons)
```

## Components

### 1. Image Handler (`src/lib/whatsapp/image-handler.ts`)

**Purpose**: Orchestrates the complete food recognition flow

**Flow**:
1. Send acknowledgment (< 3 seconds)
2. Check if user has profile
3. Check user quota
4. Download image from WhatsApp
5. Process and hash image
6. Check cache for existing recognition
7. If not cached, call food recognizer
8. Get user profile for rating
9. Calculate health rating
10. Upload image to storage
11. Save record to database
12. Increment usage quota
13. Send response with quick reply buttons

**Key Methods**:
- `handle(message, context)` - Main entry point
- `checkQuota(userId)` - Verify user has remaining quota
- `uploadImage(userId, buffer, hash)` - Upload to Supabase Storage
- `saveRecord(...)` - Save food record to database
- `sendResponse(...)` - Format and send response message
- `sendQuickReplyButtons(...)` - Send interactive buttons

### 2. Interactive Handler (`src/lib/whatsapp/interactive-handler.ts`)

**Purpose**: Handles quick reply button clicks

**Supported Actions**:
- **Record**: Confirm and keep the food record (already saved)
- **Modify**: Allow user to modify the recognition result (TODO)
- **Ignore**: Delete the food record and refund quota

**Key Methods**:
- `handle(message, context)` - Main entry point
- `handleRecord(context, recordId)` - Confirm record
- `handleModify(context, recordId)` - Start modification flow
- `handleIgnore(context, recordId)` - Delete record and refund quota

### 3. Message Router (`src/lib/whatsapp/message-router.ts`)

**Purpose**: Routes messages to appropriate handlers

**Updated to handle**:
- Text messages → TextHandler
- Image messages → ImageHandler
- Interactive messages → InteractiveHandler

### 4. Supporting Components

#### Food Recognizer (`src/lib/food-recognition/recognizer.ts`)
- Calls OpenAI Vision API
- Returns structured food recognition result
- Handles errors and low confidence

#### Rating Engine (`src/lib/rating/rating-engine.ts`)
- Evaluates food nutrition
- Calculates health score (0-100)
- Generates personalized suggestions
- Returns red/yellow/green rating

#### Cache Manager (`src/lib/cache/cache-manager.ts`)
- Caches recognition results by image hash
- Reduces AI API costs
- 7-day TTL for food recognition

#### Profile Manager (`src/lib/profile/profile-manager.ts`)
- Manages user health profiles
- Conversational setup flow
- Profile validation

## Data Flow

### 1. Image Message Flow

```typescript
// User sends image
{
  from: "+6512345678",
  type: "image",
  image: {
    id: "media-id",
    mime_type: "image/jpeg",
    sha256: "hash"
  }
}

// Image Handler processes
1. Download image → Buffer
2. Process image → { buffer, hash, size, format }
3. Check cache → FoodRecognitionResult | null
4. If not cached:
   - Call OpenAI Vision API
   - Parse JSON response
   - Cache result
5. Get user profile → HealthProfile
6. Calculate rating → HealthRating
7. Upload image → imageUrl
8. Save to database → recordId
9. Send response + buttons

// Response to user
{
  text: "🟢 Healthy (85/100)\n\n🍽️ Detected Food:\n• Chicken Rice (1 plate)\n  550 kcal\n\n📊 Total Nutrition:\n• Calories: 550 kcal\n• Protein: 35g\n• Carbs: 65g\n• Fat: 15g\n\n💡 Health Analysis:\n✅ Calorie content is appropriate for lunch (550 kcal)\n✅ Low sodium content (450mg)\n✅ Healthy fat content (15g, 25% of calories)\n✅ Well-balanced meal (P:25% C:47% F:25%)\n\n💪 Suggestions:\n• 💡 Tip: Eat slowly and stop when 80% full",
  
  buttons: [
    { id: "record_uuid", title: "✅ Record" },
    { id: "modify_uuid", title: "✏️ Modify" },
    { id: "ignore_uuid", title: "❌ Ignore" }
  ]
}
```

### 2. Button Click Flow

```typescript
// User clicks button
{
  from: "+6512345678",
  type: "interactive",
  interactive: {
    type: "button_reply",
    button_reply: {
      id: "record_uuid",
      title: "✅ Record"
    }
  }
}

// Interactive Handler processes
1. Parse button ID → action + recordId
2. Handle action:
   - record: Send confirmation
   - modify: Start modification flow
   - ignore: Delete record + refund quota
```

## Database Schema

### food_records Table

```sql
CREATE TABLE food_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_hash VARCHAR(64) NOT NULL,
  recognition_result JSONB NOT NULL,
  health_rating JSONB NOT NULL,
  meal_context VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_date (user_id, created_at),
  INDEX idx_image_hash (image_hash)
);
```

### recognition_result JSONB Structure

```json
{
  "foods": [
    {
      "name": "Chicken Rice",
      "nameLocal": "海南鸡饭",
      "confidence": 92,
      "portion": "1 plate",
      "nutrition": {
        "calories": { "min": 500, "max": 600 },
        "protein": { "min": 30, "max": 40 },
        "carbs": { "min": 60, "max": 70 },
        "fat": { "min": 12, "max": 18 },
        "sodium": { "min": 400, "max": 500 }
      }
    }
  ],
  "totalNutrition": {
    "calories": { "min": 500, "max": 600 },
    "protein": { "min": 30, "max": 40 },
    "carbs": { "min": 60, "max": 70 },
    "fat": { "min": 12, "max": 18 },
    "sodium": { "min": 400, "max": 500 }
  },
  "mealContext": "lunch"
}
```

### health_rating JSONB Structure

```json
{
  "overall": "green",
  "score": 85,
  "factors": [
    {
      "name": "Calories",
      "status": "good",
      "message": "Calorie content is appropriate for lunch (550 kcal)"
    },
    {
      "name": "Sodium",
      "status": "good",
      "message": "Low sodium content (450mg)"
    },
    {
      "name": "Fat",
      "status": "good",
      "message": "Healthy fat content (15g, 25% of calories)"
    },
    {
      "name": "Balance",
      "status": "good",
      "message": "Well-balanced meal (P:25% C:47% F:25%)"
    }
  ],
  "suggestions": [
    "💡 Tip: Eat slowly and stop when 80% full"
  ]
}
```

## Error Handling

### Profile Not Found
```typescript
if (!hasProfile) {
  await sendProfileSetupPrompt(context);
  return;
}
```

### Quota Exceeded
```typescript
if (!hasQuota) {
  await sendQuotaExceededMessage(context);
  return;
}
```

### Recognition Failed
```typescript
if (!recognitionResponse.success) {
  await sendErrorResponse(context, recognitionResponse.error);
  return;
}
```

### Generic Error
```typescript
catch (error) {
  logger.error({ error });
  await sendGenericError(context);
}
```

## Performance Optimization

### 1. Cache Strategy
- Cache recognition results by image SHA256 hash
- 7-day TTL
- Reduces AI API costs by ~30% (estimated)

### 2. Response Time
- Initial acknowledgment: < 3 seconds
- Complete processing: < 10 seconds
- Parallel operations where possible

### 3. Cost Optimization
- Check cache before API call
- Use GPT-4o-mini (cost-effective)
- Compress images before upload

## Testing

### Integration Test

Run the integration test:

```bash
tsx scripts/test-integration.ts
```

This tests:
1. Food recognition
2. Health rating calculation
3. Cache operations
4. Result formatting

### Manual Testing

1. Send an image to the WhatsApp bot
2. Verify acknowledgment received < 3 seconds
3. Verify complete response received < 10 seconds
4. Verify quick reply buttons appear
5. Click "Record" button → verify confirmation
6. Click "Ignore" button → verify deletion

## Requirements Validation

This integration validates the following requirements:

- **1.1**: Initial response within 3 seconds ✅
- **1.2**: Food recognition with OpenAI Vision API ✅
- **1.3**: Nutrition data estimation ✅
- **3.1**: Red/yellow/green health rating ✅
- **17.1**: Quick reply buttons implemented ✅
- **17.2**: Direct record without confirmation ✅

## Future Enhancements

### 1. Modify Flow
Currently, the "Modify" button shows a prompt but doesn't implement the full flow. Future implementation should:
- Allow portion adjustment
- Allow removing items
- Allow adding missing items
- Re-calculate rating after modification

### 2. Batch Processing
Support multiple images in one message:
- Recognize all foods
- Combine nutrition data
- Single rating for the meal

### 3. Voice Input
Support voice messages for:
- Quick food logging ("I ate chicken rice")
- Profile updates ("I'm now 65kg")

## Troubleshooting

### Issue: Module '@/lib/supabase/server' not found

This is a TypeScript language server caching issue. The file exists at `src/lib/supabase/server.ts`. Solutions:
1. Restart TypeScript server in your IDE
2. Run `npm run build` to verify compilation works
3. Check `tsconfig.json` has correct path mapping

### Issue: Type mismatch between database and types

The database schema uses snake_case (e.g., `user_id`) while TypeScript types use camelCase (e.g., `userId`). The image handler converts between formats:

```typescript
const ratingProfile = {
  userId: profile.user_id,
  activityLevel: profile.activity_level,
  // ... etc
};
```

### Issue: Cache not working

Check:
1. `ENABLE_CACHING` environment variable is true
2. Redis connection is configured
3. Check cache metrics: `await cacheManager.getMetrics()`

## Conclusion

The integration successfully connects all components to provide a complete food recognition flow. Users can:
1. Send food images
2. Receive instant analysis
3. Get personalized health ratings
4. Use quick actions (record/modify/ignore)

The system is optimized for performance, cost, and user experience.
