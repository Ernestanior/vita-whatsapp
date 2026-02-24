/**
 * Weekly Report Generator
 * Shared module for generating weekly nutrition report cards.
 * Used by both cron job and on-demand user requests.
 */

import { logger } from '@/utils/logger';

// ── Types ──────────────────────────────────────────────
export interface WeeklyReportData {
  totalMeals: number;
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  dailyData: Record<string, { cal: number; protein: number; carbs: number }>;
  daysWithData: number;
  streak: number;
  proteinTarget: number;
  carbTarget: number;
}

const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  return WEEKDAYS_EN[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

// ── Data Aggregation ───────────────────────────────────
export async function fetchWeeklyData(supabase: any, userId: string): Promise<WeeklyReportData | null> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: records } = await supabase
    .from('food_records')
    .select('recognition_result, health_rating, created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString());

  if (!records || records.length === 0) return null;

  let totalCal = 0, totalProtein = 0, totalCarbs = 0;
  let greenCount = 0, yellowCount = 0, redCount = 0;
  const daily: Record<string, { cal: number; protein: number; carbs: number }> = {};

  for (const r of records) {
    const result = r.recognition_result as any;
    const rating = r.health_rating as any;
    const cal = Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);
    const protein = Math.round((result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2);
    const carbs = Math.round((result.totalNutrition.carbs.min + result.totalNutrition.carbs.max) / 2);

    totalCal += cal;
    totalProtein += protein;
    totalCarbs += carbs;

    if (rating.overall === 'green') greenCount++;
    else if (rating.overall === 'yellow') yellowCount++;
    else redCount++;

    const day = getDayKey(r.created_at);
    if (!daily[day]) daily[day] = { cal: 0, protein: 0, carbs: 0 };
    daily[day].cal += cal;
    daily[day].protein += protein;
    daily[day].carbs += carbs;
  }

  // Get profile for macro targets
  const { data: profile } = await supabase
    .from('health_profiles')
    .select('weight, protein_target, carb_target, training_type, goal')
    .eq('user_id', userId)
    .maybeSingle();

  const w = profile?.weight || 70;
  const proteinTarget = profile?.protein_target || Math.round(w * (profile?.goal === 'gain-muscle' ? 2.0 : 1.6));
  const carbTarget = profile?.carb_target || Math.round(w * (profile?.goal === 'lose-weight' ? 2.5 : 3.5));

  // Get streak
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();

  const daysWithData = WEEKDAYS_EN.filter(d => daily[d]).length || 1;

  return {
    totalMeals: records.length,
    totalCal, totalProtein, totalCarbs,
    greenCount, yellowCount, redCount,
    dailyData: daily,
    daysWithData,
    streak: streak?.current_streak || 0,
    proteinTarget, carbTarget,
  };
}

