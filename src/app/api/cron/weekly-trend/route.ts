import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';
import { fetchWeeklyData, buildTrendChartUrl, buildTextReport } from '@/lib/weekly-report';

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
      try {
        const isZh = user.language === 'zh-CN' || user.language === 'zh-TW';
        const data = await fetchWeeklyData(supabase, user.id);
        if (!data) continue;

        const chartUrl = buildTrendChartUrl(data, isZh);
        const avgCal = Math.round(data.totalCal / data.totalMeals);
        const streakText = data.streak ? `🔥${data.streak}` : '';
        const avgP = Math.round(data.totalProtein / data.daysWithData);
        const avgC = Math.round(data.totalCarbs / data.daysWithData);
        const healthRate = Math.round((data.greenCount / data.totalMeals) * 100);

        const caption = isZh
          ? `📊 本周 · ${data.totalMeals}餐 · ${avgCal}kcal · P${avgP}g · C${avgC}g · ${healthRate}%健康 ${streakText}`
          : `📊 Weekly · ${data.totalMeals} meals · ${avgCal}kcal · P${avgP}g · C${avgC}g · ${healthRate}% healthy ${streakText}`;

        try {
          await whatsappClient.sendImageMessage(user.phone_number, chartUrl, caption.trim());
        } catch {
          const msg = buildTextReport(data, isZh);
          await whatsappClient.sendTextMessage(user.phone_number, msg.trim());
        }
        sent++;
      } catch (e) {
        logger.error({ msg: 'weekly-trend user error', userId: user.id, error: String(e) });
      }
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    logger.error({ msg: 'Error in weekly-trend cron', error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
