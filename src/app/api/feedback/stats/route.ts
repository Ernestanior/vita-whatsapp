// @ts-nocheck
/**
 * API: 获取用户反馈统计
 * GET /api/feedback/stats?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackManager } from '@/lib/feedback/feedback-manager';
import { logger } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const feedbackManager = getFeedbackManager();
    const stats = await feedbackManager.getUserFeedbackStats(userId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to get feedback stats' },
        { status: 500 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Error in feedback stats API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
