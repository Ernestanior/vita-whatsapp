/**
 * Database Module
 * Centralized exports for database schema, types, and helper functions
 */

// Export all types
export * from './schema';

// Export all functions
export * from './functions';

// Re-export commonly used items for convenience
export type {
  User,
  HealthProfile,
  FoodRecord,
  Subscription,
  UsageQuota,
  UserStats,
  RecognitionResult,
  HealthRating,
  NutritionData,
} from './schema';

export {
  incrementUsage,
  getUserStats,
  checkDailyQuota,
  calculateBMI,
  calculateDailyCalories,
  getBMICategory,
  getDateRange,
  validateHealthProfile,
} from './functions';
