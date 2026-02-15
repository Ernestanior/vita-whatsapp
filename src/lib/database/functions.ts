/**
 * Database Helper Functions
 * Type-safe wrappers for database operations and stored procedures
 * Requirements: 4.1, 4.2, 7.1
 */

import { createClient } from '@/lib/supabase/server';
import type { UserStats } from './schema';

// ============================================================================
// STORED PROCEDURE WRAPPERS
// ============================================================================

/**
 * Increment the daily recognition usage count for a user
 * @param userId - User UUID
 * @param date - Date in YYYY-MM-DD format (defaults to today)
 */
export async function incrementUsage(
  userId: string,
  date?: string
): Promise<void> {
  const supabase = await createClient();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_date: targetDate,
  });

  if (error) {
    throw new Error(`Failed to increment usage: ${error.message}`);
  }
}

/**
 * Get aggregated statistics for a user within a date range
 * @param userId - User UUID
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns User statistics including meal count, average calories, and rating distribution
 */
export async function getUserStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserStats> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_user_stats', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(`Failed to get user stats: ${error.message}`);
  }

  // The RPC returns an array with a single row
  const stats = data?.[0];

  if (!stats) {
    // Return empty stats if no data found
    return {
      total_meals: 0,
      avg_calories: 0,
      green_count: 0,
      yellow_count: 0,
      red_count: 0,
    };
  }

  return stats;
}

// ============================================================================
// QUOTA MANAGEMENT
// ============================================================================

/**
 * Check if a user has remaining quota for today
 * @param userId - User UUID
 * @returns Object with hasQuota boolean and remaining count
 */
export async function checkDailyQuota(
  userId: string
): Promise<{ hasQuota: boolean; remaining: number; limit: number }> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Get subscription tier
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // Premium and Pro users have unlimited quota
  if (subscription && ['premium', 'pro'].includes(subscription.tier)) {
    return { hasQuota: true, remaining: Infinity, limit: Infinity };
  }

  // Check usage quota for free users
  const { data: quota } = await supabase
    .from('usage_quotas')
    .select('recognitions_used, recognitions_limit')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (!quota) {
    // No quota record yet, user has full quota
    return { hasQuota: true, remaining: 3, limit: 3 };
  }

  const remaining = quota.recognitions_limit - quota.recognitions_used;
  return {
    hasQuota: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: quota.recognitions_limit,
  };
}

/**
 * Reset daily quota for a user (admin function)
 * @param userId - User UUID
 * @param date - Date to reset (defaults to today)
 */
export async function resetDailyQuota(
  userId: string,
  date?: string
): Promise<void> {
  const supabase = await createClient();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('usage_quotas')
    .update({ recognitions_used: 0 })
    .eq('user_id', userId)
    .eq('date', targetDate);

  if (error) {
    throw new Error(`Failed to reset quota: ${error.message}`);
  }
}

// ============================================================================
// USER PROFILE HELPERS
// ============================================================================

/**
 * Calculate BMI from height and weight
 * @param height - Height in cm
 * @param weight - Weight in kg
 * @returns BMI value
 */
export function calculateBMI(height: number, weight: number): number {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

/**
 * Calculate daily calorie target using Mifflin-St Jeor equation
 * @param profile - User health profile
 * @returns Daily calorie target
 */
export function calculateDailyCalories(profile: {
  height: number;
  weight: number;
  age: number;
  gender: 'male' | 'female';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active';
  goal: 'lose-weight' | 'gain-muscle' | 'control-sugar' | 'maintain';
}): number {
  // Mifflin-St Jeor equation for BMR
  const bmr =
    profile.gender === 'male'
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;

  // Activity level multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };

  const tdee = bmr * activityMultipliers[profile.activity_level];

  // Goal adjustments
  const goalAdjustments = {
    'lose-weight': -500, // 500 calorie deficit
    'gain-muscle': 300, // 300 calorie surplus
    'control-sugar': 0,
    maintain: 0,
  };

  return Math.round(tdee + goalAdjustments[profile.goal]);
}

/**
 * Get BMI category
 * @param bmi - BMI value
 * @returns BMI category string
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get date range for common periods
 * @param period - Period type
 * @returns Object with start and end dates in YYYY-MM-DD format
 */
export function getDateRange(
  period: 'today' | 'week' | 'month' | 'year'
): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];

  let startDate: string;

  switch (period) {
    case 'today':
      startDate = endDate;
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    case 'year':
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      startDate = yearAgo.toISOString().split('T')[0];
      break;
  }

  return { startDate, endDate };
}

/**
 * Get Singapore time (SGT, UTC+8)
 * @returns Date object in Singapore timezone
 */
export function getSingaporeTime(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000);
}

/**
 * Format date for Singapore locale
 * @param date - Date to format
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatSingaporeDate(date: Date): string {
  return date.toLocaleDateString('en-SG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate health profile data
 * @param data - Health profile data to validate
 * @returns Validation result with errors if any
 */
export function validateHealthProfile(data: {
  height?: number;
  weight?: number;
  age?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.height !== undefined) {
    if (data.height < 100 || data.height > 250) {
      errors.push('Height must be between 100 and 250 cm');
    }
  }

  if (data.weight !== undefined) {
    if (data.weight < 30 || data.weight > 300) {
      errors.push('Weight must be between 30 and 300 kg');
    }
  }

  if (data.age !== undefined) {
    if (data.age < 10 || data.age > 120) {
      errors.push('Age must be between 10 and 120 years');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
