import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Complete End-to-End Flow Test
 * 
 * This simulates a complete user journey:
 * 1. User sends /start
 * 2. User sends quick setup (25 170 65)
 * 3. User sends /profile
 * 4. User sends image (simulated)
 * 5. Verify all data in database
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const testResults: any[] = [];
  
  try {
    const body = await request.json();
    const { testUserId = env.TEST_WHATSAPP_NUMBER || '6583153431', cleanupBefore = true } = body;

    logger.info({
      type: 'complete_flow_test_started',
      testUserId,
    });

    // Initialize Supabase
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Step 0: Cleanup (if requested)
    if (cleanupBefore) {
      const cleanupResult = await cleanupTestData(supabase, testUserId);
      testResults.push(cleanupResult);
    }

    // Step 1: Test /start command
    const startResult = await testCommand(testUserId, '/start', 'Start Command');
    testResults.push(startResult);
    await sleep(1000);

    // Step 2: Test quick setup
    const setupResult = await testCommand(testUserId, '25 170 65', 'Quick Setup');
    testResults.push(setupResult);
    await sleep(2000); // Wait for database save

    // Step 3: Verify user created
    const userResult = await verifyUser(supabase, testUserId);
    testResults.push(userResult);

    // Step 4: Verify profile created
    const profileResult = await verifyProfile(supabase, testUserId);
    testResults.push(profileResult);

    // Step 5: Test /profile command
    const profileCmdResult = await testCommand(testUserId, '/profile', 'Profile Command');
    testResults.push(profileCmdResult);
    await sleep(1000);

    // Step 6: Test /help command
    const helpResult = await testCommand(testUserId, '/help', 'Help Command');
    testResults.push(helpResult);
    await sleep(1000);

    // Step 7: Test Chinese command
    const chineseResult = await testCommand(testUserId, '帮助', 'Chinese Command');
    testResults.push(chineseResult);
    await sleep(1000);

    // Step 8: Test profile update
    const updateResult = await testCommand(testUserId, '30 175 70', 'Profile Update');
    testResults.push(updateResult);
    await sleep(2000);

    // Step 9: Verify profile updated
    const updatedProfileResult = await verifyProfileUpdate(supabase, testUserId, 30, 175, 70);
    testResults.push(updatedProfileResult);

    // Step 10: Test invalid input
    const invalidResult = await testCommand(testUserId, 'random gibberish', 'Invalid Input');
    testResults.push(invalidResult);
    await sleep(1000);

    // Step 11: Test boundary values
    const boundaryResult = await testCommand(testUserId, '5 170 65', 'Boundary Value (Age Too Low)');
    testResults.push(boundaryResult);
    await sleep(1000);

    // Calculate summary
    const duration = Date.now() - startTime;
    const passed = testResults.filter(r => r.status === 'pass').length;
    const failed = testResults.filter(r => r.status === 'fail').length;

    const summary = {
      totalTests: testResults.length,
      passed,
      failed,
      passRate: ((passed / testResults.length) * 100).toFixed(2) + '%',
      duration,
      testUserId,
    };

    logger.info({
      type: 'complete_flow_test_completed',
      summary,
    });

    return NextResponse.json({
      success: failed === 0,
      summary,
      results: testResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      type: 'complete_flow_test_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results: testResults,
      },
      { status: 500 }
    );
  }
}

async function cleanupTestData(supabase: any, userId: string): Promise<any> {
  const start = Date.now();
  try {
    // Get user UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .maybeSingle();

    if (user) {
      // Delete health profile
      await supabase
        .from('health_profiles')
        .delete()
        .eq('user_id', user.id);

      // Delete food records
      await supabase
        .from('food_records')
        .delete()
        .eq('user_id', user.id);

      // Delete usage quotas
      await supabase
        .from('usage_quotas')
        .delete()
        .eq('user_id', user.id);

      // Delete user
      await supabase
        .from('users')
        .delete()
        .eq('phone_number', userId);
    }

    return {
      name: 'Cleanup Test Data',
      status: 'pass',
      duration: Date.now() - start,
      details: { cleaned: !!user },
    };
  } catch (error) {
    return {
      name: 'Cleanup Test Data',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function testCommand(userId: string, text: string, testName: string): Promise<any> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    return {
      name: testName,
      status: 'pass',
      duration: Date.now() - start,
      details: { 
        text,
        logs: result.logs.length,
      },
    };
  } catch (error) {
    return {
      name: testName,
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function verifyUser(supabase: any, userId: string): Promise<any> {
  const start = Date.now();
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found in database');
    }

    return {
      name: 'Verify User Created',
      status: 'pass',
      duration: Date.now() - start,
      details: {
        userId: user.id,
        phoneNumber: user.phone_number,
        language: user.language,
      },
    };
  } catch (error) {
    return {
      name: 'Verify User Created',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function verifyProfile(supabase: any, userId: string): Promise<any> {
  const start = Date.now();
  try {
    // Get user UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    const { data: profile, error } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      throw new Error('Health profile not found');
    }

    // Verify data
    if (profile.age !== 25 || profile.height !== 170 || profile.weight !== 65) {
      throw new Error(`Profile data mismatch: age=${profile.age}, height=${profile.height}, weight=${profile.weight}`);
    }

    return {
      name: 'Verify Profile Created',
      status: 'pass',
      duration: Date.now() - start,
      details: {
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        goal: profile.goal,
      },
    };
  } catch (error) {
    return {
      name: 'Verify Profile Created',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function verifyProfileUpdate(supabase: any, userId: string, expectedAge: number, expectedHeight: number, expectedWeight: number): Promise<any> {
  const start = Date.now();
  try {
    // Get user UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    const { data: profile, error } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      throw new Error('Health profile not found');
    }

    // Verify updated data
    if (profile.age !== expectedAge || profile.height !== expectedHeight || profile.weight !== expectedWeight) {
      throw new Error(`Profile not updated: age=${profile.age}, height=${profile.height}, weight=${profile.weight}`);
    }

    return {
      name: 'Verify Profile Updated',
      status: 'pass',
      duration: Date.now() - start,
      details: {
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
      },
    };
  } catch (error) {
    return {
      name: 'Verify Profile Updated',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET() {
  return NextResponse.json({
    message: 'Complete End-to-End Flow Test',
    usage: {
      method: 'POST',
      endpoint: '/api/test-complete-flow',
      body: {
        testUserId: 'string (optional)',
        cleanupBefore: 'boolean (optional, default: true)',
      },
    },
    tests: [
      '0. Cleanup test data',
      '1. /start command',
      '2. Quick setup (25 170 65)',
      '3. Verify user created',
      '4. Verify profile created',
      '5. /profile command',
      '6. /help command',
      '7. Chinese command (帮助)',
      '8. Profile update (30 175 70)',
      '9. Verify profile updated',
      '10. Invalid input',
      '11. Boundary values',
    ],
  });
}