// ── Trend Chart URL (landscape, used by cron) ──────────
export function buildTrendChartUrl(data: WeeklyReportData, isZh: boolean): string {
  const labels = isZh ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const calData = WEEKDAYS_EN.map(d => data.dailyData[d]?.cal || 0);
  const proteinData = WEEKDAYS_EN.map(d => data.dailyData[d]?.protein || 0);
  const carbsData = WEEKDAYS_EN.map(d => data.dailyData[d]?.carbs || 0);

  const datasets: any[] = [
    {
      type: 'bar', label: 'kcal', data: calData,
      backgroundColor: calData.map(c => c > 2500 ? '#ef4444' : c > 1800 ? '#eab308' : '#22c55e'),
      yAxisID: 'yCal', order: 2,
    },
    {
      type: 'line', label: isZh ? '蛋白质(g)' : 'Protein(g)', data: proteinData,
      borderColor: '#3b82f6', backgroundColor: '#3b82f680', fill: false,
      tension: 0.3, pointRadius: 4, yAxisID: 'yMacro', order: 1,
    },
    {
      type: 'line', label: isZh ? '碳水(g)' : 'Carbs(g)', data: carbsData,
      borderColor: '#f59e0b', backgroundColor: '#f59e0b80', fill: false,
      tension: 0.3, pointRadius: 4, yAxisID: 'yMacro', order: 1,
    },
  ];

  if (data.proteinTarget > 0) {
    datasets.push({
      type: 'line', label: isZh ? '蛋白质目标' : 'P target',
      data: Array(7).fill(data.proteinTarget),
      borderColor: '#3b82f6', borderDash: [6, 3], pointRadius: 0, fill: false,
      yAxisID: 'yMacro', order: 0,
    });
  }
  if (data.carbTarget > 0) {
    datasets.push({
      type: 'line', label: isZh ? '碳水目标' : 'C target',
      data: Array(7).fill(data.carbTarget),
      borderColor: '#f59e0b', borderDash: [6, 3], pointRadius: 0, fill: false,
      yAxisID: 'yMacro', order: 0,
    });
  }

  const chartConfig = {
    type: 'bar',
    data: { labels, datasets },
    options: {
      plugins: {
        title: { display: true, text: isZh ? '本周宏量趋势' : 'Weekly Macro Trends', fontSize: 16 },
        legend: { position: 'bottom', labels: { boxWidth: 12, fontSize: 10 } },
      },
      scales: {
        yCal: { type: 'linear', position: 'left', beginAtZero: true, title: { display: true, text: 'kcal' }, grid: { drawOnChartArea: false } },
        yMacro: { type: 'linear', position: 'right', beginAtZero: true, title: { display: true, text: 'g' } },
      },
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=350&bkg=white`;
}

// ── Shareable Card Chart (portrait 400×600) ───────────
export function buildCardChartUrl(data: WeeklyReportData, isZh: boolean): string {
  const labels = isZh ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const proteinData = WEEKDAYS_EN.map(d => data.dailyData[d]?.protein || 0);
  const carbsData = WEEKDAYS_EN.map(d => data.dailyData[d]?.carbs || 0);
  const avgCal = Math.round(data.totalCal / data.totalMeals);
  const avgProtein = Math.round(data.totalProtein / data.daysWithData);
  const healthRate = Math.round((data.greenCount / data.totalMeals) * 100);
  const streakText = data.streak ? `🔥${data.streak}` : '';

  const title = isZh
    ? `📊 周报 · ${data.totalMeals}餐 · ${avgCal}kcal/餐 · ${healthRate}%健康 ${streakText}`
    : `📊 Week · ${data.totalMeals} meals · ${avgCal}kcal/meal · ${healthRate}% healthy ${streakText}`;

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: isZh ? '蛋白质(g)' : 'Protein(g)',
          data: proteinData,
          backgroundColor: '#3b82f6',
        },
        {
          label: isZh ? '碳水(g)' : 'Carbs(g)',
          data: carbsData,
          backgroundColor: '#f59e0b',
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: title, fontSize: 13, padding: 12 },
        legend: { position: 'bottom', labels: { boxWidth: 12, fontSize: 11 } },
        datalabels: { display: true, anchor: 'end', align: 'top', font: { size: 9 } },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'g' },
        },
      },
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=600&bkg=white`;
}

// ── Text Fallback ──────────────────────────────────────
export function buildTextReport(data: WeeklyReportData, isZh: boolean): string {
  const avgCal = Math.round(data.totalCal / data.totalMeals);
  const avgProtein = Math.round(data.totalProtein / data.daysWithData);
  const avgCarbs = Math.round(data.totalCarbs / data.daysWithData);
  const healthRate = Math.round((data.greenCount / data.totalMeals) * 100);
  const streakText = data.streak ? `🔥${data.streak}` : '';

  const maxCal = Math.max(...WEEKDAYS_EN.map(d => data.dailyData[d]?.cal || 0), 1);
  const barChart = WEEKDAYS_EN
    .filter(d => data.dailyData[d])
    .map(d => {
      const m = data.dailyData[d];
      const bars = '█'.repeat(Math.round((m.cal / maxCal) * 8));
      return `${d} ${bars} ${m.cal}kcal P${m.protein}g C${m.carbs}g`;
    })
    .join('\n');

  return isZh
    ? `📊 *本周宏量报告*\n\n${barChart}\n\n📈 ${data.totalMeals}餐 · 平均${avgCal}kcal\n💪 日均蛋白质 ${avgProtein}g · 碳水 ${avgCarbs}g\n🟢${data.greenCount} 🟡${data.yellowCount} 🔴${data.redCount} · ${healthRate}%健康\n${streakText}`
    : `📊 *Weekly Macro Report*\n\n${barChart}\n\n📈 ${data.totalMeals} meals · Avg ${avgCal}kcal\n💪 Daily avg P${avgProtein}g · C${avgCarbs}g\n🟢${data.greenCount} 🟡${data.yellowCount} 🔴${data.redCount} · ${healthRate}% healthy\n${streakText}`;
}

// ── Caption for card image ─────────────────────────────
export function buildCardCaption(data: WeeklyReportData, isZh: boolean): string {
  const avgProtein = Math.round(data.totalProtein / data.daysWithData);
  const avgCarbs = Math.round(data.totalCarbs / data.daysWithData);
  const healthRate = Math.round((data.greenCount / data.totalMeals) * 100);
  const streakText = data.streak ? ` 🔥${data.streak}` : '';

  return isZh
    ? `📊 本周 · P${avgProtein}g · C${avgCarbs}g · ${healthRate}%健康${streakText}\n💡 截图分享给朋友，一起健康饮食！`
    : `📊 Weekly · P${avgProtein}g · C${avgCarbs}g · ${healthRate}% healthy${streakText}\n💡 Screenshot & share with friends!`;
}
