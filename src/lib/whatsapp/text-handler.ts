import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { profileManager } from '@/lib/profile';
import type { Message, MessageContext } from '@/types/whatsapp';

/**
 * Command types supported by the bot
 */
export enum Command {
  START = 'start',
  PROFILE = 'profile',
  HELP = 'help',
  STATS = 'stats',
  HISTORY = 'history',
  SETTINGS = 'settings',
  // Phase 3 commands
  STREAK = 'streak',
  BUDGET = 'budget',
  CARD = 'card',
  REMINDERS = 'reminders',
  COMPARE = 'compare',
  PROGRESS = 'progress',
  PREFERENCES = 'preferences',
  UNKNOWN = 'unknown',
}

/**
 * TextHandler - Handles text messages and commands
 * 
 * Responsibilities:
 * - Recognize commands (/start, /profile, /help, /stats)
 * - Handle natural language for profile updates
 * - Support both English and Chinese commands
 */
export class TextHandler {
  /**
   * Handle incoming text message
   */
  async handle(message: Message, context: MessageContext): Promise<void> {
    const text = message.text?.body;

    if (!text) {
      logger.warn({
        type: 'empty_text_message',
        messageId: message.id,
      });
      return;
    }

    logger.info({
      type: 'text_message_processing',
      messageId: message.id,
      textLength: text.length,
      language: context.language,
      text: text.substring(0, 50), // Log first 50 chars
    });

    try {
      logger.info({
        type: 'recognizing_command',
        messageId: message.id,
      });

      // Check if it's a command first (commands should work even during setup)
      const command = await this.recognizeCommand(text);
      
      logger.info({
        type: 'command_recognized_result',
        messageId: message.id,
        command,
      });

      // Allow certain commands to cancel setup flow
      if (command === Command.HELP || command === Command.START) {
        logger.info({
          type: 'checking_setup_flow',
          messageId: message.id,
          userId: context.userId,
        });

        // Cancel any ongoing setup
        if (await profileManager.isInSetupFlow(context.userId)) {
          logger.info({
            type: 'profile_setup_cancelled_by_command',
            userId: context.userId,
            command,
          });
          // Clear the setup session
          await profileManager.cancelSetup(context.userId);
        }

        logger.info({
          type: 'handling_command',
          messageId: message.id,
          command,
        });

        await this.handleCommand(command, message, context, text);
        return;
      }
      
      // Check if user is in profile setup flow
      if (await profileManager.isInSetupFlow(context.userId)) {
        const setupComplete = await profileManager.processSetupInput(
          context.userId,
          text,
          context.language
        );

        if (setupComplete) {
          // Setup complete, continue with normal message handling
          logger.info({
            type: 'profile_setup_completed_via_text',
            userId: context.userId,
          });
        }
        return; // Don't process further if in setup flow
      }

      // Handle other commands
      if (command !== Command.UNKNOWN) {
        await this.handleCommand(command, message, context, text);
      } else {
        // Try to parse as natural language profile update
        const wasProfileUpdate = await profileManager.parseNaturalLanguageUpdate(
          context.userId,
          text,
          context.language
        );

        if (!wasProfileUpdate) {
          // Handle as general natural language
          await this.handleNaturalLanguage(text, message, context);
        }
      }
    } catch (error) {
      logger.error({
        type: 'text_handling_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Send error message to user
      await this.sendErrorMessage(message.from, context.language);
    }
  }

  /**
   * Recognize command from text
   * Supports both English and Chinese commands
   * Uses AI for natural language intent recognition
   */
  private async recognizeCommand(text: string): Promise<Command> {
    const normalizedText = text.trim().toLowerCase();
    
    // Extract first word for command matching (to support commands with arguments)
    const firstWord = normalizedText.split(/\s+/)[0];

    // Exact command mappings (English and Chinese) - fast path
    const commandMap: Record<string, Command> = {
      // Start command
      '/start': Command.START,
      'start': Command.START,
      '开始': Command.START,
      '開始': Command.START,
      
      // Profile command
      '/profile': Command.PROFILE,
      'profile': Command.PROFILE,
      '/画像': Command.PROFILE,
      '/畫像': Command.PROFILE,
      '画像': Command.PROFILE,
      '畫像': Command.PROFILE,
      '个人资料': Command.PROFILE,
      '個人資料': Command.PROFILE,
      
      // Help command
      '/help': Command.HELP,
      'help': Command.HELP,
      '/帮助': Command.HELP,
      '/幫助': Command.HELP,
      '帮助': Command.HELP,
      '幫助': Command.HELP,
      
      // Stats command
      '/stats': Command.STATS,
      'stats': Command.STATS,
      '/统计': Command.STATS,
      '/統計': Command.STATS,
      '统计': Command.STATS,
      '統計': Command.STATS,
      
      // History command
      '/history': Command.HISTORY,
      'history': Command.HISTORY,
      '/历史': Command.HISTORY,
      '/歷史': Command.HISTORY,
      '历史': Command.HISTORY,
      '歷史': Command.HISTORY,
      
      // Settings command
      '/settings': Command.SETTINGS,
      'settings': Command.SETTINGS,
      '/设置': Command.SETTINGS,
      '/設置': Command.SETTINGS,
      '设置': Command.SETTINGS,
      '設置': Command.SETTINGS,
      
      // Phase 3: Streak command
      '/streak': Command.STREAK,
      'streak': Command.STREAK,
      '/连续': Command.STREAK,
      '/連續': Command.STREAK,
      '连续': Command.STREAK,
      '連續': Command.STREAK,
      '/打卡': Command.STREAK,
      '打卡': Command.STREAK,
      
      // Phase 3: Budget command
      '/budget': Command.BUDGET,
      'budget': Command.BUDGET,
      '/预算': Command.BUDGET,
      '/預算': Command.BUDGET,
      '预算': Command.BUDGET,
      '預算': Command.BUDGET,
      
      // Phase 3: Card command
      '/card': Command.CARD,
      'card': Command.CARD,
      '/卡片': Command.CARD,
      '卡片': Command.CARD,
      
      // Phase 3: Reminders command
      '/reminders': Command.REMINDERS,
      'reminders': Command.REMINDERS,
      '/提醒': Command.REMINDERS,
      '提醒': Command.REMINDERS,
      
      // Phase 3: Compare command
      '/compare': Command.COMPARE,
      'compare': Command.COMPARE,
      '/对比': Command.COMPARE,
      '/對比': Command.COMPARE,
      '对比': Command.COMPARE,
      '對比': Command.COMPARE,
      
      // Phase 3: Progress command
      '/progress': Command.PROGRESS,
      'progress': Command.PROGRESS,
      '/进度': Command.PROGRESS,
      '/進度': Command.PROGRESS,
      '进度': Command.PROGRESS,
      '進度': Command.PROGRESS,
      
      // Phase 3: Preferences command
      '/preferences': Command.PREFERENCES,
      'preferences': Command.PREFERENCES,
      '/偏好': Command.PREFERENCES,
      '偏好': Command.PREFERENCES,
    };

    // Check exact match on full text first
    const exactMatch = commandMap[normalizedText];
    if (exactMatch) {
      return exactMatch;
    }
    
    // Check first word match (for commands with arguments like "budget set 1800")
    const firstWordMatch = commandMap[firstWord];
    if (firstWordMatch) {
      return firstWordMatch;
    }

    // CRITICAL FIX: Check for Phase 3 commands with partial matching
    // This ensures commands work even if AI fails or doesn't recognize them
    const phase3Keywords = {
      streak: ['streak', '连续', '連續', '打卡'],
      budget: ['budget', '预算', '預算'],
      card: ['card', '卡片'],
      reminders: ['reminders', 'reminder', '提醒'],
      compare: ['compare', '对比', '對比'],
      progress: ['progress', '进度', '進度'],
      preferences: ['preferences', 'preference', '偏好', 'settings', '设置', '設置'],
    };

    for (const [command, keywords] of Object.entries(phase3Keywords)) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          logger.info({
            type: 'phase3_command_matched_by_keyword',
            keyword,
            command,
            text: text.substring(0, 50),
          });
          
          // Map to Command enum
          const commandMapping: Record<string, Command> = {
            'streak': Command.STREAK,
            'budget': Command.BUDGET,
            'card': Command.CARD,
            'reminders': Command.REMINDERS,
            'compare': Command.COMPARE,
            'progress': Command.PROGRESS,
            'preferences': Command.PREFERENCES,
          };
          
          return commandMapping[command] || Command.UNKNOWN;
        }
      }
    }

