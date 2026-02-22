import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { profileManager } from '@/lib/profile';
import type { Message, MessageContext } from '@/types/whatsapp';
import { UserIntent, unifiedIntentDetector } from '@/lib/ai/unified-intent-detector';
import type { IntentResult } from '@/lib/ai/unified-intent-detector';

// Re-export for backward compatibility
export { UserIntent as Command } from '@/lib/ai/unified-intent-detector';

/**
 * TextHandler - Handles text messages
 *
 * Flow: Exact match → Setup flow → Unified AI intent → Route
 * Single AI call replaces the old 3-layer detection chain.
 */
export class TextHandler {
  // ─── Exact command map (fast path, no AI) ──────────────
  private static readonly COMMAND_MAP: Record<string, UserIntent> = {
    '/start': UserIntent.START, 'start': UserIntent.START, '开始': UserIntent.START, '開始': UserIntent.START,
    '/profile': UserIntent.PROFILE, 'profile': UserIntent.PROFILE, '/画像': UserIntent.PROFILE, '/畫像': UserIntent.PROFILE,
    '画像': UserIntent.PROFILE, '畫像': UserIntent.PROFILE, '个人资料': UserIntent.PROFILE, '個人資料': UserIntent.PROFILE,
    '/help': UserIntent.HELP, 'help': UserIntent.HELP, '/帮助': UserIntent.HELP, '/幫助': UserIntent.HELP,
    '帮助': UserIntent.HELP, '幫助': UserIntent.HELP,
    '/stats': UserIntent.STATS, 'stats': UserIntent.STATS, '/统计': UserIntent.STATS, '/統計': UserIntent.STATS,
    '统计': UserIntent.STATS, '統計': UserIntent.STATS,
    '/history': UserIntent.HISTORY, 'history': UserIntent.HISTORY, '/历史': UserIntent.HISTORY, '/歷史': UserIntent.HISTORY,
    '历史': UserIntent.HISTORY, '歷史': UserIntent.HISTORY,
    '/settings': UserIntent.SETTINGS, 'settings': UserIntent.SETTINGS, '/设置': UserIntent.SETTINGS, '/設置': UserIntent.SETTINGS,
    '设置': UserIntent.SETTINGS, '設置': UserIntent.SETTINGS,
    '/streak': UserIntent.STREAK, 'streak': UserIntent.STREAK, '/连续': UserIntent.STREAK, '/連續': UserIntent.STREAK,
    '连续': UserIntent.STREAK, '連續': UserIntent.STREAK, '/打卡': UserIntent.STREAK, '打卡': UserIntent.STREAK,
    '/budget': UserIntent.BUDGET, 'budget': UserIntent.BUDGET, '/预算': UserIntent.BUDGET, '/預算': UserIntent.BUDGET,
    '预算': UserIntent.BUDGET, '預算': UserIntent.BUDGET,
    '/card': UserIntent.CARD, 'card': UserIntent.CARD, '/卡片': UserIntent.CARD, '卡片': UserIntent.CARD,
    '/reminders': UserIntent.REMINDERS, 'reminders': UserIntent.REMINDERS, '/提醒': UserIntent.REMINDERS, '提醒': UserIntent.REMINDERS,
    '/compare': UserIntent.COMPARE, 'compare': UserIntent.COMPARE, '/对比': UserIntent.COMPARE, '/對比': UserIntent.COMPARE,
    '对比': UserIntent.COMPARE, '對比': UserIntent.COMPARE,
    '/progress': UserIntent.PROGRESS, 'progress': UserIntent.PROGRESS, '/进度': UserIntent.PROGRESS, '/進度': UserIntent.PROGRESS,
    '进度': UserIntent.PROGRESS, '進度': UserIntent.PROGRESS,
    '/preferences': UserIntent.PREFERENCES, 'preferences': UserIntent.PREFERENCES, '/偏好': UserIntent.PREFERENCES, '偏好': UserIntent.PREFERENCES,
  };

