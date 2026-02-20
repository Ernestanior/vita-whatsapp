import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getContextManager } from '@/lib/context/context-manager';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

    try {
      const contextManager = getContextManager();
      const whatsapp = new WhatsAppClient();

      // Get current date for checking recorded meals
      const today = new Date().toISOString().split('T')[0];

      // 1. Get all active users
      const { data: users, error } = await supabase
        .from('users')
        .select('id, phone_number, language');

      if (error) throw error;

      let remindersSent = 0;

      // 2. Check each user for meal reminders
      for (const user of users) {
        // Optimization: Get recorded meals for today to avoid redundant checks in ContextManager
        const { data: records } = await supabase
          .from('food_records')
          .select('meal_context')
          .eq('user_id', user.id)
          .gte('created_at', today);
        
        const recordedScenes = new Set(records?.map(r => r.meal_context) || []);

        const reminder = await contextManager.checkMealReminder(user.id, recordedScenes);
        
        if (reminder.shouldRemind && reminder.message) {
        // Localize message if needed (simplified here)
        let message = reminder.message;
        if (user.language === 'zh-CN') {
          message = reminder.mealType === 'lunch' 
            ? "还没记录您的午餐吗？别忘了追踪您的饮食哦！" 
            : "还没记录您的晚餐吗？记得追踪您的饮食！";
        }

        await whatsapp.sendTextMessage(user.phone_number, message);
        remindersSent++;
        
        logger.info({ msg: 'Meal reminder sent', userId: user.id, mealType: reminder.mealType });
      }
    }

    return NextResponse.json({ 
      success: true, 
      remindersSent,
      processedUsers: users.length 
    });
  } catch (error) {
    logger.error({ msg: 'Error in meal-reminder cron', error: String(error) });
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
