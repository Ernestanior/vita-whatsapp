# Food Record Management

Manages food recognition records, image storage, and history queries for Vita AI.

## Features

- Save food recognition results with images
- Upload images to Supabase Storage
- Query history with pagination and filters
- Search records by food name
- Get statistics for date ranges
- Delete records and associated images

## Components

### FoodRecordManager

Manages individual food records and image storage.

#### Save Record

```typescript
import { foodRecordManager } from '@/lib/food-record';

const record = await foodRecordManager.saveRecord({
  userId: 'user-123',
  imageBuffer: buffer,
  imageHash: 'sha256-hash',
  recognitionResult: {
    foods: [...],
    totalNutrition: {...},
    mealContext: 'lunch',
  },
  healthRating: {
    overall: 'green',
    score: 85,
    factors: [...],
    suggestions: [...],
  },
});
```

#### Get Record

```typescript
const record = await foodRecordManager.getRecord('record-id');
```

#### Delete Record

```typescript
await foodRecordManager.deleteRecord('record-id', 'user-123');
```

#### Find by Image Hash

```typescript
const record = await foodRecordManager.findByImageHash('sha256-hash', 'user-123');
```

### HistoryManager

Manages history queries with pagination and filtering.

#### Query History

```typescript
import { historyManager } from '@/lib/food-record';

const result = await historyManager.queryHistory({
  userId: 'user-123',
  page: 1,
  pageSize: 20,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  mealContext: 'lunch',
  searchQuery: 'chicken',
});

console.log(`Found ${result.total} records`);
console.log(`Page ${result.page} of ${result.totalPages}`);
result.records.forEach(record => {
  console.log(record.recognitionResult.foods);
});
```

#### Get Records by Date

```typescript
const records = await historyManager.getRecordsByDate(
  'user-123',
  new Date('2024-01-15')
);
```

#### Get Date Range Statistics

```typescript
const stats = await historyManager.getDateRangeStats(
  'user-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(`Total meals: ${stats.totalMeals}`);
console.log(`Average calories: ${stats.avgCalories}`);
console.log(`Green: ${stats.greenCount}, Yellow: ${stats.yellowCount}, Red: ${stats.redCount}`);
```

#### Get Recent Records

```typescript
const recent = await historyManager.getRecentRecords('user-123', 10);
```

#### Search Records

```typescript
const results = await historyManager.searchRecords('user-123', 'chicken rice');
```

#### Get Records by Meal Context

```typescript
const breakfasts = await historyManager.getRecordsByMealContext(
  'user-123',
  'breakfast',
  20
);
```

## Data Structure

### FoodRecord

```typescript
interface FoodRecord {
  id: string;
  userId: string;
  imageUrl: string;
  imageHash: string;
  recognitionResult: FoodRecognitionResult;
  healthRating: HealthRating;
  mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  createdAt: Date;
}
```

### HistoryResult

```typescript
interface HistoryResult {
  records: FoodRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### DateRangeStats

```typescript
interface DateRangeStats {
  totalMeals: number;
  avgCalories: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
}
```

## Image Storage

Images are stored in Supabase Storage with the following structure:

```
food-images/
  {userId}/
    {timestamp}-{imageHash}.jpg
```

### Storage Configuration

1. Create bucket in Supabase Dashboard:
   - Name: `food-images`
   - Public: Yes
   - File size limit: 10MB

2. Set up storage policies:
   ```sql
   -- Allow users to upload their own images
   CREATE POLICY "Users can upload own images"
   ON storage.objects FOR INSERT
   WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow users to view their own images
   CREATE POLICY "Users can view own images"
   ON storage.objects FOR SELECT
   USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
   
   -- Allow users to delete their own images
   CREATE POLICY "Users can delete own images"
   ON storage.objects FOR DELETE
   USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

## Query Parameters

### Pagination

- `page`: Page number (default: 1)
- `pageSize`: Records per page (default: 20, max: 100)

### Filters

- `startDate`: Filter records after this date
- `endDate`: Filter records before this date
- `mealContext`: Filter by meal type (breakfast, lunch, dinner, snack)
- `searchQuery`: Search in food names

### Ordering

Records are always ordered by `created_at` descending (newest first).

## Error Handling

All methods throw errors with descriptive messages:

```typescript
try {
  await foodRecordManager.saveRecord(params);
} catch (error) {
  console.error('Failed to save record:', error.message);
}
```

Common errors:
- Image upload failure
- Database connection error
- Invalid parameters
- Unauthorized access

## Performance Considerations

- Images are compressed before upload
- Pagination limits prevent large queries
- Indexes on `user_id`, `created_at`, and `image_hash`
- Public URLs are cached for 1 hour

## Requirements

- Requirements: 1.1, 1.2, 10.2, 10.10
- Database tables: `food_records`
- Storage bucket: `food-images`
- Database function: `get_user_stats`

## Testing

See `__tests__/food-record-manager.test.ts` and `__tests__/history-manager.test.ts` for unit tests.
