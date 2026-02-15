/**
 * API endpoint for dashboard statistics
 * GET /api/dashboard/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get session token from header
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const userId = session.user_id;

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    const { data: todayRecords } = await supabase
      .from('food_records')
      .select('recognition_result, health_rating')
      .eq('user_id', userId)
      .gte('created_at', today);

    // Calculate today's totals
    let todayCalories = 0;
    let todayProtein = 0;
    let todayCarbs = 0;
    let todayFat = 0;
    const todayRatings = { green: 0, yellow: 0, red: 0 };

    if (todayRecords) {
      for (const record of todayRecords) {
        const nutrition = (record.recognition_result as any).totalNutrition;
        todayCalories += (nutrition.calories.min + nutrition.calories.max) / 2;
        todayProtein += (nutrition.protein.min + nutrition.protein.max) / 2;
        todayCarbs += (nutrition.carbs.min + nutrition.carbs.max) / 2;
        todayFat += (nutrition.fat.min + nutrition.fat.max) / 2;

        const rating = (record.health_rating as any).overall;
        if (rating === 'green') todayRatings.green++;
        else if (rating === 'yellow') todayRatings.yellow++;
        else if (rating === 'red') todayRatings.red++;
      }
    }

    // Get weekly stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekRecords, count: weekCount } = await supabase
      .from('food_records')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    // Get user profile
    const { data: profile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Calculate daily target
    let dailyTarget = 2000; // Default
    if (profile) {
      const bmr = profile.gender === 'male'
        ? 10 * profile.weight + 6.25 * profile.height - 5 * (profile.age || 30) + 5
        : 10 * profile.weight + 6.25 * profile.height - 5 * (profile.age || 30) - 161;

      const activityMultiplier = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
      }[profile.activity_level] || 1.375;

      const tdee = bmr * activityMultiplier;

      const goalAdjustment = {
        'lose-weight': -500,
        'gain-muscle': 300,
        'control-sugar': 0,
        'maintain': 0,
      }[profile.goal] || 0;

      dailyTarget = Math.round(tdee + goalAdjustment);
    }

    // Get subscription info
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Get today's quota
    const { data: quota } = await supabase
      .from('usage_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        today: {
          calories: Math.round(todayCalories),
          protein: Math.round(todayProtein),
          carbs: Math.round(todayCarbs),
          fat: Math.round(todayFat),
          mealsCount: todayRecords?.length || 0,
          ratings: todayRatings,
        },
        targets: {
          calories: dailyTarget,
          protein: profile ? Math.round(profile.weight * 1.2) : 60,
          carbs: profile ? Math.round((dailyTarget * 0.5) / 4) : 250,
          fat: profile ? Math.round((dailyTarget * 0.25) / 9) : 55,
        },
        week: {
          totalMeals: weekCount || 0,
          avgMealsPerDay: weekCount ? Math.round((weekCount / 7) * 10) / 10 : 0,
        },
        subscription: {
          tier: subscription?.tier || 'free',
          status: subscription?.status || 'active',
        },
        quota: {
          used: quota?.recognitions_used || 0,
          limit: quota?.recognitions_limit || 3,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
