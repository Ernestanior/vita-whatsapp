import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/**
 * Advanced Test Suite - Image Processing, Progressive Profiling, etc.
 */

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: TestResult[] = [];
  
  try {
    const body = await request.json();
    const { testUserId = env.TEST_WHATSAPP_NUMBER || '6583153431' } = body;

    logger.info({
      type: 'advanced_test_suite_started',
      testUserId,
    });

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

    // Test 1: Button interactions
    results.push(await testButtonInteraction(testUserId));

    // Test 2: Multiple quick setups (update profile)
    results.push(await testProfileUpdate(supabase, testUserId));

    // Test 3: Command during setup flow
    results.push(await testCommandDuringSetup(testUserId));

    // Test 4: Concurrent messages
    results.push(await testConcurrentMessages(testUserId));

    // Test 5: Response time check
    results.push(await testResponseTime(testUserId));

    // Test 6: Database consistency
    results.push(await testDatabaseConsistency(supabase, testUserId));

    // Test 7: Error recovery
    results.push(await testErrorRecovery(testUserId));

    // Test 8: Language detection
    results.push(await testLanguageDetection(testUserId));

    const duration = Date.now() - startTime;
    const summary = {
      totalTests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      skipped: results.filter(r => r.status === 'skip').length,
      duration,
      results,
    };

    logger.info({
      type: 'advanced_test_suite_completed',
      summary,
    });

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({
      type: 'advanced_test_suite_error',
      error: error instanceof Error ? error.message : 'Unknown error',
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
 * Test button interactions
 */
async function testButtonInteraction(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        type: 'interactive',
        interactive: {
          type: 'button_reply',
          button_reply: {
            id: 'help',
            title: 'Help',
          },
        },
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Button interaction failed');
    }

    return {
      name: 'Button Interaction',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: 'Button Interaction',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test profile update (send new numbers)
 */
async function testProfileUpdate(supabase: any, userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Send new profile data
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '30 175 70',
      }),
    });

    const result = await response.json();
    if (!result.success) throw new Error('Update failed');

    // Wait for database update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify update
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .single();

    const { data: profile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile.age !== 30 || profile.height !== 175 || profile.weight !== 70) {
      throw new Error('Profile not updated correctly');
    }

    return {
      name: 'Profile Update',
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
      name: 'Profile Update',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test command during setup flow
 */
async function testCommandDuringSetup(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // This should work - commands should interrupt setup
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
      throw new Error('Command during setup failed');
    }

    return {
      name: 'Command During Setup',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: 'Command During Setup',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test concurrent messages
 */
async function testConcurrentMessages(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Send 3 messages concurrently
    const promises = [
      fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userId, text: '/help' }),
      }),
      fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userId, text: '/profile' }),
      }),
      fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userId, text: '/stats' }),
      }),
    ];

    const results = await Promise.all(promises);
    const allSuccess = results.every(r => r.ok);

    if (!allSuccess) {
      throw new Error('Some concurrent messages failed');
    }

    return {
      name: 'Concurrent Messages',
      status: 'pass',
      duration: Date.now() - start,
      details: { messageCount: 3 },
    };
  } catch (error) {
    return {
      name: 'Concurrent Messages',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test response time
 */
async function testResponseTime(userId: string): Promise<TestResult> {
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

    const duration = Date.now() - start;
    const result = await response.json();

    if (!result.success) {
      throw new Error('Response time test failed');
    }

    // Response should be under 3 seconds
    if (duration > 3000) {
      throw new Error(`Response too slow: ${duration}ms`);
    }

    return {
      name: 'Response Time',
      status: 'pass',
      duration: Date.now() - start,
      details: { responseTime: duration },
    };
  } catch (error) {
    return {
      name: 'Response Time',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test database consistency
 */
async function testDatabaseConsistency(supabase: any, userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check foreign key relationship
    if (profile.user_id !== user.id) {
      throw new Error('Foreign key mismatch');
    }

    return {
      name: 'Database Consistency',
      status: 'pass',
      duration: Date.now() - start,
      details: {
        userId: user.id,
        profileUserId: profile.user_id,
        match: true,
      },
    };
  } catch (error) {
    return {
      name: 'Database Consistency',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test error recovery
 */
async function testErrorRecovery(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Send invalid data multiple times
    const tests = [
      '999 999 999', // All invalid
      'abc def ghi', // Non-numeric
      '25', // Incomplete
    ];

    for (const text of tests) {
      const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userId, text }),
      });

      const result = await response.json();
      
      // Should handle gracefully without crashing
      if (!result.success) {
        throw new Error('Error recovery failed');
      }
    }

    return {
      name: 'Error Recovery',
      status: 'pass',
      duration: Date.now() - start,
      details: { tests: tests.length },
    };
  } catch (error) {
    return {
      name: 'Error Recovery',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test language detection
 */
async function testLanguageDetection(userId: string): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test Chinese command
    const response = await fetch(`${env.NEXT_PUBLIC_APP_URL || 'https://vita-whatsapp.vercel.app'}/api/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: userId,
        text: '帮助',
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error('Language detection failed');
    }

    return {
      name: 'Language Detection',
      status: 'pass',
      duration: Date.now() - start,
      details: { logs: result.logs.length },
    };
  } catch (error) {
    return {
      name: 'Language Detection',
      status: 'fail',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Advanced Test Suite for WhatsApp Bot',
    tests: [
      '1. Button Interaction',
      '2. Profile Update',
      '3. Command During Setup',
      '4. Concurrent Messages',
      '5. Response Time',
      '6. Database Consistency',
      '7. Error Recovery',
      '8. Language Detection',
    ],
  });
}
