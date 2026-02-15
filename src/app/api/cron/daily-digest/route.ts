/**
 * Daily Digest Cron Job
 * 
 * Runs daily at 21:00 SGT (13:00 UTC) to send health summaries to all users
 * 
 * Requirements: 6.1, 6.8
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dailyDigestGenerator } from '@/lib/digest';
import { whatsappClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';

/**
 * Verify cron secret to prevent unauthorized access
 */
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * GET handler for Vercel Cron
 * Requirements: 6.1, 6.8
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  logger.info({ type: 'cron_started', job: 'daily-digest' }, 'Daily digest cron job started');

  try {
    // 1. Verify cron secret
    if (!verifyCronSecret(request)) {
      logger.error({ type: 'cron_unauthorized' }, 'Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get yesterday's date (since cron runs at 21:00, we want today's data)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    logger.info({ date: dateStr }, 'Processing daily digests for date');

    // 3. Get all active users with profiles
    const users = await getActiveUsers();

    logger.info({ userCount: users.length }, 'Found active users');

    // 4. Process each user
    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const user of users) {
      try {
        // Check if user has custom digest time
        const digestTime = user.digest_time || '21:00:00';
        const currentHour = today.getHours();
        const digestHour = parseInt(digestTime.split(':')[0]);

        // Skip if not the user's digest time (allow 1 hour window)
        if (Math.abs(currentHour - digestHour) > 1) {
          results.skipped++;
          continue;
        }

        // Generate digest
        const digest = await dailyDigestGenerator.generateDigest(user.user_id, dateStr);

        // Skip if no meals recorded
        if (digest.summary.mealsCount === 0) {
          results.skipped++;
          logger.info({ userId: user.user_id }, 'Skipped user with no meals');
          continue;
        }

        // Format message in user's language
        const message = dailyDigestGenerator.formatDigestMessage(
          digest,
          user.language as 'en' | 'zh-CN' | 'zh-TW'
        );

        // Send via WhatsApp
        await whatsappClient.sendTextMessage(user.phone_number, message);

        results.success++;

        logger.info(
          {
            userId: user.user_id,
            mealsCount: digest.summary.mealsCount,
            healthScore: digest.summary.healthScore,
          },
          'Daily digest sent successfully'
        );

        // Add small delay to avoid rate limiting
        await sleep(100);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          userId: user.user_id,
          error: errorMessage,
        });

        logger.error(
          {
            error,
            userId: user.user_id,
          },
          'Failed to send daily digest to user'
        );
      }
    }

    const duration = Date.now() - startTime;

    logger.info(
      {
        type: 'cron_completed',
        job: 'daily-digest',
        duration,
        results,
      },
      'Daily digest cron job completed'
    );

    return NextResponse.json({
      success: true,
      date: dateStr,
      duration,
      results,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      {
        type: 'cron_failed',
        job: 'daily-digest',
        error,
        duration,
      },
      'Daily digest cron job failed'
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * Get all active users with health profiles
 */
async function getActiveUsers(): Promise<
  Array<{
    user_id: string;
    phone_number: string;
    language: string;
    digest_time: string;
  }>
> {
  const supabase: any = await createClient();

  // Get users who have health profiles (indicates they've completed setup)
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      phone_number,
      language,
      health_profiles!inner (
        digest_time
      )
    `
    )
    .order('id');

  if (error) {
    throw new Error(`Failed to fetch active users: ${error.message}`);
  }

  // Transform the data
  return (data || []).map((user: any) => ({
    user_id: user.id,
    phone_number: user.phone_number,
    language: user.language,
    digest_time: user.health_profiles?.digest_time || '21:00:00',
  }));
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * POST handler (for manual testing)
 */
export async function POST(request: NextRequest) {
  // Allow manual triggering with proper authentication
  return GET(request);
}
