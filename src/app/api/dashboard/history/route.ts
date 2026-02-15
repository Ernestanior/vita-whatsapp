/**
 * API endpoint for food history
 * GET /api/dashboard/history
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('food_records')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply date filters
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: records, error, count } = await query;

    if (error) {
      console.error('Error fetching history:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    // Format records
    const formattedRecords = records?.map((record) => {
      const recognition = record.recognition_result as any;
      const rating = record.health_rating as any;

      return {
        id: record.id,
        imageUrl: record.image_url,
        foods: recognition.foods.map((food: any) => ({
          name: food.name,
          nameLocal: food.nameLocal,
          portion: food.portion,
        })),
        totalCalories: Math.round(
          (recognition.totalNutrition.calories.min +
            recognition.totalNutrition.calories.max) /
            2
        ),
        rating: rating.overall,
        score: rating.score,
        mealContext: recognition.mealContext,
        createdAt: record.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error in history API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