  /**
   * Handle incoming text message
   * Flow: exact match → setup flow → unified AI intent → route
   */
  async handle(message: Message, context: MessageContext): Promise<void> {
    const text = message.text?.body;
    if (!text) return;

    logger.info({
      type: 'text_message_processing',
      messageId: message.id,
      textLength: text.length,
      text: text.substring(0, 50),
    });

    try {
      // ── Step 1: Exact match (free, instant) ──────────────
      const normalized = text.trim().toLowerCase();
      const firstWord = normalized.split(/\s+/)[0];
      const exactIntent = TextHandler.COMMAND_MAP[normalized] || TextHandler.COMMAND_MAP[firstWord];

      if (exactIntent) {
        // HELP / START can cancel setup flow
        if (exactIntent === UserIntent.HELP || exactIntent === UserIntent.START) {
          if (await profileManager.isInSetupFlow(context.userId)) {
            await profileManager.cancelSetup(context.userId);
          }
        }
        await this.routeIntent({ intent: exactIntent, confidence: 1 }, text, message, context);
        return;
      }

      // ── Step 2: Setup flow intercept ─────────────────────
      if (await profileManager.isInSetupFlow(context.userId)) {
        await profileManager.processSetupInput(context.userId, text, context.language);
        return;
      }

      // ── Step 3: Unified AI intent detection (single call) ─
      const result = await unifiedIntentDetector.detect(text);

      logger.info({
        type: 'unified_intent_result',
        messageId: message.id,
        intent: result.intent,
        confidence: result.confidence,
      });

      await this.routeIntent(result, text, message, context);

    } catch (error) {
      logger.error({
        type: 'text_handling_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      await this.sendErrorMessage(message.from, context.language);
    }
  }

  // ─── Intent Router ─────────────────────────────────────
  private async routeIntent(
    result: IntentResult,
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    const { intent, extractedData } = result;

    switch (intent) {
      case UserIntent.START:
      case UserIntent.GREETING:
        await this.handleStartCommand(message.from, context);
        break;
      case UserIntent.HELP:
        await this.handleHelpCommand(message.from, context);
        break;
      case UserIntent.PROFILE:
        await this.handleProfileCommand(message.from, context);
        break;
      case UserIntent.STATS:
        await this.handleStatsCommand(message.from, context);
        break;
      case UserIntent.HISTORY:
        await this.handleHistoryCommand(message.from, context);
        break;
      case UserIntent.SETTINGS:
        await this.handleSettingsCommand(message.from, context);
        break;

      // Phase 3 commands
      case UserIntent.STREAK:
      case UserIntent.BUDGET:
      case UserIntent.CARD:
      case UserIntent.REMINDERS:
      case UserIntent.COMPARE:
      case UserIntent.PROGRESS:
      case UserIntent.PREFERENCES:
        await this.handlePhase3Command(intent, message.from, context, text);
        break;

      // AI-detected intents
      case UserIntent.FOOD_LOG:
        await this.handleFoodLog(extractedData?.foodDescription || text, message, context);
        break;
      case UserIntent.MEAL_ADVICE:
        await this.handleMealAdvice(text, message, context);
        break;
      case UserIntent.PROFILE_UPDATE:
        await this.handleProfileUpdate(extractedData, text, message, context);
        break;
      case UserIntent.QUICK_SETUP:
        if (extractedData?.quickSetupAge && extractedData?.quickSetupHeight && extractedData?.quickSetupWeight) {
          await this.handleQuickSetup(message.from, context, {
            age: extractedData.quickSetupAge,
            height: extractedData.quickSetupHeight,
            weight: extractedData.quickSetupWeight,
          });
        } else {
          // Fallback: try regex
          const match = text.trim().match(/^(\d{1,3})\s+(\d{2,3})\s+(\d{2,3})$/);
          if (match) {
            await this.handleQuickSetup(message.from, context, {
              age: parseInt(match[1]), height: parseInt(match[2]), weight: parseInt(match[3]),
            });
          } else {
            await this.handleGeneralChat(text, message, context);
          }
        }
        break;

      case UserIntent.GENERAL:
      default:
        await this.handleGeneralChat(text, message, context);
        break;
    }
  }

  // ─── Phase 3 command routing ────────────────────────
  private async handlePhase3Command(
    intent: UserIntent,
    userId: string,
    context: MessageContext,
    originalText: string
  ): Promise<void> {
    const { createPhase3CommandHandler } = await import('@/lib/phase3/commands/command-handler');
    const handler = await createPhase3CommandHandler();

    const intentToPhase3: Record<string, string> = {
      [UserIntent.STREAK]: 'streak',
      [UserIntent.BUDGET]: 'budget',
      [UserIntent.CARD]: 'card',
      [UserIntent.REMINDERS]: 'reminders',
      [UserIntent.COMPARE]: 'compare',
      [UserIntent.PROGRESS]: 'progress',
      [UserIntent.PREFERENCES]: 'preferences',
    };

    const phase3Command = intentToPhase3[intent] as any;
    if (phase3Command) {
      const parts = originalText.trim().split(/\s+/);
      const args = parts.slice(1);
      await handler.handleCommand(phase3Command, userId, context.language, args);
    }
  }

  /**
   * Handle /start command - Welcome and onboarding
   */
  private async handleStartCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    try {
      logger.info({
        type: 'start_command_processing',
        userId,
      });

      // Send zero-input welcome message
      const messages = {
        'en': `👋 *Welcome to Vita AI!*

I'm your personal nutrition assistant.

🚀 *Get Started in 3 Seconds:*

Just send me a photo of your food!
📸 I'll analyze it instantly.

No setup needed. I'll learn about you as we go.

*Optional Quick Setup:*
Want personalized advice now?
Send: \`25 170 65\` (age height weight)

Ready? Send your first food photo! 📸`,
        
        'zh-CN': `👋 *欢迎使用 Vita AI！*

我是您的个人营养助手。

🚀 *3秒开始使用：*

直接发送食物照片！
📸 我会立即分析。

无需设置。我会在使用中了解您。

*可选快速设置：*
想要个性化建议？
发送：\`25 170 65\`（年龄 身高 体重）

准备好了吗？发送您的第一张食物照片！📸`,
        
        'zh-TW': `👋 *歡迎使用 Vita AI！*

我是您的個人營養助手。

🚀 *3秒開始使用：*

直接發送食物照片！
📸 我會立即分析。

無需設置。我會在使用中了解您。

*可選快速設置：*
想要個性化建議？
發送：\`25 170 65\`（年齡 身高 體重）

準備好了嗎？發送您的第一張食物照片！📸`,
      };

      // Send message with minimal buttons
      await whatsappClient.sendButtonMessage(
        userId,
        messages[context.language],
        [
          { id: 'help', title: '❓ Help' },
        ]
      );
      
      logger.info({
        type: 'start_message_sent',
        userId,
      });
    } catch (error) {
      logger.error({
        type: 'start_command_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Handle /profile command - View/update health profile
   */
  private async handleProfileCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    // Fetch user profile from database
    const profile = await profileManager.getProfile(userId);

    if (!profile) {
      // No profile, start setup
      await profileManager.initializeProfile(userId, context.language);
      return;
    }

    // Calculate BMI and daily calories
    const bmi = profile.height && profile.weight 
      ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
      : 'N/A';

    const messages = {
      'en': `📊 Your Health Profile

• Height: ${profile.height} cm
• Weight: ${profile.weight} kg
• Age: ${profile.age || 'Not set'}
• Gender: ${profile.gender || 'Not set'}
• BMI: ${bmi}
• Goal: ${this.formatGoal(profile.goal, 'en')}
• Activity: ${this.formatActivityLevel(profile.activity_level, 'en')}

To update your profile, just tell me in natural language:
"I'm now 65kg" or "My height is 170cm"`,
      
      'zh-CN': `📊 您的健康画像

• 身高：${profile.height} 厘米
• 体重：${profile.weight} 公斤
• 年龄：${profile.age || '未设置'}
• 性别：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '未设置'}
• BMI：${bmi}
• 目标：${this.formatGoal(profile.goal, 'zh-CN')}
• 活动：${this.formatActivityLevel(profile.activity_level, 'zh-CN')}

要更新画像，直接告诉我：
"我现在 65kg" 或 "我身高 170cm"`,
      
      'zh-TW': `📊 您的健康畫像

• 身高：${profile.height} 厘米
• 體重：${profile.weight} 公斤
• 年齡：${profile.age || '未設置'}
• 性別：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '未設置'}
• BMI：${bmi}
• 目標：${this.formatGoal(profile.goal, 'zh-TW')}
• 活動：${this.formatActivityLevel(profile.activity_level, 'zh-TW')}

要更新畫像，直接告訴我：
"我現在 65kg" 或 "我身高 170cm"`,
    };

    await whatsappClient.sendTextMessage(
      userId,
      messages[context.language]
    );
  }

  /**
   * Format goal for display
   */
  private formatGoal(goal: string, language: 'en' | 'zh-CN' | 'zh-TW'): string {
    const goals = {
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

    return goals[language][goal as keyof typeof goals['en']] || goal;
  }

  /**
   * Format activity level for display
   */
  private formatActivityLevel(level: string, language: 'en' | 'zh-CN' | 'zh-TW'): string {
    const levels = {
      'en': {
        'sedentary': 'Sedentary',
        'light': 'Light Activity',
        'moderate': 'Moderate Activity',
        'active': 'Very Active',
      },
      'zh-CN': {
        'sedentary': '久坐',
        'light': '轻度活动',
        'moderate': '中度活动',
        'active': '高度活动',
      },
      'zh-TW': {
        'sedentary': '久坐',
        'light': '輕度活動',
        'moderate': '中度活動',
        'active': '高度活動',
      },
    };

    return levels[language][level as keyof typeof levels['en']] || level;
  }

  /**
   * Handle /help command - Show available commands and features
   */
  private async handleHelpCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    const messages = {
      'en': `🤖 *Vita AI Help*

*Core Features:*
📸 Send food photo → Get instant analysis
💬 Tell me about yourself → Set up profile

*Commands:*
• \`streak\` - View your logging streak
• \`stats\` - See your statistics
• \`budget\` - Track daily calories
• \`profile\` - View/update profile
• \`history\` - Recent meals
• \`preferences\` - Dietary preferences

*Quick Actions:*
Use the buttons below!`,
      
      'zh-CN': `🤖 *Vita AI 帮助*

*核心功能：*
📸 发送食物照片 → 获取即时分析
💬 告诉我您的信息 → 设置画像

*命令：*
• \`连续\` - 查看打卡连续
• \`统计\` - 查看统计数据
• \`预算\` - 追踪每日卡路里
• \`画像\` - 查看/更新画像
• \`历史\` - 最近餐食
• \`偏好\` - 饮食偏好

*快速操作：*
使用下方按钮！`,
      
      'zh-TW': `🤖 *Vita AI 幫助*

*核心功能：*
📸 發送食物照片 → 獲取即時分析
💬 告訴我您的信息 → 設置畫像

*命令：*
• \`連續\` - 查看打卡連續
• \`統計\` - 查看統計數據
• \`預算\` - 追蹤每日卡路里
• \`畫像\` - 查看/更新畫像
• \`歷史\` - 最近餐食
• \`偏好\` - 飲食偏好

*快速操作：*
使用下方按鈕！`,
    };

    await whatsappClient.sendButtonMessage(
      userId,
      messages[context.language],
      [
        { id: 'start', title: '🚀 Get Started' },
        { id: 'profile', title: '👤 My Profile' },
        { id: 'streak', title: '🔥 My Streak' },
      ]
    );
  }

  /**
   * Handle /history command - Show recent meal history
   */
  private async handleHistoryCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    try {
      const supabase = await (await import('@/lib/supabase/server')).createClient();
      
      // Get user UUID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', userId)
        .maybeSingle();

      if (!user) {
        const messages = {
          'en': '📊 No history yet!\n\nStart by sending a food photo.',
          'zh-CN': '📊 还没有历史记录！\n\n发送食物照片开始记录。',
          'zh-TW': '📊 還沒有歷史記錄！\n\n發送食物照片開始記錄。',
        };
        await whatsappClient.sendTextMessage(userId, messages[context.language]);
        return;
      }

      // Get last 5 food records
      const { data: records, error } = await supabase
        .from('food_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !records || records.length === 0) {
        const messages = {
          'en': '📊 No meals recorded yet!\n\nSend a food photo to start tracking.',
          'zh-CN': '📊 还没有记录餐食！\n\n发送食物照片开始追踪。',
          'zh-TW': '📊 還沒有記錄餐食！\n\n發送食物照片開始追蹤。',
        };
        await whatsappClient.sendTextMessage(userId, messages[context.language]);
        return;
      }

      // Format history message
      let message = context.language === 'en' 
        ? '📊 *Your Recent Meals*\n\n'
        : '📊 *您的最近餐食*\n\n';

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const result = record.recognition_result as any;
        const rating = record.health_rating as any;
        const date = new Date(record.created_at);
        const timeAgo = this.getTimeAgo(date, context.language);

        const emoji = rating.overall === 'green' ? '🟢' : rating.overall === 'yellow' ? '🟡' : '🔴';
        const foodName = result.foods[0]?.nameLocal || result.foods[0]?.name || 'Unknown';
        const calories = Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);

        message += `${i + 1}. ${emoji} ${foodName}\n`;
        message += `   ${calories} kcal • ${timeAgo}\n\n`;
      }

      message += context.language === 'en'
        ? '\nType "stats" for detailed statistics.'
        : '\n输入"统计"查看详细数据。';

      await whatsappClient.sendTextMessage(userId, message);

    } catch (error) {
      logger.error({
        type: 'history_command_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.sendErrorMessage(userId, context.language);
    }
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(date: Date, language: 'en' | 'zh-CN' | 'zh-TW'): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === 'en' ? 'Just now' : '刚刚';
    } else if (diffMins < 60) {
      return language === 'en' ? `${diffMins}m ago` : `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return language === 'en' ? `${diffHours}h ago` : `${diffHours}小时前`;
    } else {
      return language === 'en' ? `${diffDays}d ago` : `${diffDays}天前`;
    }
  }

  /**
   * Handle /stats command - Show nutrition statistics
   */
  private async handleStatsCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    try {
      const supabase = await (await import('@/lib/supabase/server')).createClient();
      
      // Get user UUID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', userId)
        .maybeSingle();

      if (!user) {
        const messages = {
          'en': '📈 No statistics yet!\n\nStart by sending a food photo.',
          'zh-CN': '📈 还没有统计数据！\n\n发送食物照片开始记录。',
          'zh-TW': '📈 還沒有統計數據！\n\n發送食物照片開始記錄。',
        };
        await whatsappClient.sendTextMessage(userId, messages[context.language]);
        return;
      }

      // Get all food records
      const { data: records, error } = await supabase
        .from('food_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !records || records.length === 0) {
        const messages = {
          'en': '📈 No meals recorded yet!\n\nSend a food photo to start tracking.',
          'zh-CN': '📈 还没有记录餐食！\n\n发送食物照片开始追踪。',
          'zh-TW': '📈 還沒有記錄餐食！\n\n發送食物照片開始追蹤。',
        };
        await whatsappClient.sendTextMessage(userId, messages[context.language]);
        return;
      }

      // Calculate statistics
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let greenCount = 0;
      let yellowCount = 0;
      let redCount = 0;

      for (const record of records) {
        const result = record.recognition_result as any;
        const rating = record.health_rating as any;

        totalCalories += Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);
        totalProtein += Math.round((result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2);
        totalCarbs += Math.round((result.totalNutrition.carbs.min + result.totalNutrition.carbs.max) / 2);
        totalFat += Math.round((result.totalNutrition.fat.min + result.totalNutrition.fat.max) / 2);

        if (rating.overall === 'green') greenCount++;
        else if (rating.overall === 'yellow') yellowCount++;
        else redCount++;
      }

      const avgCalories = Math.round(totalCalories / records.length);
      const avgProtein = Math.round(totalProtein / records.length);
      const avgCarbs = Math.round(totalCarbs / records.length);
      const avgFat = Math.round(totalFat / records.length);

      // Format stats message
      let message = context.language === 'en'
        ? `📈 *Your Statistics*\n\n`
        : `📈 *您的统计数据*\n\n`;

      message += context.language === 'en'
        ? `📊 *Total Meals:* ${records.length}\n\n`
        : `📊 *总餐数:* ${records.length}\n\n`;

      message += context.language === 'en'
        ? `🍽️ *Average Per Meal:*\n`
        : `🍽️ *每餐平均:*\n`;
      message += `• ${avgCalories} kcal\n`;
      message += `• ${avgProtein}g protein\n`;
      message += `• ${avgCarbs}g carbs\n`;
      message += `• ${avgFat}g fat\n\n`;

      message += context.language === 'en'
        ? `🎯 *Health Ratings:*\n`
        : `🎯 *健康评分:*\n`;
      message += `🟢 Healthy: ${greenCount}\n`;
      message += `🟡 Moderate: ${yellowCount}\n`;
      message += `🔴 Unhealthy: ${redCount}\n\n`;

      message += context.language === 'en'
        ? `Type "history" to see recent meals.`
        : `输入"历史"查看最近餐食。`;

      await whatsappClient.sendTextMessage(userId, message);

    } catch (error) {
      logger.error({
        type: 'stats_command_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await this.sendErrorMessage(userId, context.language);
    }
  }

  /**
   * Handle /settings command - Adjust user preferences
   */
  private async handleSettingsCommand(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    const messages = {
      'en': `⚙️ Settings

This feature is coming soon! You'll be able to:
• Change language preference
• Set daily digest time
• Enable/disable notifications
• Manage subscription

For now, I automatically detect your language from your messages.`,
      
      'zh-CN': `⚙️ 设置

此功能即将上线！您将能够：
• 更改语言偏好
• 设置每日总结时间
• 启用/禁用通知
• 管理订阅

现在，我会自动从您的消息中检测语言。`,
      
      'zh-TW': `⚙️ 設置

此功能即將上線！您將能夠：
• 更改語言偏好
• 設置每日總結時間
• 啟用/禁用通知
• 管理訂閱

現在，我會自動從您的消息中檢測語言。`,
    };

    await whatsappClient.sendTextMessage(
      userId,
      messages[context.language]
    );
  }

  // ─── AI-detected intent handlers ────────────────────

  private async handleFoodLog(
    foodDescription: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    // Delegate to existing tryTextFoodLog logic
    const logged = await this.tryTextFoodLog(foodDescription, message, context);
    if (!logged) {
      await this.handleGeneralChat(foodDescription, message, context);
    }
  }

  private async handleMealAdvice(
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    const advised = await this.tryMealAdvice(text, message, context);
    if (!advised) {
      await this.handleGeneralChat(text, message, context);
    }
  }

  private async handleProfileUpdate(
    extractedData: any,
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    const wasUpdated = await profileManager.parseNaturalLanguageUpdate(
      context.userId,
      text,
      context.language
    );
    if (!wasUpdated) {
      await this.handleGeneralChat(text, message, context);
    }
  }

  private async handleGeneralChat(
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    try {
      const { intelligentConversation } = await import('@/lib/ai/intelligent-conversation');
      const aiResponse = await intelligentConversation.generateResponse(text, message.from, context);
      await whatsappClient.sendTextMessage(message.from, aiResponse);
    } catch (error) {
      logger.error({
        type: 'ai_response_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const fallback: Record<string, string> = {
        'en': `I'm not sure what you mean 🤔\n\nTry:\n• Send a food photo 📸\n• Tell me what you ate: "I had chicken rice"\n• Type /help for commands`,
        'zh-CN': `我不太明白您的意思 🤔\n\n试试：\n• 发送食物照片 📸\n• 告诉我你吃了什么："午饭吃了鸡饭"\n• 输入 /help 查看命令`,
        'zh-TW': `我不太明白您的意思 🤔\n\n試試：\n• 發送食物照片 📸\n• 告訴我你吃了什麼："午餐吃了雞飯"\n• 輸入 /help 查看命令`,
      };

      await whatsappClient.sendButtonMessage(
        message.from,
        fallback[context.language] || fallback['en'],
        [
          { id: 'start', title: '🚀 Get Started' },
          { id: 'help', title: '❓ Help' },
        ]
      );
    }
  }

  /**
   * Handle quick setup with 3 numbers
   */
    private async handleQuickSetup(
      userId: string,
      context: MessageContext,
      data: { age: number; height: number; weight: number }
    ): Promise<void> {
      try {
        logger.info({
          type: 'quick_setup_processing',
          userId,
          data,
        });

        // Validate input
        if (data.age < 10 || data.age > 120) {
          await whatsappClient.sendTextMessage(
            userId,
            context.language === 'zh-CN' 
              ? '年龄似乎不对，请重新输入（10-120岁）' 
              : context.language === 'zh-TW'
              ? '年齡似乎不對，請重新輸入（10-120歲）'
              : 'Age seems incorrect, please try again (10-120 years)'
          );
          return;
        }

        if (data.height < 100 || data.height > 250) {
          await whatsappClient.sendTextMessage(
            userId,
            context.language === 'zh-CN'
              ? '身高似乎不对，请重新输入（100-250cm）'
              : context.language === 'zh-TW'
              ? '身高似乎不對，請重新輸入（100-250cm）'
              : 'Height seems incorrect, please try again (100-250cm)'
          );
          return;
        }

        if (data.weight < 30 || data.weight > 300) {
          await whatsappClient.sendTextMessage(
            userId,
            context.language === 'zh-CN'
              ? '体重似乎不对，请重新输入（30-300kg）'
              : context.language === 'zh-TW'
              ? '體重似乎不對，請重新輸入（30-300kg）'
              : 'Weight seems incorrect, please try again (30-300kg)'
          );
          return;
        }

        logger.info({
          type: 'quick_setup_validation_passed',
          userId,
        });

        // Calculate BMI
        const bmi = data.weight / Math.pow(data.height / 100, 2);

        // Smart defaults based on BMI and age
        let goal: 'lose-weight' | 'gain-muscle' | 'maintain' = 'maintain';
        if (bmi > 25) goal = 'lose-weight';
        else if (bmi < 18.5) goal = 'gain-muscle';

        const activityLevel = 'light'; // Default to light activity
        const gender = 'male'; // Default, can be updated later

        logger.info({
          type: 'quick_setup_calculated_defaults',
          userId,
          bmi: bmi.toFixed(1),
          goal,
        });

        // CRITICAL: Send confirmation message FIRST (user experience priority)
        logger.info({
          type: 'quick_setup_sending_confirmation_first',
          userId,
        });

        const messages = {
          'en': `✅ Profile Created!

📊 Your Info:
• Age: ${data.age} years
• Height: ${data.height} cm
• Weight: ${data.weight} kg
• BMI: ${bmi.toFixed(1)}
• Goal: ${goal === 'lose-weight' ? 'Lose Weight' : goal === 'gain-muscle' ? 'Gain Muscle' : 'Maintain Health'}

🎉 You're all set! Send me a food photo to start tracking.`,

          'zh-CN': `✅ 画像已创建！

📊 您的信息：
• 年龄：${data.age} 岁
• 身高：${data.height} cm
• 体重：${data.weight} kg
• BMI：${bmi.toFixed(1)}
• 目标：${goal === 'lose-weight' ? '减脂' : goal === 'gain-muscle' ? '增肌' : '维持健康'}

🎉 设置完成！发送食物照片开始记录。`,

          'zh-TW': `✅ 畫像已創建！

📊 您的信息：
• 年齡：${data.age} 歲
• 身高：${data.height} cm
• 體重：${data.weight} kg
• BMI：${bmi.toFixed(1)}
• 目標：${goal === 'lose-weight' ? '減脂' : goal === 'gain-muscle' ? '增肌' : '維持健康'}

🎉 設置完成！發送食物照片開始記錄。`,
        };

        // Send message immediately
        await whatsappClient.sendTextMessage(
          userId,
          messages[context.language]
        );

        logger.info({
          type: 'quick_setup_confirmation_sent',
          userId,
        });

        // Fire-and-forget database save (don't await, don't block)
        // This prevents Vercel serverless timeout issues
        this.saveProfileToDatabase(userId, context, data, gender, goal, activityLevel).catch(error => {
          logger.error({
            type: 'quick_setup_db_save_failed_background',
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });

        logger.info({
          type: 'quick_setup_completed',
          userId,
        });
      } catch (error) {
        logger.error({
          type: 'quick_setup_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Always try to send error message to user
        try {
          await whatsappClient.sendTextMessage(
            userId,
            '❌ 设置失败，请重试。\n\nSetup failed, please try again.'
          );
        } catch (finalError) {
          logger.error({
            type: 'quick_setup_final_error_send_failed',
            userId,
            error: finalError instanceof Error ? finalError.message : 'Unknown error',
          });
        }
      }
    }

  /**
   * Save profile to database (fire-and-forget background operation)
   */
  private async saveProfileToDatabase(
    userId: string,
    context: MessageContext,
    data: { age: number; height: number; weight: number },
    gender: string,
    goal: string,
    activityLevel: string
  ): Promise<void> {
    logger.info({
      type: 'quick_setup_saving_to_db',
      userId,
    });

    const supabase = await (await import('@/lib/supabase/server')).createClient();
    
    // Step 1: Create or get user record (phone_number -> UUID)
    logger.info({
      type: 'quick_setup_creating_user',
      userId,
    });

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        phone_number: userId,
        whatsapp_name: context.userName || null,
        language: context.language,
      }, {
        onConflict: 'phone_number',
      })
      .select('id')
      .single();

    if (userError || !user) {
      logger.error({
        type: 'quick_setup_user_creation_error',
        userId,
        error: userError?.message || 'No user returned',
      });
      throw new Error('Failed to create user');
    }

    logger.info({
      type: 'quick_setup_user_created',
      userId,
      userUuid: user.id,
    });

    // Step 2: Save health profile with user UUID
    const profileData = {
      user_id: user.id,
      height: data.height,
      weight: data.weight,
      age: data.age,
      gender,
      goal,
      activity_level: activityLevel,
      digest_time: '21:00:00',
      quick_mode: false,
    };

    logger.info({
      type: 'quick_setup_saving_profile',
      userId,
      userUuid: user.id,
      profileData,
    });

    const { error: profileError } = await supabase
      .from('health_profiles')
      .upsert(profileData, {
        onConflict: 'user_id',
      });

    if (profileError) {
      logger.error({
        type: 'quick_setup_profile_save_error',
        userId,
        userUuid: user.id,
        error: profileError.message,
        errorCode: profileError.code,
        errorDetails: JSON.stringify(profileError),
      });
      throw profileError;
    }

    logger.info({
      type: 'quick_setup_db_saved_successfully',
      userId,
      userUuid: user.id,
    });
  }

  /**
   * Try to detect meal advice questions and give recommendations
   * e.g. "午饭吃什么好" / "what should I eat for lunch"
   */
  private async tryMealAdvice(
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<boolean> {
    try {
      logger.info({
        type: 'meal_advice_detected',
        userId: context.userId,
        text: text.substring(0, 50),
      });

      // Get today's consumed nutrition from food_records
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', message.from)
        .maybeSingle();

      let todaySummary = 'No meals logged today yet.';
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data: records } = await supabase
          .from('food_records')
          .select('recognition_result')
          .eq('user_id', user.id)
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);

        if (records && records.length > 0) {
          let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
          const foodNames: string[] = [];
          for (const r of records) {
            const result = r.recognition_result as any;
            if (result?.totalNutrition) {
              totalCal += Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2);
              totalProtein += Math.round((result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2);
              totalCarbs += Math.round((result.totalNutrition.carbs.min + result.totalNutrition.carbs.max) / 2);
              totalFat += Math.round((result.totalNutrition.fat.min + result.totalNutrition.fat.max) / 2);
            }
            if (result?.foods?.[0]) {
              foodNames.push(result.foods[0].nameLocal || result.foods[0].name);
            }
          }
          todaySummary = `Already eaten today: ${foodNames.join(', ')}. Total so far: ${totalCal} kcal, ${totalProtein}g protein, ${totalCarbs}g carbs, ${totalFat}g fat.`;
        }
      }

      // Get user profile for calorie target
      const { profileManager } = await import('@/lib/profile');
      const profile = await profileManager.getProfile(message.from);
      const goal = profile?.goal || 'maintain';
      const targetCal = profile ? this.estimateDailyCalories(profile) : 2000;

      // Ask AI for recommendation
      const { openai } = await import('@/lib/openai/client');
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a Singapore nutrition assistant. The user is asking what to eat next. Give 2-3 specific Singapore hawker food suggestions based on their nutrition gap. Keep it short (under 100 words). Use the user's language. Goal: ${goal}. Daily calorie target: ${targetCal} kcal.`,
          },
          {
            role: 'user',
            content: `${todaySummary}\n\nUser asks: "${text}"`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const advice = resp.choices[0]?.message?.content || '';
      await whatsappClient.sendTextMessage(message.from, `🍴 ${advice}`);
      return true;
    } catch (error) {
      logger.error({
        type: 'meal_advice_error',
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Estimate daily calorie target from profile
   */
  private estimateDailyCalories(profile: any): number {
    const { height, weight, age, gender, activity_level, goal } = profile;
    if (!height || !weight || !age) return 2000;

    // Mifflin-St Jeor
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr += gender === 'male' ? 5 : -161;

    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725,
    };
    let tdee = bmr * (multipliers[activity_level] || 1.375);

    if (goal === 'lose-weight') tdee -= 300;
    if (goal === 'gain-muscle') tdee += 200;

    return Math.round(tdee);
  }

  /**
   * Try to detect and log food from text description
   * Returns true if the message was handled as a food log
   */
  private async tryTextFoodLog(
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<boolean> {
    try {
      logger.info({
        type: 'text_food_log_detected',
        userId: context.userId,
        text: text.substring(0, 50),
      });

      // Send acknowledgment
      const ackMsg = context.language === 'en'
        ? '📝 Got it! Logging your meal...'
        : '📝 收到！正在记录...';
      await whatsappClient.sendTextMessage(message.from, ackMsg);

      // Recognize food from text
      const { foodRecognizer } = await import('@/lib/food-recognition/recognizer');
      const recognition = await foodRecognizer.recognizeFoodFromText(text, {
        userId: context.userId,
        language: context.language,
        mealTime: new Date(),
      });

      if (!recognition.success || !recognition.result) {
        const errMsg = context.language === 'en'
          ? "Couldn't identify the food. Try being more specific, e.g. \"I had 1 plate of chicken rice\""
          : '无法识别食物，试试更具体的描述，例如："吃了一盘鸡饭"';
        await whatsappClient.sendTextMessage(message.from, errMsg);
        return true;
      }

      // Get health rating
      const { ratingEngine } = await import('@/lib/rating/rating-engine');
      const { profileManager } = await import('@/lib/profile');
      const profile = await profileManager.getProfile(context.userId);

      const ratingProfile = profile ? {
        userId: profile.user_id,
        height: profile.height,
        weight: profile.weight,
        age: profile.age ?? undefined,
        gender: profile.gender ?? undefined,
        goal: profile.goal,
        activityLevel: profile.activity_level,
        digestTime: profile.digest_time,
        quickMode: profile.quick_mode,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      } : {
        userId: context.userId,
        height: 170, weight: 65, age: 30,
        gender: 'male' as const, goal: 'maintain' as const,
        activityLevel: 'light' as const, digestTime: '21:00:00',
        quickMode: false, createdAt: new Date(), updatedAt: new Date(),
      };

      const healthRating = await ratingEngine.evaluate(recognition.result, ratingProfile);

      // Save to database (no image)
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', message.from)
        .maybeSingle();

      if (!user) {
        logger.error({ type: 'text_food_log_user_not_found', userId: message.from });
        return true;
      }

      const { data: record } = await supabase
        .from('food_records')
        .insert({
          user_id: user.id,
          image_url: null,
          image_hash: null,
          recognition_result: recognition.result as any,
          health_rating: healthRating as any,
          meal_context: recognition.result.mealContext,
        })
        .select('id')
        .single();

      // Send concise response
      const { responseFormatterSG } = await import('./response-formatter-sg');
      const responseMsg = responseFormatterSG.formatResponse(recognition.result, healthRating);
      await whatsappClient.sendTextMessage(message.from, responseMsg);

      // Send detail/modify/ignore buttons
      if (record) {
        const buttonTexts = {
          'en': { detail: '📊 Details', modify: '✏️ Modify', ignore: '❌ Ignore' },
          'zh-CN': { detail: '📊 详情', modify: '✏️ 修改', ignore: '❌ 忽略' },
          'zh-TW': { detail: '📊 詳情', modify: '✏️ 修改', ignore: '❌ 忽略' },
        };
        const btns = buttonTexts[context.language];
        await whatsappClient.sendInteractiveButtons(
          message.from,
          context.language === 'en' ? 'Tap for more info' : '点击查看更多',
          [
            { id: `detail_${record.id}`, title: btns.detail },
            { id: `modify_${record.id}`, title: btns.modify },
            { id: `ignore_${record.id}`, title: btns.ignore },
          ]
        );
      }

      return true;
    } catch (error) {
      logger.error({
        type: 'text_food_log_error',
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false; // Fall through to normal conversation
    }
  }

  /**
   * Send error message to user
   */
  private async sendErrorMessage(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': '❌ Sorry, something went wrong. Please try again or type /help for assistance.',
      'zh-CN': '❌ 抱歉，出错了。请重试或输入 /help 获取帮助。',
      'zh-TW': '❌ 抱歉，出錯了。請重試或輸入 /help 獲取幫助。',
    };

    try {
      await whatsappClient.sendTextMessage(userId, messages[language]);
    } catch (error) {
      logger.error({
        type: 'error_message_send_failed',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
