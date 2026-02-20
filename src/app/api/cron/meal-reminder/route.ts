import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getContextManager } from '@/lib/context/context-manager';
import { WhatsAppClient } from '@/lib/whatsapp/client';
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
    const contextManager = getContextManager();
    const whatsapp = new WhatsAppClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone_number, language');

    if (error) throw error;

    let remindersSent = 0;

    for (const user of users) {
      const { data: records } = await supabase
        .from('food_records')
        .select('meal_context')
        .eq('user_id', user.id)
        .gte('created_at', today);

      const recordedScenes = new Set(records?.map(r => r.meal_context) || []);
      const reminder = await contextManager.checkMealReminder(user.id, recordedScenes);

      if (reminder.shouldRemind && reminder.message) {
        let message = reminder.message;
        if (user.language === 'zh-CN' || user.language === 'zh-TW') {
          const mealNames: Record<string, string> = {
            breakfast: '早餐', lunch: '午餐', dinner: '晚餐',
          };
          const mealName = mealNames[reminder.mealType || 'lunch'] || '用餐';
          message = `快到${mealName}时间了！记得拍照记录哦 📸`;
        }

        await whatsapp.sendTextMessage(user.phone_number, message);
        remindersSent++;
        logger.info({ msg: 'Meal reminder sent', userId: user.id, mealType: reminder.mealType });
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      processedUsers: users.length,
    });
  } catch (error) {
    logger.error({ msg: 'Error in meal-reminder cron', error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
