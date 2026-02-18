/**
 * Check user's data in database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const TEST_USER_ID = '6583153431';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', TEST_USER_ID)
      .maybeSingle();

    if (userError) {
      return NextResponse.json({
        success: false,
        error: 'User query error: ' + userError.message
      });
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        userExists: false,
        message: 'User not found in database'
      });
    }

    // Get food records
    const { data: records, error: recordsError } = await supabase
      .from('food_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Get health profile
    const { data: profile, error: profileError } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      userExists: true,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        language: user.language,
        created_at: user.created_at
      },
      foodRecords: {
        count: records?.length || 0,
        records: records?.slice(0, 3) || [] // First 3 records
      },
      profile: profile || null,
      errors: {
        recordsError: recordsError?.message,
        profileError: profileError?.message
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
