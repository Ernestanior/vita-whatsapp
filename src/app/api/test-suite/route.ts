import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Comprehensive Test Suite for WhatsApp Bot
 * 
 * This endpoint runs all tests automatically and reports results
 */

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  try {
    const body = await request.json();
    const { testUserId = env.TEST_WHATSAPP_NUMBER || '6583153431' } = body;

    logger.info({
      type: 'test_suite_started',
      testUserId,
    });

    // Initialize Supabase client with service role
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

    // Test 1: Database Connection
    results.push(await testDatabaseConnection(supabase));

    // Test 2: Clean up test user data
    results.push(await cleanupTestUser(supabase, testUserId));

    // Test 3: /start command
    results.push(await testStartCommand(testUserId));

    // Test 4: Quick setup with 3 numbers
    results.push(await testQuickSetup(supabase, testUserId));

    // Test 5: Verify user created in database
    results.push(await testUserCreated(supabase, testUserId));

    // Test 6: Verify health profile created
    results.push(await testHealthProfileCreated(supabase, testUserId));

    // Test 7: /profile command
    results.push(await testProfileCommand(testUserId));

    // Test 8: /help command
    results.push(await testHelpCommand(testUserId));

    // Test 9: Invalid input handling
    results.push(await testInvalidInput(testUserId));

    // Test 10: Boundary values
    results.push(await testBoundaryValues(testUserId));

    // Calculate summary
    const duration = Date.now() - startTime;
    const summary: TestSuiteResult = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      skipped: results.filter(r => r.status === 'skip').length,
      duration,
      results,
    };

    logger.info({
      type: 'test_suite_completed',
      summary,
    });

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      type: 'test_suite_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection(supabase: any): Promise<TestResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;

    return {
      name: 'Database Connection',
      status: 'pass',
      duration: Date.now() - start,
      details: { connected: true },
    };
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean up test user data
 */
async function cleanupTestUser(supabase: any, userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Get user UUID first
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .single();

    if (user) {
      // Delete health profile
      await supabase
        .from('health_profiles')
        .delete()
        .eq('user_id', user.id);

      // Delete user
      await supabase
        .from('users')
        .delete()
        .eq('phone_number', userId);
    }

    return {
      name: 'Cleanup Test User',
      status: 'pass',
      duration: Date.now() - start,
      details: { cleaned: !!user },
    };
  } catch (error) {
    return {
      name: 'Cleanup Test User',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test /start command
 */
async function testStartCommand(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '/start',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    // Check if welcome message was sent
    const hasSentMessage = result.logs.some((log: any) => 
      log.type === 'start_message_sent'
    );

    if (!hasSentMessage) {
      throw new Error('Start message not sent');
    }

    return {
      name: '/start Command',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: '/start Command',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test quick setup
 */
async function testQuickSetup(supabase: any, userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '25 170 65',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    // Check if confirmation was sent
    const hasConfirmation = result.logs.some((log: any) => 
      log.type === 'quick_setup_confirmation_sent'
    );

    if (!hasConfirmation) {
      throw new Error('Confirmation not sent');
    }

    // Wait for database save (fire-and-forget might take time)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      name: 'Quick Setup (3 numbers)',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: 'Quick Setup (3 numbers)',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test user created in database
 */
async function testUserCreated(supabase: any, userId: string): Promise<TestResult> {
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
      name: 'User Created in Database',
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
      name: 'User Created in Database',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test health profile created
 */
async function testHealthProfileCreated(supabase: any, userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Get user UUID first
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
      throw new Error('Health profile not found in database');
    }

    // Verify data
    if (profile.age !== 25 || profile.height !== 170 || profile.weight !== 65) {
      throw new Error('Health profile data mismatch');
    }

    return {
      name: 'Health Profile Created',
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
      name: 'Health Profile Created',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test /profile command
 */
async function testProfileCommand(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '/profile',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    return {
      name: '/profile Command',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: '/profile Command',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test /help command
 */
async function testHelpCommand(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '/help',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    return {
      name: '/help Command',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: '/help Command',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test invalid input handling
 */
async function testInvalidInput(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: 'random gibberish text',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Test message failed');
    }

    // Should handle gracefully without errors
    return {
      name: 'Invalid Input Handling',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: 'Invalid Input Handling',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test boundary values
 */
async function testBoundaryValues(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test invalid age
    const response1 = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '5 170 65', // Age too low
      }),
    });

    const result1 = await response1.json();
    if (!result1.success) throw new Error('Test 1 failed');

    // Test invalid height
    const response2 = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '25 300 65', // Height too high
      }),
    });

    const result2 = await response2.json();
    if (!result2.success) throw new Error('Test 2 failed');

    return {
      name: 'Boundary Values',
      status: 'pass',
      duration: Date.now() - start,
      details: { tests: 2 },
    };
  } catch (error) {
    return {
      name: 'Boundary Values',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * GET handler to show usage
 */
export async function GET() {
  return NextResponse.json({
    message: 'Comprehensive Test Suite for WhatsApp Bot',
    usage: {
      method: 'POST',
      endpoint: '/api/test-suite',
      body: {
        testUserId: 'string (optional) - Phone number to use for testing',
      },
    },
    tests: [
      '1. Database Connection',
      '2. Cleanup Test User',
      '3. /start Command',
      '4. Quick Setup (3 numbers)',
      '5. User Created in Database',
      '6. Health Profile Created',
      '7. /profile Command',
      '8. /help Command',
      '9. Invalid Input Handling',
      '10. Boundary Values',
    ],
  });
}
