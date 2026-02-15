/**
 * Cost Monitoring Dashboard
 * 
 * Displays:
 * - API call volume and costs
 * - Cache hit rate
 * - Budget status
 * - Model usage breakdown
 * - Daily trends
 */

'use client';

import { useEffect, useState } from 'react';

interface MonitoringMetrics {
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalCalls: number;
    totalCost: number;
    avgCostPerCall: number;
    avgCacheHitRate: number;
  };
  budgetStatus: {
    dailyBudget: number;
    currentSpend: number;
    remaining: number;
    percentUsed: number;
    exceeded: boolean;
  };
  cacheMetrics: {
    hits: number;
    misses: number;
    errors: number;
    hitRate: number;
  };
  modelBreakdown: Record<string, { calls: number; cost: number }>;
  dailyMetrics: Array<{
    date: string;
    calls: number;
    cost: number;
    cacheHitRate: number;
    uniqueUsers: number;
  }>;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/monitoring/metrics?days=${days}`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Failed to fetch metrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Cost Monitoring Dashboard</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Cost Monitoring Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error || 'Failed to load metrics'}</p>
            <button
              onClick={fetchMetrics}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cost Monitoring Dashboard</h1>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded ${
                  days === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total API Calls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total API Calls</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.summary.totalCalls.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${metrics.summary.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: ${metrics.summary.avgCostPerCall.toFixed(4)}/call
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          {/* Cache Hit Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metrics.cacheMetrics.hitRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.cacheMetrics.hits} hits / {metrics.cacheMetrics.misses} misses
                </p>
              </div>
              <div className="text-4xl">⚡</div>
            </div>
          </div>

          {/* Budget Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Budget</p>
                <p className={`text-3xl font-bold mt-2 ${
                  metrics.budgetStatus.exceeded ? 'text-red-600' : 'text-green-600'
                }`}>
                  ${metrics.budgetStatus.remaining.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.budgetStatus.percentUsed.toFixed(1)}% used
                </p>
              </div>
              <div className="text-4xl">
                {metrics.budgetStatus.exceeded ? '🚨' : '✅'}
              </div>
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Budget Status</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Spent: ${metrics.budgetStatus.currentSpend.toFixed(2)}</span>
              <span>Budget: ${metrics.budgetStatus.dailyBudget.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  metrics.budgetStatus.exceeded
                    ? 'bg-red-600'
                    : metrics.budgetStatus.percentUsed > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(metrics.budgetStatus.percentUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Model Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Usage Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(metrics.modelBreakdown).map(([model, stats]) => (
              <div key={model} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{model}</span>
                  <span className="text-sm text-gray-600">
                    {stats.calls.toLocaleString()} calls
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Cost: ${stats.cost.toFixed(2)}</span>
                  <span>Avg: ${(stats.cost / stats.calls).toFixed(4)}/call</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Metrics Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Daily Metrics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    API Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cache Hit Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unique Users
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.dailyMetrics.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {day.calls.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      ${day.cost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        day.cacheHitRate >= 50
                          ? 'bg-green-100 text-green-800'
                          : day.cacheHitRate >= 30
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {day.cacheHitRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {day.uniqueUsers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
