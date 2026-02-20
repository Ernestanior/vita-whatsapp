/**
 * Test Phase 3 Integration
 * Tests all Phase 3 services and command handlers
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ServiceContainer } from '@/lib/phase3/service-container';
import { createPhase3CommandHandler } from '@/lib/phase3/commands/command-handler';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const results: any[] = [];
  const testUserId = '+6512345678'; // Test phone number

  try {
    results.push({ step: 'Starting Phase 3 Integration Tests', status: 'info' });

    // 1. Initialize Supabase client
    const supabase = await createClient();
    results.push({ step: 'Supabase client initialized', status: 'success' });

    // 2. Get or create test user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', testUserId)
      .maybeSingle();

    if (!user) {
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone_number: testUserId,
          language: 'en',
        })
        .select('id')
        .single();

      if (error) {
        results.push({ step: 'Create test user', status: 'error', error: error.message });
        return NextResponse.json({ results }, { status: 500 });
      }

      user = newUser;
      results.push({ step: 'Test user created', status: 'success', userId: user.id });
    } else {
      results.push({ step: 'Test user found', status: 'success', userId: user.id });
    }

    const userUuid = user.id;

    // 3. Test Service Container
    const container = ServiceContainer.getInstance(supabase);
    results.push({ step: 'Service container initialized', status: 'success' });

    // 4. Test Streak Manager
    try {
      const streakManager = container.getStreakManager();
      const streakUpdate = await streakManager.updateStreak(userUuid);
      results.push({
        step: 'Streak Manager - Update streak',
        status: 'success',
        data: {
          currentStreak: streakUpdate.currentStreak,
          longestStreak: streakUpdate.longestStreak,
          isNewRecord: streakUpdate.isNewRecord,
        },
      });

      const streakStats = await streakManager.getStreakStats(userUuid);
      results.push({
        step: 'Streak Manager - Get stats',
        status: 'success',
        data: {
          currentStreak: streakStats.currentStreak,
          totalMeals: streakStats.totalMealsLogged,
          achievements: streakStats.achievements.length,
        },
      });
    } catch (error: any) {
      results.push({
        step: 'Streak Manager',
        status: 'error',
        error: error.message,
      });
    }

    // 5. Test Budget Tracker
    try {
      const budgetTracker = container.getBudgetTracker();
      
      // Set budget
      await budgetTracker.setBudget(userUuid, 2000);
      results.push({
        step: 'Budget Tracker - Set budget',
        status: 'success',
        data: { target: 2000 },
      });

      // Get status
      const budgetStatus = await budgetTracker.getBudgetStatus(userUuid);
      results.push({
        step: 'Budget Tracker - Get status',
        status: 'success',
        data: {
          enabled: budgetStatus.enabled,
          target: budgetStatus.target,
          consumed: budgetStatus.consumed,
          remaining: budgetStatus.remaining,
        },
      });

      // Update after meal
      const updatedBudget = await budgetTracker.updateAfterMeal(userUuid, 500);
      results.push({
        step: 'Budget Tracker - Update after meal',
        status: 'success',
        data: {
          consumed: updatedBudget.consumed,
          remaining: updatedBudget.remaining,
          status: updatedBudget.status,
        },
      });
    } catch (error: any) {
      results.push({
        step: 'Budget Tracker',
        status: 'error',
        error: error.message,
      });
    }

    // 6. Test Preference Manager
    try {
      const preferenceManager = container.getPreferenceManager();
      
      // Extract preferences from message
      const extracted = await preferenceManager.extractFromMessage(
        userUuid,
        "I'm vegetarian and allergic to peanuts"
      );
      results.push({
        step: 'Preference Manager - Extract from message',
        status: 'success',
        data: extracted,
      });

      // Get preferences
      const prefs = await preferenceManager.getPreferences(userUuid);
      results.push({
        step: 'Preference Manager - Get preferences',
        status: 'success',
        data: {
          dietaryType: prefs.dietaryType,
          allergies: prefs.allergies.map(a => a.allergen),
          favorites: prefs.favorites,
        },
      });

      // Check allergens
      const warnings = await preferenceManager.checkAllergens(userUuid, ['Peanut Butter', 'Chicken Rice']);
      results.push({
        step: 'Preference Manager - Check allergens',
        status: 'success',
        data: {
          warnings: warnings.map(w => ({ allergen: w.allergen, severity: w.severity })),
        },
      });
    } catch (error: any) {
      results.push({
        step: 'Preference Manager',
        status: 'error',
        error: error.message,
      });
    }

    // 7. Test Feature Discovery Engine
    try {
      const featureDiscovery = container.getFeatureDiscovery();
      
      const userContext = {
        userId: userUuid,
        totalMealsLogged: 3,
        currentStreak: 2,
        daysActive: 3,
        lastActionType: 'meal_log' as const,
      };

      const introduction = await featureDiscovery.checkForIntroduction(userContext);
      results.push({
        step: 'Feature Discovery - Check for introduction',
        status: 'success',
        data: introduction ? {
          featureName: introduction.featureName,
          priority: introduction.priority,
        } : { message: 'No feature to introduce yet' },
      });
    } catch (error: any) {
      results.push({
        step: 'Feature Discovery',
        status: 'error',
        error: error.message,
      });
    }

    // 8. Test Command Handler
    try {
      const commandHandler = await createPhase3CommandHandler();
      results.push({
        step: 'Command Handler - Initialized',
        status: 'success',
      });

      // Note: We can't actually test sending messages here, but we can verify the handler exists
      results.push({
        step: 'Command Handler - Ready',
        status: 'success',
        note: 'Commands: streak, budget, card, reminders, compare, preferences',
      });
    } catch (error: any) {
      results.push({
        step: 'Command Handler',
        status: 'error',
        error: error.message,
      });
    }

    // 9. Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    results.push({
      step: 'Test Summary',
      status: errorCount === 0 ? 'success' : 'partial',
      data: {
        total: results.length - 1, // Exclude this summary
        success: successCount,
        errors: errorCount,
      },
    });

    return NextResponse.json({
      success: errorCount === 0,
      results,
    });
  } catch (error: any) {
    results.push({
      step: 'Fatal Error',
      status: 'error',
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json({
      success: false,
      results,
    }, { status: 500 });
  }
}
