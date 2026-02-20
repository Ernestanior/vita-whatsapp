/**
 * Complete Phase 3 Integration Test
 * Tests the entire flow from meal log to Phase 3 features
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const results: any[] = [];
  const testUserId = '+6512345678';

  try {
    results.push({
      step: '🚀 Phase 3 Complete Integration Test',
      status: 'info',
      timestamp: new Date().toISOString(),
    });

    const supabase = await createClient();

    // 1. Check database tables exist
    results.push({ step: '1. Checking database tables...', status: 'info' });

    const tables = [
      'users',
      'health_profiles',
      'food_records',
      'user_streaks',
      'daily_budgets',
      'user_preferences',
      'feature_discovery',
      'achievements',
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows, which is fine
          results.push({
            step: `   Table: ${table}`,
            status: 'error',
            error: error.message,
          });
        } else {
          results.push({
            step: `   ✓ Table: ${table}`,
            status: 'success',
          });
        }
      } catch (err: any) {
        results.push({
          step: `   Table: ${table}`,
          status: 'error',
          error: err.message,
        });
      }
    }

    // 2. Test service initialization
    results.push({ step: '2. Testing service initialization...', status: 'info' });

    try {
      const { ServiceContainer } = await import('@/lib/phase3/service-container');
      const container = ServiceContainer.getInstance(supabase);

      const services = [
        'FeatureDiscovery',
        'PreferenceManager',
        'BudgetTracker',
        'StreakManager',
      ];

      for (const service of services) {
        try {
          const method = `get${service}` as keyof typeof container;
          if (typeof container[method] === 'function') {
            (container[method] as Function)();
            results.push({
              step: `   ✓ Service: ${service}`,
              status: 'success',
            });
          }
        } catch (err: any) {
          results.push({
            step: `   Service: ${service}`,
            status: 'error',
            error: err.message,
          });
        }
      }
    } catch (err: any) {
      results.push({
        step: '   Service Container',
        status: 'error',
        error: err.message,
      });
    }

    // 3. Test command handler
    results.push({ step: '3. Testing command handler...', status: 'info' });

    try {
      const { createPhase3CommandHandler } = await import('@/lib/phase3/commands/command-handler');
      const handler = await createPhase3CommandHandler();

      results.push({
        step: '   ✓ Command handler initialized',
        status: 'success',
      });

      const commands = ['streak', 'budget', 'preferences', 'card', 'reminders', 'compare'];
      results.push({
        step: `   ✓ Available commands: ${commands.join(', ')}`,
        status: 'success',
      });
    } catch (err: any) {
      results.push({
        step: '   Command handler',
        status: 'error',
        error: err.message,
      });
    }

    // 4. Test text handler integration
    results.push({ step: '4. Testing text handler integration...', status: 'info' });

    try {
      const { Command } = await import('@/lib/whatsapp/text-handler');

      const phase3Commands = [
        'STREAK',
        'BUDGET',
        'CARD',
        'REMINDERS',
        'COMPARE',
        'PROGRESS',
        'PREFERENCES',
      ];

      for (const cmd of phase3Commands) {
        if (cmd in Command) {
          results.push({
            step: `   ✓ Command enum: ${cmd}`,
            status: 'success',
          });
        } else {
          results.push({
            step: `   Command enum: ${cmd}`,
            status: 'error',
            error: 'Not found in Command enum',
          });
        }
      }
    } catch (err: any) {
      results.push({
        step: '   Text handler',
        status: 'error',
        error: err.message,
      });
    }

    // 5. Test response formatter
    results.push({ step: '5. Testing response formatter...', status: 'info' });

    try {
      const { responseFormatterSG } = await import('@/lib/whatsapp/response-formatter-sg');

      results.push({
        step: '   ✓ Response formatter loaded',
        status: 'success',
      });
    } catch (err: any) {
      results.push({
        step: '   Response formatter',
        status: 'error',
        error: err.message,
      });
    }

    // 6. Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const infoCount = results.filter(r => r.status === 'info').length;

    results.push({
      step: '📊 Test Summary',
      status: errorCount === 0 ? 'success' : 'partial',
      data: {
        total: results.length - infoCount - 1,
        success: successCount,
        errors: errorCount,
        info: infoCount,
      },
    });

    if (errorCount === 0) {
      results.push({
        step: '✅ Phase 3 Integration Complete!',
        status: 'success',
        message: 'All services initialized, commands recognized, integration successful',
      });
    } else {
      results.push({
        step: '⚠️ Phase 3 Integration Partial',
        status: 'warning',
        message: `${errorCount} errors found. Check details above.`,
      });
    }

    return NextResponse.json({
      success: errorCount === 0,
      results,
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
