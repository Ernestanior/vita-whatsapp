import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whatsappClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    for (const user of users) {
      // 1. Fetch weekly data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: records } = await supabase
        .from('food_records')
        .select('calories, rating, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!records || records.length === 0) continue;

      // 2. Generate summary text (In a real app, we would generate an image here)
      // For now, we simulate the "Weekly Trend" as a rich text message
      const avgCalories = Math.round(records.reduce((sum, r) => sum + r.calories, 0) / records.length);
      const greenCount = records.filter(r => r.rating === 'green').length;
      
      const messages = {
        'en': `📈 *Your Weekly Trend is Ready!*

🔥 Avg Calories: ${avgCalories} kcal/meal
✅ Healthy Choices: ${greenCount}/${records.length} meals

You're doing great! Keep up the momentum! 💪`,
        'zh-CN': `📈 *您的每周趋势报告已生成！*

🔥 平均摄入：${avgCalories} kcal/餐
✅ 健康选择：${greenCount}/${records.length} 餐

表现很棒！继续保持哦！💪`
      };

      await whatsappClient.sendTextMessage(user.phone_number, messages[user.language] || messages['en']);
      
      // Note: To send a real image, we would:
      // 1. Use a library like canvas or a charting API (e.g., QuickChart) to generate an image buffer.
      // 2. Upload to WhatsApp media API.
      // 3. Send via whatsappClient.sendImage.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ msg: 'Error in weekly-trend cron', error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
