/**
 * Diagnose WhatsApp Integration
 * Checks all components and identifies issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: [],
  };

  const addCheck = (name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) => {
    results.checks.push({ name, status, message, details });
  };

  try {
    // Check 1: Environment Variables
    addCheck(
      'Environment Variables',
      env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID ? 'pass' : 'fail',
      env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID 
        ? 'All required environment variables are set'
        : 'Missing required environment variables',
      {
        hasToken: !!env.WHATSAPP_TOKEN,
        hasPhoneNumberId: !!env.WHATSAPP_PHONE_NUMBER_ID,
        hasVerifyToken: !!env.WHATSAPP_VERIFY_TOKEN,
        hasAppSecret: !!env.WHATSAPP_APP_SECRET,
      }
    );

    // Check 2: Webhook Endpoint
    try {
      const webhookUrl = `${env.NEXT_PUBLIC_URL || 'https://vita-whatsapp.vercel.app'}/api/webhook`;
      const verifyUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=test123`;
      
      const response = await fetch(verifyUrl);
      const text = await response.text();
      
      addCheck(
        'Webhook Verification',
        text === 'test123' ? 'pass' : 'fail',
        text === 'test123' 
          ? 'Webhook verification endpoint is working'
          : 'Webhook verification failed',
        {
          webhookUrl,
          expectedResponse: 'test123',
          actualResponse: text,
        }
      );
    } catch (error) {
      addCheck(
        'Webhook Verification',
        'fail',
        'Failed to test webhook endpoint',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Check 3: WhatsApp API Connection
    try {
      const apiUrl = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
        },
      });

      addCheck(
        'WhatsApp API Connection',
        response.ok ? 'pass' : 'fail',
        response.ok 
          ? 'Successfully connected to WhatsApp API'
          : `Failed to connect: ${response.statusText}`,
        {
          status: response.status,
          statusText: response.statusText,
        }
      );
    } catch (error) {
      addCheck(
        'WhatsApp API Connection',
        'fail',
        'Failed to connect to WhatsApp API',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Check 4: OpenAI API
    addCheck(
      'OpenAI API Key',
      env.OPENAI_API_KEY ? 'pass' : 'fail',
      env.OPENAI_API_KEY 
        ? 'OpenAI API key is configured'
        : 'OpenAI API key is missing',
      {
        hasKey: !!env.OPENAI_API_KEY,
        keyPrefix: env.OPENAI_API_KEY?.substring(0, 10) + '...',
      }
    );

    // Check 5: Database Connection
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { error } = await supabase.from('users').select('count').limit(1);
      
      addCheck(
        'Database Connection',
        !error ? 'pass' : 'fail',
        !error 
          ? 'Successfully connected to database'
          : `Database error: ${error.message}`,
        { error: error?.message }
      );
    } catch (error) {
      addCheck(
        'Database Connection',
        'fail',
        'Failed to connect to database',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Check 6: Recent Webhook Activity
    try {
      const logsResponse = await fetch(`${env.NEXT_PUBLIC_URL || 'https://vita-whatsapp.vercel.app'}/api/debug-logs`);
      const logsData = await logsResponse.json();
      
      addCheck(
        'Recent Webhook Activity',
        logsData.count > 0 ? 'pass' : 'warning',
        logsData.count > 0 
          ? `Found ${logsData.count} recent webhook events`
          : 'No recent webhook activity detected',
        {
          count: logsData.count,
          recentLogs: logsData.logs?.slice(0, 3),
        }
      );
    } catch (error) {
      addCheck(
        'Recent Webhook Activity',
        'warning',
        'Could not check recent activity',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Summary
    const passed = results.checks.filter((c: any) => c.status === 'pass').length;
    const failed = results.checks.filter((c: any) => c.status === 'fail').length;
    const warnings = results.checks.filter((c: any) => c.status === 'warning').length;

    results.summary = {
      total: results.checks.length,
      passed,
      failed,
      warnings,
      status: failed === 0 ? (warnings === 0 ? 'healthy' : 'warning') : 'error',
    };

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
