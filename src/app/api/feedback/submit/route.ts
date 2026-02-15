// @ts-nocheck
/**
 * API: 提交用户反馈
 * POST /api/feedback/submit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackManager } from '@/lib/feedback/feedback-manager';
import { logger } from '@/lib/logging';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, foodRecordId, feedbackType, rating, comment, metadata } = body;

    // 验证必需字段
    if (!userId || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 提交反馈
    const feedbackManager = getFeedbackManager();
    const result = await feedbackManager.submitFeedback({
      userId,
      foodRecordId,
      feedbackType,
      rating,
      comment,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    logger.info('Feedback submitted via API', {
      feedbackId: result.feedbackId,
      userId,
      feedbackType,
    });

    return NextResponse.json({
      success: true,
      feedbackId: result.feedbackId,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    logger.error('Error in feedback submit API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
