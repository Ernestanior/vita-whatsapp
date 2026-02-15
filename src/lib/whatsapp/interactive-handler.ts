/**
 * InteractiveHandler - Handles interactive button replies
 * 
 * Handles quick reply buttons:
 * - Record: Confirm and keep the food record
 * - Modify: Allow user to modify the recognition result
 * - Ignore: Delete the food record
 * 
 * Requirements: 17.1, 17.2
 */

import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { createClient } from '@/lib/supabase/server';
import type { Message, MessageContext } from '@/types/whatsapp';

export class InteractiveHandler {
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

      // Parse button ID: action_recordId
      const [action, recordId] = buttonId.split('_');

      if (!action || !recordId) {
        logger.warn({
          type: 'invalid_button_id',
          buttonId,
        });
        return;
      }

      // Handle different actions
      switch (action) {
        case 'record':
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