    // Use AI for natural language intent recognition (only for non-Phase3 commands)
    try {
      const intent = await this.detectIntentWithAI(text);
      return intent;
    } catch (error) {
      logger.error({
        type: 'intent_detection_error',
        text: text.substring(0, 50),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fallback to UNKNOWN if AI fails
      return Command.UNKNOWN;
    }
  }

  /**
   * Use AI to detect user intent from natural language
   * Uses Gemini 2.0 Flash (primary) with GPT-4o-mini fallback
   */
  private async detectIntentWithAI(text: string): Promise<Command> {
    const { intentDetector, Intent } = await import('@/lib/ai/intent-detector');
    
    const intent = await intentDetector.detect(text);

    // Map Intent enum to Command enum
    const intentMap: Record<string, Command> = {
      [Intent.STATS]: Command.STATS,
      [Intent.HISTORY]: Command.HISTORY,
      [Intent.PROFILE]: Command.PROFILE,
      [Intent.HELP]: Command.HELP,
      [Intent.START]: Command.START,
      [Intent.SETTINGS]: Command.SETTINGS,
      [Intent.UNKNOWN]: Command.UNKNOWN,
    };

    return intentMap[intent] || Command.UNKNOWN;
  }

  /**
   * Handle recognized command
   */
  private async handleCommand(
    command: Command,
    message: Message,
    context: MessageContext,
    originalText: string
  ): Promise<void> {
    logger.info({
      type: 'command_recognized',
      command,
      messageId: message.id,
    });

    switch (command) {
      case Command.START:
        await this.handleStartCommand(message.from, context);
        break;

      case Command.PROFILE:
        await this.handleProfileCommand(message.from, context);
        break;

      case Command.HELP:
        await this.handleHelpCommand(message.from, context);
        break;

      case Command.STATS:
        await this.handleStatsCommand(message.from, context);
        break;

      case Command.HISTORY:
        await this.handleHistoryCommand(message.from, context);
        break;

      case Command.SETTINGS:
        await this.handleSettingsCommand(message.from, context);
        break;

      // Phase 3 commands
      case Command.STREAK:
      case Command.BUDGET:
      case Command.CARD:
      case Command.REMINDERS:
      case Command.COMPARE:
      case Command.PROGRESS:
      case Command.PREFERENCES:
        await this.handlePhase3Command(command, message.from, context, originalText);
        break;

      default:
        logger.warn({
          type: 'unhandled_command',
          command,
          messageId: message.id,
        });
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
   * Handle /stats command - Show nutrition statistics
   */
  private async handleStatsCommandOld(
    userId: string,
    context: MessageContext
  ): Promise<void> {
    // TODO: Fetch user statistics from database
    const messages = {
      'en': `📈 Your Statistics

This feature is coming soon! You'll be able to see:
• Total meals tracked
• Average daily calories
• Health score trends
• Nutrition breakdown

Start tracking by sending photos of your meals!`,
      
      'zh-CN': `📈 您的统计数据

此功能即将上线！您将能够查看：
• 记录的总餐数
• 平均每日卡路里
• 健康评分趋势
• 营养成分分布

开始发送食物照片来记录吧！`,
      
      'zh-TW': `📈 您的統計數據

此功能即將上線！您將能夠查看：
• 記錄的總餐數
• 平均每日卡路里
• 健康評分趨勢
• 營養成分分佈

開始發送食物照片來記錄吧！`,
    };

    await whatsappClient.sendTextMessage(
      userId,
      messages[context.language]
    );
  }

  /**
   * Handle Phase 3 commands
   */
  private async handlePhase3Command(
    command: Command,
    userId: string,
    context: MessageContext,
    originalText: string
  ): Promise<void> {
    const { createPhase3CommandHandler } = await import('@/lib/phase3/commands/command-handler');
    const handler = await createPhase3CommandHandler();
    
    // Map Command enum to Phase3Command type
    const commandMap: Record<string, string> = {
      [Command.STREAK]: 'streak',
      [Command.BUDGET]: 'budget',
      [Command.CARD]: 'card',
      [Command.REMINDERS]: 'reminders',
      [Command.COMPARE]: 'compare',
      [Command.PROGRESS]: 'progress',
      [Command.PREFERENCES]: 'preferences',
    };
    
    const phase3Command = commandMap[command] as any;
    if (phase3Command) {
      // Parse arguments from original text
      const parts = originalText.trim().split(/\s+/);
      const args = parts.slice(1); // Skip the command itself
      
      await handler.handleCommand(phase3Command, userId, context.language, args);
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

  /**
   * Handle natural language input
   * Used for profile updates and general conversation
   */
  private async handleNaturalLanguage(
    text: string,
    message: Message,
    context: MessageContext
  ): Promise<void> {
    logger.info({
      type: 'natural_language_processing',
      messageId: message.id,
      textLength: text.length,
    });

    // Check for greetings first
    const normalizedText = text.trim().toLowerCase();
    const greetings = [
      'hi', 'hello', 'hey', 'hola', 'bonjour',
      '你好', '您好', '嗨', '哈喽', '哈啰',
      'start', 'begin', '开始', '開始'
    ];
    
    if (greetings.some(greeting => normalizedText === greeting || normalizedText.includes(greeting))) {
      // Treat as start command
      await this.handleStartCommand(message.from, context);
      return;
    }

    // Try to parse as quick setup: "age height weight"
    const quickSetupMatch = text.trim().match(/^(\d{1,3})\s+(\d{2,3})\s+(\d{2,3})$/);
    if (quickSetupMatch) {
      const [, age, height, weight] = quickSetupMatch;
      await this.handleQuickSetup(message.from, context, {
        age: parseInt(age),
        height: parseInt(height),
        weight: parseInt(weight),
      });
      return;
    }

    // Use AI to respond to general questions
    try {
      // Use intelligent conversation handler with full context
      const { intelligentConversation } = await import('@/lib/ai/intelligent-conversation');
      const aiResponse = await intelligentConversation.generateResponse(text, message.from, context);
      await whatsappClient.sendTextMessage(message.from, aiResponse);
      
      // After AI response, try to extract and save preferences (don't let this fail the whole flow)
      try {
        const { PreferenceService } = await import('@/lib/phase3/services/preference-manager');
        const supabase = await (await import('@/lib/supabase/server')).createClient();
        const preferenceService = new PreferenceService(supabase);
        
        // Get user UUID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('phone_number', message.from)
          .maybeSingle();
        
        if (user) {
          // Try to extract preferences from the conversation
          await preferenceService.extractFromConversation(user.id, text, context.language);
        }
      } catch (prefError) {
        // Log but don't fail - preference extraction is optional
        logger.warn({
          type: 'preference_extraction_failed',
          error: prefError instanceof Error ? prefError.message : 'Unknown error',
        });
      }
    } catch (error) {
      logger.error({
        type: 'ai_response_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Fallback to default response if AI fails
      const messages = {
        'en': `I'm not sure what you mean 🤔

Try these:
• Send 3 numbers for quick setup: \`25 170 65\`
• Send a food photo for analysis 📸
• Click a button below for help`,
        
        'zh-CN': `我不太明白您的意思 🤔

试试这些：
• 发送 3 个数字快速设置：\`25 170 65\`
• 发送食物照片进行分析 📸
• 点击下方按钮获取帮助`,
        
        'zh-TW': `我不太明白您的意思 🤔

試試這些：
• 發送 3 個數字快速設置：\`25 170 65\`
• 發送食物照片進行分析 📸
• 點擊下方按鈕獲取幫助`,
      };

      await whatsappClient.sendButtonMessage(
        message.from,
        messages[context.language],
        [
          { id: 'start', title: '🚀 Get Started' },
          { id: 'help', title: '❓ Help' },
        ]
      );
    }
  }

  /**
   * Get AI response for general conversation
   */
  private async getAIResponse(text: string, context: MessageContext): Promise<string> {
    const { OpenAI } = await import('openai');
    const { env } = await import('@/config/env');
    
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const systemPrompt = context.language === 'zh-CN' || context.language === 'zh-TW'
      ? `你是 Vita AI，一个友好的新加坡营养助手。你的职责是：
1. 用新加坡华语风格回答问题（可以适当加入"lah"、"leh"等语气词）
2. 回答关于营养、健康、饮食的问题
3. 引导用户使用核心功能：发送食物照片进行分析
4. 保持简短、友好、有帮助的回复（不超过100字）
5. 如果用户问你是谁，介绍自己是新加坡营养助手，可以分析食物照片

语气示例：
- "可以 lah！"
- "这个很 shiok 的！"
- "不用担心 leh"
- "试试看 lah"

记住：你的核心功能是分析食物照片，所以要适时引导用户使用这个功能。`
      : `You are Vita AI, a friendly Singaporean nutrition assistant. Your role is to:
1. Answer in Singaporean English style (can use "lah", "leh", "lor" naturally)
2. Answer questions about nutrition, health, and diet
3. Guide users to use your core feature: sending food photos for analysis
4. Keep responses short, friendly, and helpful (under 100 words)
5. If asked who you are, introduce yourself as a Singaporean nutrition assistant that can analyze food photos

Tone examples:
- "Can lah!"
- "Very shiok one!"
- "Don't worry leh"
- "Try it lah"

Remember: Your core feature is analyzing food photos, so guide users to use this feature when appropriate.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  /**
   * Handle quick setup with 3 numbers
   */
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
