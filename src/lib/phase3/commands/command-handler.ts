/**
 * Phase 3: Command Handler
 * Handles all Phase 3 commands (streak, budget, card, reminders, compare, preferences)
 */

import { logger } from '@/utils/logger';
import { whatsappClient } from '@/lib/whatsapp/client';
import { ServiceContainer } from '../service-container';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export type Phase3Command = 
  | 'streak' 
  | 'stats' 
  | 'budget' 
  | 'card' 
  | 'reminders' 
  | 'compare' 
  | 'progress' 
  | 'preferences' 
  | 'settings';

export class Phase3CommandHandler {
  private container: ServiceContainer;

  constructor(private supabase: SupabaseClient<Database>) {
    this.container = ServiceContainer.getInstance(supabase);
  }

  /**
   * Handle Phase 3 command
   */
  async handleCommand(
    command: Phase3Command,
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW',
    args?: string[]
  ): Promise<void> {
    logger.info({
      type: 'phase3_command_handling',
      command,
      userId,
      language,
      args,
    });

    try {
      switch (command) {
        case 'streak':
        case 'stats':
          await this.handleStreakCommand(userId, language);
          break;
        
        case 'budget':
          await this.handleBudgetCommand(userId, language, args);
          break;
        
        case 'card':
          await this.handleCardCommand(userId, language, args);
          break;
        
        case 'reminders':
          await this.handleRemindersCommand(userId, language, args);
          break;
        
        case 'compare':
        case 'progress':
          await this.handleCompareCommand(userId, language);
          break;
        
        case 'preferences':
        case 'settings':
          await this.handlePreferencesCommand(userId, language);
          break;
        
        default:
          logger.warn({
            type: 'unknown_phase3_command',
            command,
            userId,
          });
      }
    } catch (error) {
      logger.error({
        type: 'phase3_command_error',
        command,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      await this.sendErrorMessage(userId, language);
    }
  }

  /**
   * Handle streak/stats command
   */
  private async handleStreakCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const streakManager = this.container.getStreakManager();
    
    // Get user UUID
    const userUuid = await this.getUserUuid(userId);
    if (!userUuid) {
      await this.sendUserNotFoundMessage(userId, language);
      return;
    }

    const stats = await streakManager.getStreakStats(userUuid);

    const messages = {
      'en': `🔥 *Your Streak Stats*

📊 *Current Streak:* ${stats.currentStreak} days
🏆 *Longest Streak:* ${stats.longestStreak} days
🍽️ *Total Meals:* ${stats.totalMealsLogged}
❄️ *Streak Freezes:* ${stats.streakFreezesAvailable} available

${stats.achievements.length > 0 ? `\n🎖️ *Recent Achievements:*\n${stats.achievements.slice(0, 3).map(a => `${a.emoji} ${a.title}`).join('\n')}` : ''}

Keep logging to maintain your streak! 💪`,
      
      'zh-CN': `🔥 *您的连续打卡*

📊 *当前连续:* ${stats.currentStreak} 天
🏆 *最长连续:* ${stats.longestStreak} 天
🍽️ *总餐数:* ${stats.totalMealsLogged}
❄️ *冻结次数:* ${stats.streakFreezesAvailable} 次可用

${stats.achievements.length > 0 ? `\n🎖️ *最近成就:*\n${stats.achievements.slice(0, 3).map(a => `${a.emoji} ${a.title}`).join('\n')}` : ''}

继续记录保持连续！💪`,
      
      'zh-TW': `🔥 *您的連續打卡*

📊 *當前連續:* ${stats.currentStreak} 天
🏆 *最長連續:* ${stats.longestStreak} 天
🍽️ *總餐數:* ${stats.totalMealsLogged}
❄️ *凍結次數:* ${stats.streakFreezesAvailable} 次可用

${stats.achievements.length > 0 ? `\n🎖️ *最近成就:*\n${stats.achievements.slice(0, 3).map(a => `${a.emoji} ${a.title}`).join('\n')}` : ''}

繼續記錄保持連續！💪`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Handle budget command
   */
  private async handleBudgetCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW',
    args?: string[]
  ): Promise<void> {
    const budgetTracker = this.container.getBudgetTracker();
    
    // Get user UUID
    const userUuid = await this.getUserUuid(userId);
    if (!userUuid) {
      await this.sendUserNotFoundMessage(userId, language);
      return;
    }

    // Check if user wants to set budget
    if (args && args.length > 0) {
      const action = args[0].toLowerCase();
      
      if (action === 'set' && args[1]) {
        const target = parseInt(args[1]);
        if (isNaN(target) || target < 500 || target > 5000) {
          const messages = {
            'en': '❌ Please provide a valid calorie target (500-5000).\n\nExample: budget set 1800',
            'zh-CN': '❌ 请提供有效的卡路里目标（500-5000）。\n\n例如：budget set 1800',
            'zh-TW': '❌ 請提供有效的卡路里目標（500-5000）。\n\n例如：budget set 1800',
          };
          await whatsappClient.sendTextMessage(userId, messages[language]);
          return;
        }
        
        await budgetTracker.setBudget(userUuid, target);
        
        const messages = {
          'en': `✅ Daily budget set to ${target} kcal!\n\nI'll track your calories and let you know when you're approaching your limit.`,
          'zh-CN': `✅ 每日预算设置为 ${target} 千卡！\n\n我会追踪您的卡路里并在接近限制时提醒您。`,
          'zh-TW': `✅ 每日預算設置為 ${target} 千卡！\n\n我會追蹤您的卡路里並在接近限制時提醒您。`,
        };
        await whatsappClient.sendTextMessage(userId, messages[language]);
        return;
      }
      
      if (action === 'disable' || action === 'off') {
        await budgetTracker.disableBudget(userUuid);
        
        const messages = {
          'en': '✅ Budget tracking disabled.',
          'zh-CN': '✅ 预算追踪已禁用。',
          'zh-TW': '✅ 預算追蹤已禁用。',
        };
        await whatsappClient.sendTextMessage(userId, messages[language]);
        return;
      }
    }

    // Show current budget status
    const status = await budgetTracker.getBudgetStatus(userUuid);

    if (!status.enabled) {
      const messages = {
        'en': `💰 *Budget Tracking*

Budget tracking is currently disabled.

To enable, send:
\`budget set 1800\` (your daily calorie target)

This helps you stay on track with your goals! 🎯`,
        
        'zh-CN': `💰 *预算追踪*

预算追踪当前已禁用。

要启用，发送：
\`budget set 1800\`（您的每日卡路里目标）

这有助于您实现目标！🎯`,
        
        'zh-TW': `💰 *預算追蹤*

預算追蹤當前已禁用。

要啟用，發送：
\`budget set 1800\`（您的每日卡路里目標）

這有助於您實現目標！🎯`,
      };
      await whatsappClient.sendTextMessage(userId, messages[language]);
      return;
    }

    const statusEmoji = status.status === 'on_track' ? '🟢' : status.status === 'approaching_limit' ? '🟡' : '🔴';
    
    const messages = {
      'en': `💰 *Today's Budget*

${statusEmoji} ${status.consumed} / ${status.target} kcal (${status.percentageUsed}%)
${status.remaining > 0 ? `✅ ${status.remaining} kcal remaining` : `⚠️ ${Math.abs(status.remaining)} kcal over budget`}

${status.message || ''}

Commands:
• \`budget set 2000\` - Change target
• \`budget disable\` - Turn off tracking`,
      
      'zh-CN': `💰 *今日预算*

${statusEmoji} ${status.consumed} / ${status.target} 千卡 (${status.percentageUsed}%)
${status.remaining > 0 ? `✅ 剩余 ${status.remaining} 千卡` : `⚠️ 超出 ${Math.abs(status.remaining)} 千卡`}

${status.message || ''}

命令：
• \`budget set 2000\` - 更改目标
• \`budget disable\` - 关闭追踪`,
      
      'zh-TW': `💰 *今日預算*

${statusEmoji} ${status.consumed} / ${status.target} 千卡 (${status.percentageUsed}%)
${status.remaining > 0 ? `✅ 剩餘 ${status.remaining} 千卡` : `⚠️ 超出 ${Math.abs(status.remaining)} 千卡`}

${status.message || ''}

命令：
• \`budget set 2000\` - 更改目標
• \`budget disable\` - 關閉追蹤`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Handle card command
   */
  private async handleCardCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW',
    args?: string[]
  ): Promise<void> {
    const messages = {
      'en': `📊 *Visual Cards*

This feature is coming soon! You'll be able to generate:
• Daily summary cards
• Weekly progress cards
• Achievement celebration cards

Stay tuned! 🎨`,
      
      'zh-CN': `📊 *可视化卡片*

此功能即将上线！您将能够生成：
• 每日总结卡片
• 每周进度卡片
• 成就庆祝卡片

敬请期待！🎨`,
      
      'zh-TW': `📊 *可視化卡片*

此功能即將上線！您將能夠生成：
• 每日總結卡片
• 每週進度卡片
• 成就慶祝卡片

敬請期待！🎨`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Handle reminders command
   */
  private async handleRemindersCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW',
    args?: string[]
  ): Promise<void> {
    const messages = {
      'en': `⏰ *Meal Reminders*

This feature is coming soon! You'll be able to:
• Set reminder times for meals
• Configure quiet hours
• Get streak protection alerts

Stay tuned! 🔔`,
      
      'zh-CN': `⏰ *餐食提醒*

此功能即将上线！您将能够：
• 设置餐食提醒时间
• 配置免打扰时段
• 获取连续保护提醒

敬请期待！🔔`,
      
      'zh-TW': `⏰ *餐食提醒*

此功能即將上線！您將能夠：
• 設置餐食提醒時間
• 配置免打擾時段
• 獲取連續保護提醒

敬請期待！🔔`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Handle compare/progress command
   */
  private async handleCompareCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': `📈 *Progress Comparison*

This feature is coming soon! You'll be able to see:
• Week-over-week comparisons
• Eating pattern analysis
• Similar meal detection
• Top foods by frequency

Stay tuned! 📊`,
      
      'zh-CN': `📈 *进度对比*

此功能即将上线！您将能够查看：
• 周对周对比
• 饮食模式分析
• 相似餐食检测
• 高频食物排行

敬请期待！📊`,
      
      'zh-TW': `📈 *進度對比*

此功能即將上線！您將能夠查看：
• 週對週對比
• 飲食模式分析
• 相似餐食檢測
• 高頻食物排行

敬請期待！📊`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Handle preferences/settings command
   */
  private async handlePreferencesCommand(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const preferenceManager = this.container.getPreferenceManager();
    
    // Get user UUID
    const userUuid = await this.getUserUuid(userId);
    if (!userUuid) {
      await this.sendUserNotFoundMessage(userId, language);
      return;
    }

    const prefs = await preferenceManager.getPreferences(userUuid);

    const messages = {
      'en': `⚙️ *Your Preferences*

${prefs.dietaryType.length > 0 ? `🥗 *Dietary Type:* ${prefs.dietaryType.join(', ')}\n` : ''}${prefs.allergies.length > 0 ? `⚠️ *Allergies:* ${prefs.allergies.map(a => a.allergen).join(', ')}\n` : ''}${prefs.favorites.length > 0 ? `❤️ *Favorites:* ${prefs.favorites.slice(0, 3).join(', ')}\n` : ''}
${prefs.dietaryType.length === 0 && prefs.allergies.length === 0 ? 'No preferences set yet.\n\n' : ''}To update, just tell me naturally:
"I'm vegetarian" or "I'm allergic to peanuts"

I'll learn your preferences as you use the app! 🎯`,
      
      'zh-CN': `⚙️ *您的偏好*

${prefs.dietaryType.length > 0 ? `🥗 *饮食类型:* ${prefs.dietaryType.join('、')}\n` : ''}${prefs.allergies.length > 0 ? `⚠️ *过敏原:* ${prefs.allergies.map(a => a.allergen).join('、')}\n` : ''}${prefs.favorites.length > 0 ? `❤️ *最爱:* ${prefs.favorites.slice(0, 3).join('、')}\n` : ''}
${prefs.dietaryType.length === 0 && prefs.allergies.length === 0 ? '还没有设置偏好。\n\n' : ''}要更新，直接告诉我：
"我是素食者" 或 "我对花生过敏"

我会在您使用时学习您的偏好！🎯`,
      
      'zh-TW': `⚙️ *您的偏好*

${prefs.dietaryType.length > 0 ? `🥗 *飲食類型:* ${prefs.dietaryType.join('、')}\n` : ''}${prefs.allergies.length > 0 ? `⚠️ *過敏原:* ${prefs.allergies.map(a => a.allergen).join('、')}\n` : ''}${prefs.favorites.length > 0 ? `❤️ *最愛:* ${prefs.favorites.slice(0, 3).join('、')}\n` : ''}
${prefs.dietaryType.length === 0 && prefs.allergies.length === 0 ? '還沒有設置偏好。\n\n' : ''}要更新，直接告訴我：
"我是素食者" 或 "我對花生過敏"

我會在您使用時學習您的偏好！🎯`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Get user UUID from phone number
   */
  private async getUserUuid(phoneNumber: string): Promise<string | null> {
    const { data: user } = await this.supabase
      .from('users')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    return user?.id || null;
  }

  /**
   * Send user not found message
   */
  private async sendUserNotFoundMessage(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': '❌ User not found. Please send a food photo first to get started!',
      'zh-CN': '❌ 未找到用户。请先发送食物照片开始使用！',
      'zh-TW': '❌ 未找到用戶。請先發送食物照片開始使用！',
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Send error message
   */
  private async sendErrorMessage(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': '❌ Sorry, something went wrong. Please try again.',
      'zh-CN': '❌ 抱歉，出错了。请重试。',
      'zh-TW': '❌ 抱歉，出錯了。請重試。',
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }
}

/**
 * Create command handler instance
 */
export async function createPhase3CommandHandler(): Promise<Phase3CommandHandler> {
  const supabase = await createClient();
  return new Phase3CommandHandler(supabase);
}
