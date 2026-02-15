/**
 * Dashboard Main Page
 * 
 * Displays:
 * - Statistics overview
 * - Nutrition trends
 * - Food history list
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  today: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealsCount: number;
    ratings: {
      green: number;
      yellow: number;
      red: number;
    };
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  week: {
    totalMeals: number;
    avgMealsPerDay: number;
  };
  subscription: {
    tier: string;
    status: string;
  };
  quota: {
    used: number;
    limit: number;
  };
}

interface FoodRecord {
  id: string;
  imageUrl: string;
  foods: Array<{
    name: string;
    nameLocal: string;
    portion: string;
  }>;
  totalCalories: number;
  rating: 'green' | 'yellow' | 'red';
  score: number;
  mealContext: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<FoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      router.push('/login');
      return;
    }

    fetchData(sessionToken);
  }, [router]);

  const fetchData = async (sessionToken: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch stats');
      }

      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch history
      const historyResponse = await fetch('/api/dashboard/history?limit=5', {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!historyResponse.ok) {
        throw new Error('Failed to fetch history');
      }

      const historyData = await historyResponse.json();
      if (historyData.success) {
        setHistory(historyData.data.records);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        alert('Please login first');
        return;
      }

      const response = await fetch(`/api/dashboard/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vita-ai-export-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'html'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const caloriesPercent = (stats.today.calories / stats.targets.calories) * 100;
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'green':
        return 'bg-green-100 text-green-800';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800';
      case 'red':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'red':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vita AI Dashboard</h1>
              <p className="text-sm text-gray-600">
                {stats.subscription.tier.charAt(0).toUpperCase() + stats.subscription.tier.slice(1)} Plan
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Calories */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Today's Calories</h3>
              <span className="text-2xl">🔥</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.today.calories}
            </p>
            <p className="text-sm text-gray-500">
              Target: {stats.targets.calories} cal
            </p>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  caloriesPercent > 100 ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(caloriesPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Meals Today */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Meals Today</h3>
              <span className="text-2xl">🍽️</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.today.mealsCount}
            </p>
            <p className="text-sm text-gray-500">
              Weekly avg: {stats.week.avgMealsPerDay}
            </p>
          </div>

          {/* Health Score */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Health Score</h3>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl">{getRatingEmoji(stats.today.ratings.green > 0 ? 'green' : stats.today.ratings.yellow > 0 ? 'yellow' : 'red')}</span>
              <p className="text-sm text-gray-500">
                {stats.today.ratings.green}G / {stats.today.ratings.yellow}Y / {stats.today.ratings.red}R
              </p>
            </div>
          </div>

          {/* Quota */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Daily Quota</h3>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats.subscription.tier === 'free' ? `${stats.quota.used}/${stats.quota.limit}` : '∞'}
            </p>
            <p className="text-sm text-gray-500">
              {stats.subscription.tier === 'free' ? 'Free tier' : 'Unlimited'}
            </p>
          </div>
        </div>

        {/* Nutrition Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Nutrition</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Protein */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Protein</span>
                <span className="text-sm text-gray-900">
                  {stats.today.protein}g / {stats.targets.protein}g
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.today.protein / stats.targets.protein) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Carbs */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Carbs</span>
                <span className="text-sm text-gray-900">
                  {stats.today.carbs}g / {stats.targets.carbs}g
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.today.carbs / stats.targets.carbs) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Fat */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Fat</span>
                <span className="text-sm text-gray-900">
                  {stats.today.fat}g / {stats.targets.fat}g
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min((stats.today.fat / stats.targets.fat) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Meals</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Export PDF
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {history.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No meals recorded yet. Start by sending a food photo to Vita AI on WhatsApp!
              </div>
            ) : (
              history.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* Image */}
                    <img
                      src={record.imageUrl}
                      alt="Food"
                      className="w-20 h-20 rounded-lg object-cover"
                    />

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {record.foods.map((f) => f.nameLocal || f.name).join(', ')}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(record.createdAt).toLocaleString()} • {record.mealContext}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRatingColor(
                            record.rating
                          )}`}
                        >
                          {getRatingEmoji(record.rating)} {record.rating.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">
                        {record.totalCalories} calories
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
