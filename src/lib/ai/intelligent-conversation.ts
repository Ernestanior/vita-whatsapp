/**
 * Intelligent Conversation Handler
 * Provides context-aware, reasoning-capable AI responses
 */

import { OpenAI } from 'openai';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { createClient } from '@/lib/supabase/server';
import type { MessageContext } from '@/types/whatsapp';

interface ConversationContext {
  userProfile?: {
    age?: number;
    height?: number;
    weight?: number;
    gender?: string;
    goal?: string;
    activityLevel?: string;
  };
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  recentMeals: Array<{
    foodName: string;
    calories: number;
    timestamp: Date;
  }>;
  userPreferences?: {
    dietaryType: string[];
    allergies: string[];
  };
  streakInfo?: {
    currentStreak: number;
    longestStreak: number;
  };
}

export class IntelligentConversationHandler {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate intelligent response with full context
   */
  async generateResponse(
    userMessage: string,
    userId: string,
    context: MessageContext
  ): Promise<string> {
    try {
      // Gather comprehensive context
      const conversationContext = await this.gatherContext(userId);

      // Build intelligent system prompt
      const systemPrompt = this.buildIntelligentSystemPrompt(conversationContext, context.language);

      // Build conversation history
      const messages = this.buildConversationHistory(conversationContext, userMessage);

      // Generate response with GPT-4o-mini (better reasoning)
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Store this conversation for future context
      await this.storeConversation(userId, userMessage, aiResponse);

      return aiResponse;

    } catch (error) {
      logger.error({
        type: 'intelligent_conversation_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Gather comprehensive context about the user
   */
  private async gatherContext(userId: string): Promise<ConversationContext> {
    const supabase = await createClient();

    // Get user UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .maybeSingle();

    if (!user) {
      return { recentMessages: [], recentMeals: [] };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get recent meals (last 5)
    const { data: meals } = await supabase
      .from('food_records')
      .select('recognition_result, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentMeals = meals?.map(meal => {
      const result = meal.recognition_result as any;
      return {
        foodName: result.foods[0]?.nameLocal || result.foods[0]?.name || 'Unknown',
        calories: Math.round((result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2),
        timestamp: new Date(meal.created_at),
      };
    }) || [];

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('dietary_type, allergies')
      .eq('user_id', user.id)
      .maybeSingle();

    // Get streak info
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', user.id)
      .maybeSingle();

    return {
      userProfile: profile ? {
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        gender: profile.gender,
        goal: profile.goal,
        activityLevel: profile.activity_level,
      } : undefined,
      recentMessages: [], // TODO: Implement message history storage
      recentMeals,
      userPreferences: preferences ? {
        dietaryType: preferences.dietary_type || [],
        allergies: (preferences.allergies as string[]) || [],
      } : undefined,
      streakInfo: streak ? {
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
      } : undefined,
    };
  }

  /**
   * Build intelligent system prompt with context
   */
  private buildIntelligentSystemPrompt(
    context: ConversationContext,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): string {
    const isChinese = language === 'zh-CN' || language === 'zh-TW';

    let prompt = isChinese
      ? `你是 Vita AI，一个智能营养助手。你能够：

1. **理解上下文**：记住用户之前说过的话，理解隐含的意图
2. **主动推理**：从用户的信息中推断出他们真正需要什么
3. **个性化建议**：基于用户的个人资料和历史记录提供定制建议
4. **自然对话**：像朋友一样聊天，不要机械地重复相同的话

`
      : `You are Vita AI, an intelligent nutrition assistant. You can:

1. **Understand Context**: Remember what users said before, understand implicit intentions
2. **Proactive Reasoning**: Infer what users really need from their information
3. **Personalized Advice**: Provide customized suggestions based on user profile and history
4. **Natural Conversation**: Chat like a friend, don't mechanically repeat the same things

`;

    // Add user profile context
    if (context.userProfile) {
      const { age, height, weight, gender, goal } = context.userProfile;
      prompt += isChinese
        ? `\n**用户资料：**\n`
        : `\n**User Profile:**\n`;

      if (gender) prompt += isChinese ? `- 性别：${gender === 'female' ? '女' : '男'}\n` : `- Gender: ${gender}\n`;
      if (age) prompt += isChinese ? `- 年龄：${age}岁\n` : `- Age: ${age} years\n`;
      if (height) prompt += isChinese ? `- 身高：${height}cm\n` : `- Height: ${height}cm\n`;
      if (weight) prompt += isChinese ? `- 体重：${weight}kg\n` : `- Weight: ${weight}kg\n`;
      if (goal) {
        const goalText = goal === 'lose-weight' ? (isChinese ? '减脂' : 'Lose Weight')
          : goal === 'gain-muscle' ? (isChinese ? '增肌' : 'Gain Muscle')
          : goal === 'control-sugar' ? (isChinese ? '控糖' : 'Control Blood Sugar')
          : (isChinese ? '维持健康' : 'Maintain Health');
        prompt += isChinese ? `- 目标：${goalText}\n` : `- Goal: ${goalText}\n`;
      }
    }

    // Add preferences context
    if (context.userPreferences) {
      const { dietaryType, allergies } = context.userPreferences;
      if (dietaryType.length > 0 || allergies.length > 0) {
        prompt += isChinese ? `\n**饮食偏好：**\n` : `\n**Dietary Preferences:**\n`;
        if (dietaryType.length > 0) {
          prompt += isChinese
            ? `- 饮食类型：${dietaryType.join('、')}\n`
            : `- Dietary Type: ${dietaryType.join(', ')}\n`;
        }
        if (allergies.length > 0) {
          prompt += isChinese
            ? `- 过敏原：${allergies.join('、')}\n`
            : `- Allergies: ${allergies.join(', ')}\n`;
        }
      }
    }

    // Add recent meals context
    if (context.recentMeals.length > 0) {
      prompt += isChinese ? `\n**最近餐食：**\n` : `\n**Recent Meals:**\n`;
      context.recentMeals.slice(0, 3).forEach((meal, i) => {
        const timeAgo = this.getTimeAgo(meal.timestamp, language);
        prompt += `${i + 1}. ${meal.foodName} (${meal.calories} kcal) - ${timeAgo}\n`;
      });
    }

    // Add streak context
    if (context.streakInfo && context.streakInfo.currentStreak > 0) {
      prompt += isChinese
        ? `\n**连续打卡：**${context.streakInfo.currentStreak}天（最长${context.streakInfo.longestStreak}天）\n`
        : `\n**Streak:**${context.streakInfo.currentStreak} days (longest: ${context.streakInfo.longestStreak} days)\n`;
    }

    // Add reasoning instructions
    prompt += isChinese
      ? `\n**重要指示：**
1. 当用户说"我有糖尿病"时，理解他们需要控糖建议，主动提供相关信息
2. 当用户说"我只吃素"时，理解他们是素食者，记住这个偏好
3. 当用户提供个人信息时，确认收到并说明如何使用这些信息帮助他们
4. 不要重复相同的欢迎消息，要根据上下文调整回复
5. 如果用户已经提供了信息，不要再问相同的问题
6. 保持简短（不超过150字），友好，有帮助

回复风格：自然、友好、像朋友聊天，适当使用"lah"、"leh"等新加坡华语语气词。`
      : `\n**Important Instructions:**
1. When user says "I have diabetes", understand they need sugar control advice, proactively provide relevant information
2. When user says "I only eat vegetarian", understand they are vegetarian, remember this preference
3. When user provides personal information, confirm receipt and explain how you'll use it to help them
4. Don't repeat the same welcome message, adjust responses based on context
5. If user already provided information, don't ask the same questions again
6. Keep it short (under 150 words), friendly, and helpful

Response Style: Natural, friendly, like chatting with a friend, use "lah", "leh" naturally in Singaporean style.`;

    return prompt;
  }

  /**
   * Build conversation history
   */
  private buildConversationHistory(
    context: ConversationContext,
    currentMessage: string
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add recent conversation history
    context.recentMessages.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
    });

    return messages;
  }

  /**
   * Store conversation for future context
   */
  private async storeConversation(
    userId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    // TODO: Implement conversation history storage
    // For now, just log
    logger.info({
      type: 'conversation_stored',
      userId,
      userMessageLength: userMessage.length,
      aiResponseLength: aiResponse.length,
    });
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

    const isChinese = language === 'zh-CN' || language === 'zh-TW';

    if (diffMins < 1) {
      return isChinese ? '刚刚' : 'Just now';
    } else if (diffMins < 60) {
      return isChinese ? `${diffMins}分钟前` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return isChinese ? `${diffHours}小时前` : `${diffHours}h ago`;
    } else {
      return isChinese ? `${diffDays}天前` : `${diffDays}d ago`;
    }
  }
}

// Singleton instance
export const intelligentConversation = new IntelligentConversationHandler();
