/**
 * API endpoint for cost monitoring metrics
 * GET /api/monitoring/metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { costMonitor } from '@/lib/cost';
import { cacheManager } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7', 10);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get metrics for date range
    const metrics = await costMonitor.getMetricsForRange(startDateStr, endDateStr);
    
    // Get current budget status
    const budgetStatus = await costMonitor.getBudgetStatus();
    
    // Get cache metrics
    const cacheMetrics = await cacheManager.getMetrics();
    
    // Calculate aggregated stats
    const totalCalls = metrics.reduce((sum, m) => sum + m.totalAPICalls, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);
    const avgCacheHitRate = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length
      : 0;
    
    // Model breakdown aggregation
    const modelBreakdown: Record<string, { calls: number; cost: number }> = {};
    for (const metric of metrics) {
      for (const [model, stats] of Object.entries(metric.modelBreakdown)) {
        if (!modelBreakdown[model]) {
          modelBreakdown[model] = { calls: 0, cost: 0 };
        }
        modelBreakdown[model].calls += stats.calls;
        modelBreakdown[model].cost += stats.cost;
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          start: startDateStr,
          end: endDateStr,
          days,
        },
        summary: {
          totalCalls,
          totalCost: parseFloat(totalCost.toFixed(2)),
          avgCostPerCall: totalCalls > 0 ? parseFloat((totalCost / totalCalls).toFixed(4)) : 0,
          avgCacheHitRate: parseFloat((avgCacheHitRate * 100).toFixed(1)),
        },
        budgetStatus,
        cacheMetrics: {
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses,
          errors: cacheMetrics.errors,
          hitRate: cacheMetrics.hits + cacheMetrics.misses > 0
            ? parseFloat(((cacheMetrics.hits / (cacheMetrics.hits + cacheMetrics.misses)) * 100).toFixed(1))
            : 0,
        },
        modelBreakdown,
        dailyMetrics: metrics.map(m => ({
          date: m.date,
          calls: m.totalAPICalls,
          cost: parseFloat(m.totalCost.toFixed(2)),
          cacheHitRate: parseFloat((m.cacheHitRate * 100).toFixed(1)),
          uniqueUsers: m.uniqueUsers,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch monitoring metrics',
      },
      { status: 500 }
    );
  }
}
