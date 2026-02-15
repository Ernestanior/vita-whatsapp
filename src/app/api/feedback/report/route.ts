// @ts-nocheck
/**
 * API: 生成反馈改进报告
 * GET /api/feedback/report?startDate=2024-01-01&endDate=2024-01-31
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackManager } from '@/lib/feedback/feedback-manager';
import { logger } from '@/lib/logging';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // 默认为上个月
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth(), 0);

    const startDate = startDateStr ? new Date(startDateStr) : defaultStartDate;
    const endDate = endDateStr ? new Date(endDateStr) : defaultEndDate;

    const feedbackManager = getFeedbackManager();
    const report = await feedbackManager.generateImprovementReport(startDate, endDate);

    logger.info('Feedback report generated', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return NextResponse.json(report);
  } catch (error) {
    logger.error('Error in feedback report API', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
