/**
 * Database Schema Types
 * Auto-generated types matching the database schema
 * Requirements: 4.1, 4.2, 7.1
 */

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface User {
  id: string;
  phone_number: string;
  whatsapp_name: string | null;
  language: 'en' | 'zh-CN' | 'zh-TW';
  created_at: Date;
  updated_at: Date;
}

export interface HealthProfile {
  user_id: string;
  height: number; // cm, 100-250
  weight: number; // kg, 30-300
  age: number | null; // 10-120
  gender: 'male' | 'female' | null;
  goal: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  digest_time: string; // TIME format "HH:MM:SS"
  quick_mode: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface FoodRecord {
  id: string;
  user_id: string;
  image_url: string;
  image_hash: string; // SHA256 hash
  recognition_result: RecognitionResult;
  health_rating: HealthRating;
  meal_context: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  created_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 'free' | 'premium' | 'pro';
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: Date;
  current_period_end: Date;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UsageQuota {
  user_id: string;
  date: string; // DATE format "YYYY-MM-DD"
  recognitions_used: number;
  recognitions_limit: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserFeedback {
  id: string;
  user_id: string;
  food_record_id: string | null;
  feedback_type: 'accurate' | 'inaccurate' | 'suggestion';
  correct_food_name: string | null;
  comment: string | null;
  created_at: Date;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achieved_at: Date;
}

// ============================================================================
// JSONB TYPES (for recognition_result and health_rating)
// ============================================================================

export interface NutritionRange {
  min: number;
  max: number;
}

export interface NutritionData {
  calories: NutritionRange;
  protein: NutritionRange;
  carbs: NutritionRange;
  fat: NutritionRange;
  sodium: NutritionRange;
}

export interface FoodItem {
  name: string;
  nameLocal: string;
  confidence: number; // 0-100
  portion: string;
  nutrition: NutritionData;
}

export interface RecognitionResult {
  foods: FoodItem[];
  totalNutrition: NutritionData;
  mealContext: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface HealthFactor {
  name: string;
  status: 'good' | 'moderate' | 'poor';
  message: string;
}

export interface HealthRating {
  overall: 'green' | 'yellow' | 'red';
  score: number; // 0-100
  factors: HealthFactor[];
  suggestions: string[];
}

// ============================================================================
// DATABASE FUNCTION RETURN TYPES
// ============================================================================

export interface UserStats {
  total_meals: number;
  avg_calories: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
}

// ============================================================================
// INSERT TYPES (for creating new records)
// ============================================================================

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type HealthProfileInsert = Omit<HealthProfile, 'created_at' | 'updated_at'> & {
  created_at?: Date;
  updated_at?: Date;
};

export type FoodRecordInsert = Omit<FoodRecord, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type UsageQuotaInsert = Omit<UsageQuota, 'created_at' | 'updated_at'> & {
  created_at?: Date;
  updated_at?: Date;
};

export type UserFeedbackInsert = Omit<UserFeedback, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type AchievementInsert = Omit<Achievement, 'id' | 'achieved_at'> & {
  id?: string;
  achieved_at?: Date;
};

// ============================================================================
// UPDATE TYPES (for updating existing records)
// ============================================================================

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;

export type HealthProfileUpdate = Partial<Omit<HealthProfile, 'user_id' | 'created_at' | 'updated_at'>>;

export type SubscriptionUpdate = Partial<Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type UsageQuotaUpdate = Partial<Omit<UsageQuota, 'user_id' | 'date' | 'created_at' | 'updated_at'>>;

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_RULES = {
  height: { min: 100, max: 250 },
  weight: { min: 30, max: 300 },
  age: { min: 10, max: 120 },
  confidence: { min: 0, max: 100 },
  healthScore: { min: 0, max: 100 },
} as const;

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    dailyLimit: 3,
    features: ['Basic food recognition', 'Nutrition info', 'Health rating'],
  },
  premium: {
    name: 'Premium',
    dailyLimit: Infinity,
    features: ['Unlimited recognition', 'Daily digest', 'History tracking'],
  },
  pro: {
    name: 'Pro',
    dailyLimit: Infinity,
    features: ['All Premium features', 'Advanced analytics', 'Priority support'],
  },
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isValidLanguage(lang: string): lang is User['language'] {
  return ['en', 'zh-CN', 'zh-TW'].includes(lang);
}

export function isValidGender(gender: string): gender is NonNullable<HealthProfile['gender']> {
  return ['male', 'female'].includes(gender);
}

export function isValidGoal(goal: string): goal is HealthProfile['goal'] {
  return ['lose-weight', 'gain-muscle', 'control-sugar', 'maintain'].includes(goal);
}

export function isValidActivityLevel(level: string): level is HealthProfile['activity_level'] {
  return ['sedentary', 'light', 'moderate', 'active'].includes(level);
}

export function isValidSubscriptionTier(tier: string): tier is Subscription['tier'] {
  return ['free', 'premium', 'pro'].includes(tier);
}

export function isValidRating(rating: string): rating is HealthRating['overall'] {
  return ['green', 'yellow', 'red'].includes(rating);
}
