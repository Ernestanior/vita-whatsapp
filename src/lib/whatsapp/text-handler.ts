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
  SETTINGS = 'settings',
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
      // TEMPORARY: Quick response for debugging
      logger.info({
        type: 'sending_quick_test_response',
        messageId: message.id,
      });
      
      await whatsappClient.sendTextMessage(
        message.from,
        `✅ Message received: "${text}"\n\nI'm working! Send /help for commands.`
      );
      
      logger.info({
        type: 'quick_test_response_sent',
        messageId: message.id,
      });
      
      return; // TEMPORARY: Skip other processing for now
      
      // Check if user is in profile setup flow
      if (profileManager.isInSetupFlow(context.userId)) {
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

      // Check if it's a command
      const command = this.recognizeCommand(text);

      if (command !== Command.UNKNOWN) {
        await this.handleCommand(command, message, context);
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
   */
  private recognizeCommand(text: string): Command {
    const normalizedText = text.trim().toLowerCase();

    // Command mappings (English and Chinese)
    const commandMap: Record<string, Command> = {
      // Start command
      '/start': Command.START,
      '开始': Command.START,
      '開始': Command.START,
      
      // Profile command
      '/profile': Command.PROFILE,
      '/画像': Command.PROFILE,
      '/畫像': Command.PROFILE,
      '画像': Command.PROFILE,
      '畫像': Command.PROFILE,
      '个人资料': Command.PROFILE,
      '個人資料': Command.PROFILE,
      
      // Help command
      '/help': Command.HELP,
      '/帮助': Command.HELP,
      '/幫助': Command.HELP,
      '帮助': Command.HELP,
      '幫助': Command.HELP,
      
      // Stats command
      '/stats': Command.STATS,
      '/统计': Command.STATS,
      '/統計': Command.STATS,
      '统计': Command.STATS,
      '統計': Command.STATS,
      
      // Settings command
      '/settings': Command.SETTINGS,
      '/设置': Command.SETTINGS,
      '/設置': Command.SETTINGS,
      '设置': Command.SETTINGS,
      '設置': Command.SETTINGS,
    };

    return commandMap[normalizedText] || Command.UNKNOWN;
  }

  /**
   * Handle recognized command
   */
  private async handleCommand(
    command: Command,
    message: Message,
    context: MessageContext
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

      case Command.SETTINGS:
        await this.handleSettingsCommand(message.from, context);
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
    // Check if user already has a profile
    const hasProfile = await profileManager.hasProfile(userId);

    if (hasProfile) {
      // User already has profile, send welcome back message
      const messages = {
        'en': `👋 Welcome back to Vita AI!

You're all set up. Send me a photo of your meal to get started!

Commands:
/profile - View your health profile
/stats - View your statistics
/help - Get help`,
        
        'zh-CN': `👋 欢迎回到 Vita AI！

您已经设置完成。发送食物照片开始吧！

命令：
/profile - 查看健康画像
/stats - 查看统计数据
/help - 获取帮助`,
        
        'zh-TW': `👋 歡迎回到 Vita AI！

您已經設置完成。發送食物照片開始吧！

命令：
/profile - 查看健康畫像
/stats - 查看統計數據
/help - 獲取幫助`,
      };

      await whatsappClient.sendTextMessage(userId, messages[context.language]);
    } else {
      // Start profile setup
      await profileManager.initializeProfile(userId, context.language);
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
      'en': `🤖 Vita AI Help

*Available Commands:*
/start - Get started and set up your profile
/profile - View or update your health profile
/stats - View your nutrition statistics
/help - Show this help message
/settings - Adjust your preferences

*How to Use:*
📸 Send a photo of your food to get instant nutrition analysis
💬 Chat with me in natural language to update your profile
🎯 Get personalized health recommendations based on your goals

*Supported Languages:*
English, 简体中文, 繁體中文

Need more help? Just ask me anything!`,
      
      'zh-CN': `🤖 Vita AI 帮助

*可用命令：*
/start - 开始使用并设置画像
/profile - 查看或更新健康画像
/stats - 查看营养统计
/help - 显示此帮助信息
/settings - 调整偏好设置

*使用方法：*
📸 发送食物照片获取即时营养分析
💬 用自然语言与我聊天更新画像
🎯 根据您的目标获得个性化健康建议

*支持语言：*
English, 简体中文, 繁體中文

需要更多帮助？随时问我！`,
      
      'zh-TW': `🤖 Vita AI 幫助

*可用命令：*
/start - 開始使用並設置畫像
/profile - 查看或更新健康畫像
/stats - 查看營養統計
/help - 顯示此幫助資訊
/settings - 調整偏好設置

*使用方法：*
📸 發送食物照片獲取即時營養分析
💬 用自然語言與我聊天更新畫像
🎯 根據您的目標獲得個性化健康建議

*支持語言：*
English, 简体中文, 繁體中文

需要更多幫助？隨時問我！`,
    };

    await whatsappClient.sendTextMessage(
      userId,
      messages[context.language]
    );
  }

  /**
   * Handle /stats command - Show nutrition statistics
   */
  private async handleStatsCommand(
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

    // TODO: Implement natural language understanding for profile updates
    // For now, provide a helpful response

    const messages = {
      'en': `I understand you said: "${text}"

I'm still learning to understand natural language! For now, please use these commands:
/start - Get started
/help - See all commands
📸 Or send a photo of your food for nutrition analysis`,
      
      'zh-CN': `我收到您的消息："${text}"

我还在学习理解自然语言！现在请使用这些命令：
/start - 开始使用
/help - 查看所有命令
📸 或发送食物照片进行营养分析`,
      
      'zh-TW': `我收到您的消息："${text}"

我還在學習理解自然語言！現在請使用這些命令：
/start - 開始使用
/help - 查看所有命令
📸 或發送食物照片進行營養分析`,
    };

    logger.info({
      type: 'sending_natural_language_response',
      messageId: message.id,
      to: message.from,
      language: context.language,
    });

    try {
      await whatsappClient.sendTextMessage(
        message.from,
        messages[context.language]
      );
      
      logger.info({
        type: 'natural_language_response_sent',
        messageId: message.id,
      });
    } catch (error) {
      logger.error({
        type: 'natural_language_response_error',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
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
