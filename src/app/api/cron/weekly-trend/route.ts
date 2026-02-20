import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase environment variables');
    return new NextResponse('Configuration Error', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone_number, language');

    if (error) throw error;

    let sent = 0;

    for (const user of users) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: records } = await supabase
        .from('food_records')
        .select('recognition_result, health_rating, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!records || records.length === 0) continue;

      // Calculate stats from JSONB data
      let totalCal = 0, totalProtein = 0, greenCount = 0, yellowCount = 0, redCount = 0;
      const dailyCals: Record<string, number> = {};

      for (const r of records) {
        const result = r.recognition_result as any;
        const rating = r.health_rating as any;
        const cal = Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);
        totalCal += cal;
        totalProtein += Math.round((result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2);

        if (rating.overall === 'green') greenCount++;
        else if (rating.overall === 'yellow') yellowCount++;
        else redCount++;

        const day = new Date(r.created_at).toLocaleDateString('en', { weekday: 'short' });
        dailyCals[day] = (dailyCals[day] || 0) + cal;
      }

      const avgCal = Math.round(totalCal / records.length);
      const avgProtein = Math.round(totalProtein / records.length);
      const healthRate = Math.round((greenCount / records.length) * 100);

      // Simple bar chart using text
      const maxDayCal = Math.max(...Object.values(dailyCals), 1);
      const barChart = Object.entries(dailyCals)
        .map(([day, cal]) => {
          const bars = '█'.repeat(Math.round((cal / maxDayCal) * 8));
          return `${day} ${bars} ${cal}`;
        })
        .join('\n');

      // Get streak
      const { data: streak } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      const streakText = streak?.current_streak ? `🔥 ${streak.current_streak} day streak` : '';

      const isZh = user.language === 'zh-CN' || user.language === 'zh-TW';

      // Generate chart image via QuickChart.io
      const chartConfig = {
        type: 'bar',
        data: {
          labels: Object.keys(dailyCals),
          datasets: [{
            label: 'kcal',
            data: Object.values(dailyCals),
            backgroundColor: Object.values(dailyCals).map(cal =>
              cal > 2500 ? '#ef4444' : cal > 1800 ? '#eab308' : '#22c55e'
            ),
          }],
        },
        options: {
          plugins: {
            title: { display: true, text: isZh ? '本周每日热量' : 'Weekly Calories', fontSize: 16 },
            legend: { display: false },
          },
          scales: { y: { beginAtZero: true, title: { display: true, text: 'kcal' } } },
        },
      };

      const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=300&bkg=white`;

      // Try to send chart image, fall back to text-only
      try {
        const caption = isZh
          ? `📊 本周报告 · ${records.length}餐 · 平均${avgCal}kcal · 健康率${healthRate}%${streakText ? ' · ' + streakText : ''}`
          : `📊 Weekly · ${records.length} meals · Avg ${avgCal}kcal · ${healthRate}% healthy${streakText ? ' · ' + streakText : ''}`;

        await whatsappClient.sendImageMessage(user.phone_number, chartUrl, caption);
      } catch {
        // Fallback: send text report
        const message = isZh
          ? `📊 *本周饮食报告*\n\n${barChart}\n\n📈 共 ${records.length} 餐 · 平均 ${avgCal} kcal/餐\n🥩 平均蛋白质 ${avgProtein}g/餐\n🟢 ${greenCount} 🟡 ${yellowCount} 🔴 ${redCount} · 健康率 ${healthRate}%\n${streakText}`
          : `📊 *Weekly Report*\n\n${barChart}\n\n📈 ${records.length} meals · Avg ${avgCal} kcal/meal\n🥩 Avg protein ${avgProtein}g/meal\n🟢 ${greenCount} 🟡 ${yellowCount} 🔴 ${redCount} · ${healthRate}% healthy\n${streakText}`;
        await whatsappClient.sendTextMessage(user.phone_number, message.trim());
      }

      sent++;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    logger.error({ msg: 'Error in weekly-trend cron', error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
