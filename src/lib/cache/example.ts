/**
 * Example usage of CacheManager
 * 
 * This file demonstrates how to integrate caching into the food recognition flow
 */

import { cacheManager } from './cache-manager';
import crypto from 'crypto';

/**
 * Calculate SHA256 hash of image buffer
 */
function calculateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Example: Food recognition with caching
 */
export async function recognizeFoodWithCache(
  imageBuffer: Buffer,
  userId: string
): Promise<any> {
  // 1. Calculate image hash
  const imageHash = calculateImageHash(imageBuffer);
  console.log(`Image hash: ${imageHash}`);

  // 2. Check cache first
  const cached = await cacheManager.getFoodRecognition(imageHash);
  if (cached) {
    console.log('✅ Cache hit! Returning cached result');
    return {
      ...cached,
      fromCache: true,
    };
  }

  console.log('❌ Cache miss. Calling AI API...');

  // 3. Call AI API (simulated here)
  const result = await callAIAPI(imageBuffer, userId);

  // 4. Cache the result
  await cacheManager.setFoodRecognition(imageHash, result);
  console.log('💾 Result cached for future use');

  return {
    ...result,
    fromCache: false,
  };
}

/**
 * Example: User profile with caching
 */
export async function getUserProfileWithCache(userId: string): Promise<any> {
  // 1. Check cache first
  const cached = await cacheManager.getUserProfile(userId);
  if (cached) {
    console.log('✅ Profile cache hit!');
    return cached;
  }

  console.log('❌ Profile cache miss. Fetching from database...');

  // 2. Fetch from database (simulated)
  const profile = await fetchProfileFromDB(userId);

  // 3. Cache the profile
  await cacheManager.setUserProfile(userId, profile);
  console.log('💾 Profile cached');

  return profile;
}

/**
 * Example: Update profile and invalidate cache
 */
export async function updateUserProfile(
  userId: string,
  updates: any
): Promise<void> {
  // 1. Update in database
  await updateProfileInDB(userId, updates);
  console.log('✅ Profile updated in database');

  // 2. Invalidate cache so next read gets fresh data
  await cacheManager.invalidateUserProfile(userId);
  console.log('🗑️ Profile cache invalidated');
}

/**
 * Example: Monitor cache performance
 */
export async function monitorCachePerformance(): Promise<void> {
  const metrics = await cacheManager.getMetrics();
  
  const total = metrics.hits + metrics.misses;
  const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;

  console.log('📊 Cache Performance Metrics:');
  console.log(`  Hits: ${metrics.hits}`);
  console.log(`  Misses: ${metrics.misses}`);
  console.log(`  Errors: ${metrics.errors}`);
  console.log(`  Hit Rate: ${hitRate.toFixed(2)}%`);
  console.log(`  Last Updated: ${metrics.lastUpdated}`);

  // Alert if hit rate is too low
  if (hitRate < 20 && total > 100) {
    console.warn('⚠️ Cache hit rate is below 20%! Consider investigating.');
  }
}

/**
 * Example: Common food data caching
 */
export async function getCommonFoodNutrition(foodName: string): Promise<any> {
  // 1. Check cache
  const cached = await cacheManager.getCommonFood(foodName);
  if (cached) {
    console.log(`✅ Common food "${foodName}" found in cache`);
    return cached;
  }

  console.log(`❌ Common food "${foodName}" not cached. Fetching...`);

  // 2. Fetch nutrition data (from database or API)
  const nutrition = await fetchNutritionData(foodName);

  // 3. Cache for future use (30 days TTL)
  await cacheManager.setCommonFood(foodName, nutrition);
  console.log(`💾 Common food "${foodName}" cached`);

  return nutrition;
}

// Simulated functions (replace with actual implementations)

async function callAIAPI(_imageBuffer: Buffer, _userId: string): Promise<any> {
  // Simulate AI API call
  return {
    foods: [
      {
        name: 'Chicken Rice',
        confidence: 95,
        nutrition: {
          calories: { min: 500, max: 600 },
          protein: { min: 25, max: 30 },
          carbs: { min: 60, max: 70 },
          fat: { min: 15, max: 20 },
          sodium: { min: 800, max: 1000 },
        },
      },
    ],
  };
}

async function fetchProfileFromDB(_userId: string): Promise<any> {
  // Simulate database fetch
  return {
    userId: _userId,
    height: 170,
    weight: 70,
    goal: 'lose-weight',
  };
}

async function updateProfileInDB(_userId: string, _updates: any): Promise<void> {
  // Simulate database update
  console.log('Updating profile in database...');
}

async function fetchNutritionData(_foodName: string): Promise<any> {
  // Simulate nutrition data fetch
  return {
    calories: { min: 500, max: 600 },
    protein: { min: 25, max: 30 },
    carbs: { min: 60, max: 70 },
    fat: { min: 15, max: 20 },
    sodium: { min: 800, max: 1000 },
  };
}

// Example usage
if (require.main === module) {
  (async () => {
    console.log('🚀 Cache Manager Examples\n');

    // Example 1: Food recognition with caching
    console.log('Example 1: Food Recognition with Caching');
    console.log('=========================================');
    const imageBuffer = Buffer.from('fake-image-data');
    await recognizeFoodWithCache(imageBuffer, 'user-123');
    console.log();

    // Example 2: User profile caching
    console.log('Example 2: User Profile Caching');
    console.log('================================');
    await getUserProfileWithCache('user-123');
    console.log();

    // Example 3: Cache metrics
    console.log('Example 3: Cache Performance Monitoring');
    console.log('=======================================');
    await monitorCachePerformance();
    console.log();

    // Example 4: Common food caching
    console.log('Example 4: Common Food Data Caching');
    console.log('===================================');
    await getCommonFoodNutrition('Chicken Rice');
    console.log();
  })();
}
