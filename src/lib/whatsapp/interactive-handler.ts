/**
 * InteractiveHandler - Handles interactive button replies
 * 
 * Handles quick reply buttons:
 * - Navigation buttons (start, help, profile, stats)
 * - Setup buttons (quick_setup, skip_setup)
 * - Food record buttons (record, modify, ignore)
 * 
 * Requirements: 17.1, 17.2
 */

import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { responseFormatterSG } from './response-formatter-sg';
import { createClient } from '@/lib/supabase/server';
import { TextHandler } from './text-handler';
import type { Message, MessageContext } from '@/types/whatsapp';

export class InteractiveHandler {
  private textHandler = new TextHandler();

  /**
   * Handle interactive button reply
   */
  async handle(message: Message, context: MessageContext): Promise<void> {
    try {
      if (!message.interactive?.button_reply) {
        logger.warn({
          type: 'invalid_interactive_message',
          messageId: message.id,
        });
        return;
      }

      const buttonId = message.interactive.button_reply.id;
      logger.info({
        type: 'interactive_button_clicked',
        userId: context.userId,
        buttonId,
      });

      // Handle navigation buttons
      if (['start', 'help', 'profile', 'stats', 'settings'].includes(buttonId)) {
        // Simulate command message
        const commandMessage: Message = {
          ...message,
          text: { body: `/${buttonId}` },
          type: 'text',
        };
        await this.textHandler.handle(commandMessage, context);
        return;
      }

      // Handle goal buttons (goal_1, goal_2, goal_3, goal_4)
      if (buttonId.startsWith('goal_')) {
        await this.handleGoalSelection(context, buttonId);
        return;
      }

      // Handle setup buttons
      if (buttonId === 'quick_setup') {
        await this.handleQuickSetup(context);
        return;
      }

      if (buttonId === 'skip_setup' || buttonId === 'skip_start' || buttonId === 'start_photo') {
        await this.handleSkipSetup(context);
        return;
      }

      // Parse button ID for food record actions: action_recordId
      const [action, recordId] = buttonId.split('_');

      if (!action || !recordId) {
        logger.warn({
          type: 'invalid_button_id',
          buttonId,
        });
        return;
      }

      // Handle food record actions
      switch (action) {
        case 'detail':
          await this.handleDetail(context, recordId);
          break;

        case 'record':
          // Legacy: auto-recorded now, just confirm
          await this.handleRecord(context, recordId);
          break;

        case 'modify':
          await this.handleModify(context, recordId);
          break;

        case 'ignore':
          await this.handleIgnore(context, recordId);
          break;

        default:
          logger.warn({
            type: 'unknown_button_action',
            action,
          });
      }
    } catch (error) {
      logger.error({
        type: 'interactive_handling_error',
        userId: context.userId,
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendError(context);
    }
  }

  /**
   * Handle goal selection buttons
   */
  private async handleGoalSelection(
    context: MessageContext,
    buttonId: string
  ): Promise<void> {
    try {
      // Map button ID to goal
      const goalMap: Record<string, string> = {
        'goal_1': 'lose-weight',
        'goal_2': 'gain-muscle',
        'goal_3': 'control-sugar',
        'goal_4': 'maintain',
      };

      const goal = goalMap[buttonId];
      if (!goal) {
        logger.warn({
          type: 'invalid_goal_button',
          buttonId,
        });
        return;
      }

      // Update user profile with goal
      const supabase = await createClient();
      const { error } = await supabase
        .from('health_profiles')
        .update({ goal: goal as any })
        .eq('user_id', context.userId);

      if (error) {
        logger.error({
          type: 'goal_update_error',
          userId: context.userId,
          error: error.message,
        });
        throw error;
      }

      const goalNames = {
        'en': {
          'lose-weight': 'Lose Weight',
          'gain-muscle': 'Gain Muscle',
          'control-sugar': 'Control Blood Sugar',
          'maintain': 'Maintain Health',
        },
        'zh-CN': {
          'lose-weight': '减脂',
          'gain-muscle': '增肌',
          'control-sugar': '控糖',
          'maintain': '维持健康',
        },
        'zh-TW': {
          'lose-weight': '減脂',
          'gain-muscle': '增肌',
          'control-sugar': '控糖',
          'maintain': '維持健康',
        },
      };

      const messages = {
        'en': `✅ Goal updated to: ${goalNames['en'][goal as keyof typeof goalNames['en']]}

I'll now tailor my recommendations to help you achieve this goal!

Keep sending food photos and I'll guide you. 💪`,

        'zh-CN': `✅ 目标已更新为：${goalNames['zh-CN'][goal as keyof typeof goalNames['zh-CN']]}

我现在会根据这个目标为您定制建议！

继续发送食物照片，我会指导您。💪`,

        'zh-TW': `✅ 目標已更新為：${goalNames['zh-TW'][goal as keyof typeof goalNames['zh-TW']]}

我現在會根據這個目標為您定制建議！

繼續發送食物照片，我會指導您。💪`,
      };

      await whatsappClient.sendTextMessage(
        context.userId,
        messages[context.language]
      );

      logger.info({
        type: 'goal_updated',
        userId: context.userId,
        goal,
      });
    } catch (error) {
      logger.error({
        type: 'goal_selection_error',
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.sendError(context);
    }
  }

  /**
   * Handle detail button - show full nutrition breakdown
   */
  private async handleDetail(
    context: MessageContext,
    recordId: string
  ): Promise<void> {
    try {
      const supabase = await createClient();

      const { data: record, error } = await supabase
        .from('food_records')
        .select('recognition_result, health_rating')
        .eq('id', recordId)
        .single();

      if (error || !record) {
        logger.warn({
          type: 'detail_record_not_found',
          recordId,
          userId: context.userId,
        });
        const msg = context.language === 'en'
          ? '❌ Record not found.'
          : '❌ 记录未找到。';
        await whatsappClient.sendTextMessage(context.userId, msg);
        return;
      }

      const detailMessage = responseFormatterSG.formatDetailResponse(
        record.recognition_result as any,
        record.health_rating as any,
        context.language
      );

      await whatsappClient.sendTextMessage(context.userId, detailMessage);

      logger.info({
        type: 'detail_sent',
        userId: context.userId,
        recordId,
      });
    } catch (error) {
      logger.error({
        type: 'detail_error',
        userId: context.userId,
        recordId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.sendError(context);
    }
  }

  /**
   * Handle quick setup button
   */
  private async handleQuickSetup(context: MessageContext): Promise<void> {
    const messages = {
      'en': `📝 Quick Setup

Please tell me about yourself in ONE message with this format:

"I'm [age] years old, [height]cm tall, [weight]kg, [gender], goal: [lose weight/gain muscle/control sugar/maintain], activity: [sedentary/light/moderate/active]"

Example:
"I'm 25 years old, 170cm tall, 65kg, male, goal: lose weight, activity: moderate"`,
      
      'zh-CN': `📝 快速设置

请用一条消息告诉我您的信息，格式如下：

"我[年龄]岁，身高[height]cm，体重[weight]kg，[性别]，目标：[减脂/增肌/控糖/维持]，活动：[久坐/轻度/中度/高度]"

例如：
"我25岁，身高170cm，体重65kg，男，目标：减脂，活动：中度"`,
      
      'zh-TW': `📝 快速設置

請用一條消息告訴我您的信息，格式如下：

"我[年齡]歲，身高[height]cm，體重[weight]kg，[性別]，目標：[減脂/增肌/控糖/維持]，活動：[久坐/輕度/中度/高度]"

例如：
"我25歲，身高170cm，體重65kg，男，目標：減脂，活動：中度"`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Handle skip setup button
   */
  private async handleSkipSetup(context: MessageContext): Promise<void> {
    const messages = {
      'en': `📸 *Let's Start!*

No problem! You can set up your profile anytime.

Just send me a photo of your food and I'll analyze it for you.

Tips:
• Take clear photos in good lighting
• Include the whole meal
• I can recognize 1000+ foods

Ready? Send your first food photo! 📸`,
      
      'zh-CN': `📸 *开始使用！*

没问题！您随时可以设置画像。

只需发送食物照片，我就会为您分析。

小贴士：
• 在光线充足的地方拍摄清晰照片
• 拍摄完整的餐食
• 我能识别 1000+ 种食物

准备好了吗？发送您的第一张食物照片！📸`,
      
      'zh-TW': `📸 *開始使用！*

沒問題！您隨時可以設置畫像。

只需發送食物照片，我就會為您分析。

小貼士：
• 在光線充足的地方拍攝清晰照片
• 拍攝完整的餐食
• 我能識別 1000+ 種食物

準備好了嗎？發送您的第一張食物照片！📸`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Handle "Record" button - Confirm and keep the record
   */
  private async handleRecord(
    context: MessageContext,
    recordId: string
  ): Promise<void> {
    // Record is already saved, just send confirmation
    const messages = {
      'en': '✅ Great! Your meal has been recorded.\n\nYou can view your history anytime by typing "stats" or "history".',
      'zh-CN': '✅ 太好了！您的餐食已记录。\n\n随时输入"统计"或"历史"查看记录。',
      'zh-TW': '✅ 太好了！您的餐食已記錄。\n\n隨時輸入"統計"或"歷史"查看記錄。',
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );

    logger.info({
      type: 'food_record_confirmed',
      userId: context.userId,
      recordId,
    });
  }

  /**
   * Handle "Modify" button - Allow user to modify the record
   */
  private async handleModify(
    context: MessageContext,
    recordId: string
  ): Promise<void> {
    const messages = {
      'en': `✏️ Let's modify your meal record.

What would you like to change?

1️⃣ Adjust portion size
2️⃣ Remove an item
3️⃣ Add missing items
4️⃣ Completely re-recognize

Please reply with the number (1-4) or describe what you'd like to change.`,

      'zh-CN': `✏️ 让我们修改您的餐食记录。

您想修改什么？

1️⃣ 调整份量
2️⃣ 删除某项食物
3️⃣ 添加遗漏的食物
4️⃣ 完全重新识别

请回复数字（1-4）或描述您想修改的内容。`,

      'zh-TW': `✏️ 讓我們修改您的餐食記錄。

您想修改什麼？

1️⃣ 調整份量
2️⃣ 刪除某項食物
3️⃣ 添加遺漏的食物
4️⃣ 完全重新識別

請回覆數字（1-4）或描述您想修改的內容。`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );

    // TODO: Implement modification flow
    // For now, just acknowledge
    logger.info({
      type: 'food_record_modify_requested',
      userId: context.userId,
      recordId,
    });
  }

  /**
   * Handle "Ignore" button - Delete the record
   */
  private async handleIgnore(
    context: MessageContext,
    recordId: string
  ): Promise<void> {
    try {
      const supabase = await createClient();

      // Delete the record
      const { error } = await supabase
        .from('food_records')
        .delete()
        .eq('id', recordId)
        .eq('user_id', context.userId); // Ensure user owns the record

      if (error) {
        logger.error({
          type: 'food_record_delete_error',
          userId: context.userId,
          recordId,
          error: error.message,
        });
        throw error;
      }

      // Also decrement usage quota since we're ignoring this
      await this.decrementUsage(context.userId);

      const messages = {
        'en': '❌ Okay, I\'ve removed that record.\n\nFeel free to send another photo anytime!',
        'zh-CN': '❌ 好的，我已删除该记录。\n\n随时发送另一张照片！',
        'zh-TW': '❌ 好的，我已刪除該記錄。\n\n隨時發送另一張照片！',
      };

      await whatsappClient.sendTextMessage(
        context.userId,
        messages[context.language]
      );

      logger.info({
        type: 'food_record_ignored',
        userId: context.userId,
        recordId,
      });
    } catch (error) {
      logger.error({
        type: 'ignore_handling_error',
        userId: context.userId,
        recordId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendError(context);
    }
  }

  /**
   * Decrement usage quota (when ignoring a record)
   */
  private async decrementUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Get current usage
    const { data: quota } = await supabase
      .from('usage_quotas')
      .select('recognitions_used')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (quota && quota.recognitions_used > 0) {
      // Decrement by 1
      const { error } = await supabase
        .from('usage_quotas')
        .update({
          recognitions_used: quota.recognitions_used - 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', today);

      if (error) {
        logger.error({
          type: 'decrement_usage_error',
          userId,
          error: error.message,
        });
      }
    }
  }

  /**
   * Send error message
   */
  private async sendError(context: MessageContext): Promise<void> {
    const messages = {
      'en': '❌ Sorry, something went wrong. Please try again.',
      'zh-CN': '❌ 抱歉，出错了。请重试。',
      'zh-TW': '❌ 抱歉，出錯了。請重試。',
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }
}

// Singleton instance
export const interactiveHandler = new InteractiveHandler();
