/**
 * TextHandler V2 - AI-Powered Intelligent Message Handler
 * 
 * Uses AI to understand context and make intelligent routing decisions
 * instead of simple pattern matching
 */

import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { profileManager } from '@/lib/profile';
import { conversationRouter } from '@/lib/ai/conversation-router';
import type { Message, MessageContext } from '@/types/whatsapp';

export class TextHandlerV2 {
  /**
   * Handle incoming text message with AI intelligence
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
      type: 'text_message_processing_v2',
      messageId: message.id,
      textLength: text.length,
      language: context.language,
      text: text.substring(0, 50),
    });

    try {
      // Check if user is in profile setup flow first
      if (await profileManager.isInSetupFlow(context.userId)) {
        const setupComplete = await profileManager.processSetupInput(
          context.userId,
          text,
          context.language
        );

        if (setupComplete) {
          logger.info({
            type: 'profile_setup_completed_via_text',
            userId: context.userId,
          });
        }
        return;
      }

      // Use AI to analyze the message and decide what to do
      logger.info({
        type: 'analyzing_conversation_with_ai',
        messageId: message.id,
      });

      const decision = await conversationRouter.analyze(text, context);

      logger.info({
        type: 'ai_decision_made',
        messageId: message.id,
        action: decision.action,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
      });

      // Execute the decided action
      switch (decision.action) {
        case 'VIEW_PROFILE':
          await this.handleViewProfile(context);
          break;

        case 'UPDATE_PROFILE':
          await this.handleUpdateProfile(context, text, decision.extractedData);
          break;

        case 'NEED_CURRENT_DATA':
          await this.handleRelativeChange(context, text, decision.extractedData);
          break;

        case 'VIEW_STATS':
          await this.handleViewStats(context);
          break;

        case 'VIEW_HISTORY':
          await this.handleViewHistory(context);
          break;

        case 'HELP':
          await this.handleHelp(context);
          break;

        case 'START':
          await this.handleStart(context);
          break;

        case 'SETTINGS':
          await this.handleSettings(context);
          break;

        case 'CHAT':
          await this.handleChat(text, context);
          break;

        default:
          // If AI is unsure, try natural language profile update as fallback
          const wasProfileUpdate = await profileManager.parseNaturalLanguageUpdate(
            context.userId,
            text,
            context.language
          );

          if (!wasProfileUpdate) {
            // Last resort: general chat
            await this.handleChat(text, context);
          }
      }

    } catch (error) {
      logger.error({
        type: 'text_handling_error_v2',
        messageId: message.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      await this.sendErrorMessage(context.userId, context.language);
    }
  }

  /**
   * Handle VIEW_PROFILE action
   */
  private async handleViewProfile(context: MessageContext): Promise<void> {
    const profile = await profileManager.getProfile(context.userId);

    if (!profile) {
      // No profile, start setup
      await profileManager.initializeProfile(context.userId, context.language);
      return;
    }

    // Calculate BMI
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
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Handle UPDATE_PROFILE action
   */
  private async handleUpdateProfile(
    context: MessageContext,
    text: string,
    extractedData?: any
  ): Promise<void> {
    // Use AI-extracted data if available, otherwise use regex parsing
    if (extractedData && Object.keys(extractedData).length > 0) {
      await profileManager.updateProfile(context.userId, extractedData);

      const messages = {
        'en': `✅ Profile updated successfully!

${extractedData.height ? `• Height: ${extractedData.height} cm\n` : ''}${extractedData.weight ? `• Weight: ${extractedData.weight} kg\n` : ''}${extractedData.age ? `• Age: ${extractedData.age}\n` : ''}`,
        'zh-CN': `✅ 画像更新成功！

${extractedData.height ? `• 身高：${extractedData.height} 厘米\n` : ''}${extractedData.weight ? `• 体重：${extractedData.weight} 公斤\n` : ''}${extractedData.age ? `• 年龄：${extractedData.age}\n` : ''}`,
        'zh-TW': `✅ 畫像更新成功！

${extractedData.height ? `• 身高：${extractedData.height} 厘米\n` : ''}${extractedData.weight ? `• 體重：${extractedData.weight} 公斤\n` : ''}${extractedData.age ? `• 年齡：${extractedData.age}\n` : ''}`,
      };

      await whatsappClient.sendTextMessage(context.userId, messages[context.language]);
    } else {
      // Fallback to regex parsing
      await profileManager.parseNaturalLanguageUpdate(
        context.userId,
        text,
        context.language
      );
    }
  }

  /**
   * Handle NEED_CURRENT_DATA action - for relative changes like "gained 2kg"
   */
  private async handleRelativeChange(
    context: MessageContext,
    text: string,
    extractedData?: any
  ): Promise<void> {
    // Get current profile
    const profile = await profileManager.getProfile(context.userId);

    if (!profile) {
      // No profile, ask user to set up first
      const messages = {
        'en': `I need to know your current weight first! Please tell me:
"I'm currently 70kg"`,
        'zh-CN': `我需要先知道您当前的体重！请告诉我：
"我现在 70kg"`,
        'zh-TW': `我需要先知道您當前的體重！請告訴我：
"我現在 70kg"`,
      };
      await whatsappClient.sendTextMessage(context.userId, messages[context.language]);
      return;
    }

    // Calculate new values based on changes
    const updates: any = {};

    if (extractedData?.weightChange !== undefined && profile.weight) {
      const newWeight = profile.weight + extractedData.weightChange;
      updates.weight = Math.round(newWeight * 10) / 10; // Round to 1 decimal
    }

    if (extractedData?.heightChange !== undefined && profile.height) {
      const newHeight = profile.height + extractedData.heightChange;
      updates.height = Math.round(newHeight);
    }

    if (Object.keys(updates).length === 0) {
      // No valid changes detected
      const messages = {
        'en': `I couldn't understand the change. Please tell me your current weight:
"I'm now 70kg"`,
        'zh-CN': `我没理解您的变化。请告诉我您现在的体重：
"我现在 70kg"`,
        'zh-TW': `我沒理解您的變化。請告訴我您現在的體重：
"我現在 70kg"`,
      };
      await whatsappClient.sendTextMessage(context.userId, messages[context.language]);
      return;
    }

    // Update profile
    await profileManager.updateProfile(context.userId, updates);

    // Send confirmation with change details
    const weightChange = extractedData?.weightChange;
    const changeText = weightChange > 0 
      ? (context.language === 'en' ? `gained ${Math.abs(weightChange)}kg` : `增加了 ${Math.abs(weightChange)}kg`)
      : (context.language === 'en' ? `lost ${Math.abs(weightChange)}kg` : `减少了 ${Math.abs(weightChange)}kg`);

    const messages = {
      'en': `✅ Got it! You ${changeText}.

Your new weight: ${updates.weight} kg
Previous weight: ${profile.weight} kg

Keep it up! 💪`,
      'zh-CN': `✅ 明白了！您${changeText}。

新体重：${updates.weight} 公斤
之前体重：${profile.weight} 公斤

继续加油！💪`,
      'zh-TW': `✅ 明白了！您${changeText}。

新體重：${updates.weight} 公斤
之前體重：${profile.weight} 公斤

繼續加油！💪`,
    };

    await whatsappClient.sendTextMessage(context.userId, messages[context.language]);
  }

  /**
   * Handle VIEW_STATS action
   */
  private async handleViewStats(context: MessageContext): Promise<void> {
    // Import the stats handler from original text-handler
    const { TextHandler } = await import('./text-handler');
    const originalHandler = new TextHandler();
    await (originalHandler as any).handleStatsCommand(context.userId, context);
  }

  /**
   * Handle VIEW_HISTORY action
   */
  private async handleViewHistory(context: MessageContext): Promise<void> {
    // Import the history handler from original text-handler
    const { TextHandler } = await import('./text-handler');
    const originalHandler = new TextHandler();
    await (originalHandler as any).handleHistoryCommand(context.userId, context);
  }

  /**
   * Handle HELP action
   */
  private async handleHelp(context: MessageContext): Promise<void> {
    const messages = {
      'en': `🤖 Vita AI Help

*How to Use:*
📸 Send a photo of your food to get instant nutrition analysis
💬 Tell me about yourself to set up your profile
🎯 Get personalized health recommendations

*Quick Actions:*
Use the buttons below to get started!`,
      
      'zh-CN': `🤖 Vita AI 帮助

*使用方法：*
📸 发送食物照片获取即时营养分析
💬 告诉我您的信息来设置画像
🎯 获得个性化健康建议

*快速操作：*
使用下方按钮开始！`,
      
      'zh-TW': `🤖 Vita AI 幫助

*使用方法：*
📸 發送食物照片獲取即時營養分析
💬 告訴我您的信息來設置畫像
🎯 獲得個性化健康建議

*快速操作：*
使用下方按鈕開始！`,
    };

    await whatsappClient.sendButtonMessage(
      context.userId,
      messages[context.language],
      [
        { id: 'start', title: '🚀 Get Started' },
        { id: 'profile', title: '👤 My Profile' },
        { id: 'stats', title: '📊 Statistics' },
      ]
    );
  }

  /**
   * Handle START action
   */
  private async handleStart(context: MessageContext): Promise<void> {
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

    await whatsappClient.sendButtonMessage(
      context.userId,
      messages[context.language],
      [
        { id: 'help', title: '❓ Help' },
      ]
    );
  }

  /**
   * Handle SETTINGS action
   */
  private async handleSettings(context: MessageContext): Promise<void> {
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
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Handle CHAT action - General conversation
   */
  private async handleChat(text: string, context: MessageContext): Promise<void> {
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

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    await whatsappClient.sendTextMessage(context.userId, reply);
  }

  /**
   * Send error message
   */
  private async sendErrorMessage(userId: string, language: 'en' | 'zh-CN' | 'zh-TW'): Promise<void> {
    const messages = {
      'en': '❌ Sorry, something went wrong. Please try again.',
      'zh-CN': '❌ 抱歉，出错了。请重试。',
      'zh-TW': '❌ 抱歉，出錯了。請重試。',
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
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
}

// Singleton instance
export const textHandlerV2 = new TextHandlerV2();
