/**
 * ProfileManager - Manages user health profiles
 * 
 * Responsibilities:
 * - Initialize user profiles through conversational flow
 * - Validate health data (height, weight, age)
 * - Calculate BMI and daily calorie targets
 * - Update profile information
 * - Support multi-language interactions
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.8
 */

import { createClient } from '@/lib/supabase/server';
import { whatsappClient } from '@/lib/whatsapp/client';
import { logger } from '@/utils/logger';
import { calculateBMI, calculateDailyCalories, validateHealthProfile } from '@/lib/database/functions';
import type { HealthProfile, HealthProfileInsert, HealthProfileUpdate } from '@/lib/database/schema';

/**
 * Profile setup state for conversational flow
 */
export enum ProfileSetupStep {
  HEIGHT = 'height',
  WEIGHT = 'weight',
  AGE = 'age',
  GENDER = 'gender',
  GOAL = 'goal',
  ACTIVITY_LEVEL = 'activity_level',
  COMPLETE = 'complete',
}

/**
 * Profile setup session data
 */
export interface ProfileSetupSession {
  userId: string;
  currentStep: ProfileSetupStep;
  data: Partial<HealthProfileInsert>;
  language: 'en' | 'zh-CN' | 'zh-TW';
}

export class ProfileManager {
  private setupSessions: Map<string, ProfileSetupSession> = new Map();

  /**
   * Initialize profile setup for a new user
   */
  async initializeProfile(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
  ): Promise<void> {
    logger.info({
      type: 'profile_initialization_started',
      userId,
      language,
    });

    // Create setup session
    this.setupSessions.set(userId, {
      userId,
      currentStep: ProfileSetupStep.HEIGHT,
      data: {
        user_id: userId,
        activity_level: 'light', // Default
        digest_time: '21:00:00', // Default 9 PM SGT
        quick_mode: false,
      },
      language,
    });

    // Send welcome message and ask for height
    await this.sendStepMessage(userId, ProfileSetupStep.HEIGHT, language);
  }

  /**
   * Process user input during profile setup
   */
  async processSetupInput(
    userId: string,
    input: string,
    language: 'en' | 'zh-CN' | 'zh-TW' = 'en'
  ): Promise<boolean> {
    const session = this.setupSessions.get(userId);

    if (!session) {
      // No active session, check if user has a profile
      const hasProfile = await this.hasProfile(userId);
      if (!hasProfile) {
        await this.initializeProfile(userId, language);
        return false;
      }
      return true; // Profile already exists
    }

    try {
      const success = await this.processStep(session, input);

      if (success) {
        // Move to next step
        const nextStep = this.getNextStep(session.currentStep);
        
        if (nextStep === ProfileSetupStep.COMPLETE) {
          // Save profile and complete setup
          await this.completeSetup(session);
          this.setupSessions.delete(userId);
          return true;
        } else {
          session.currentStep = nextStep;
          await this.sendStepMessage(userId, nextStep, session.language);
        }
      }

      return false; // Setup not complete yet
    } catch (error) {
      logger.error({
        type: 'profile_setup_error',
        userId,
        step: session.currentStep,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendErrorMessage(userId, session.language, error instanceof Error ? error.message : undefined);
      return false;
    }
  }

  /**
   * Process a single setup step
   */
  private async processStep(
    session: ProfileSetupSession,
    input: string
  ): Promise<boolean> {
    const trimmedInput = input.trim();

    switch (session.currentStep) {
      case ProfileSetupStep.HEIGHT:
        return this.processHeight(session, trimmedInput);

      case ProfileSetupStep.WEIGHT:
        return this.processWeight(session, trimmedInput);

      case ProfileSetupStep.AGE:
        return this.processAge(session, trimmedInput);

      case ProfileSetupStep.GENDER:
        return this.processGender(session, trimmedInput);

      case ProfileSetupStep.GOAL:
        return this.processGoal(session, trimmedInput);

      case ProfileSetupStep.ACTIVITY_LEVEL:
        return this.processActivityLevel(session, trimmedInput);

      default:
        return false;
    }
  }

  /**
   * Process height input (100-250 cm)
   */
  private processHeight(session: ProfileSetupSession, input: string): boolean {
    const height = this.extractNumber(input);

    if (!height) {
      throw new Error('Please provide a valid number for height');
    }

    const validation = validateHealthProfile({ height });
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    session.data.height = height;
    return true;
  }

  /**
   * Process weight input (30-300 kg)
   */
  private processWeight(session: ProfileSetupSession, input: string): boolean {
    const weight = this.extractNumber(input);

    if (!weight) {
      throw new Error('Please provide a valid number for weight');
    }

    const validation = validateHealthProfile({ weight });
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    session.data.weight = weight;
    return true;
  }

  /**
   * Process age input (10-120 years) - Optional
   */
  private processAge(session: ProfileSetupSession, input: string): boolean {
    const normalized = input.toLowerCase();

    // Allow skipping age
    if (normalized === 'skip' || normalized === '跳过' || normalized === '跳過') {
      session.data.age = 30; // Default age
      return true;
    }

    const age = this.extractNumber(input);

    if (!age) {
      throw new Error('Please provide a valid number for age or type "skip"');
    }

    const validation = validateHealthProfile({ age });
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    session.data.age = age;
    return true;
  }

  /**
   * Process gender input - Optional
   */
  private processGender(session: ProfileSetupSession, input: string): boolean {
    const normalized = input.toLowerCase();

    // Allow skipping gender
    if (normalized === 'skip' || normalized === '跳过' || normalized === '跳過') {
      session.data.gender = 'male'; // Default
      return true;
    }

    // Match gender keywords
    const maleKeywords = ['male', 'm', '男', '男性'];
    const femaleKeywords = ['female', 'f', '女', '女性'];

    if (maleKeywords.some(k => normalized.includes(k))) {
      session.data.gender = 'male';
      return true;
    }

    if (femaleKeywords.some(k => normalized.includes(k))) {
      session.data.gender = 'female';
      return true;
    }

    throw new Error('Please specify male/female or type "skip"');
  }

  /**
   * Process health goal input
   */
  private processGoal(session: ProfileSetupSession, input: string): boolean {
    const normalized = input.toLowerCase();

    // Goal mappings
    const goalMap: Record<string, HealthProfile['goal']> = {
      // Lose weight
      '1': 'lose-weight',
      'lose': 'lose-weight',
      'weight': 'lose-weight',
      'fat': 'lose-weight',
      '减脂': 'lose-weight',
      '减肥': 'lose-weight',
      '減脂': 'lose-weight',
      '減肥': 'lose-weight',

      // Gain muscle
      '2': 'gain-muscle',
      'gain': 'gain-muscle',
      'muscle': 'gain-muscle',
      'build': 'gain-muscle',
      '增肌': 'gain-muscle',

      // Control sugar
      '3': 'control-sugar',
      'sugar': 'control-sugar',
      'diabetes': 'control-sugar',
      '控糖': 'control-sugar',

      // Maintain
      '4': 'maintain',
      'maintain': 'maintain',
      'healthy': 'maintain',
      '维持': 'maintain',
      '維持': 'maintain',
      '保持': 'maintain',
    };

    for (const [key, goal] of Object.entries(goalMap)) {
      if (normalized.includes(key)) {
        session.data.goal = goal;
        return true;
      }
    }

    throw new Error('Please select a valid goal (1-4)');
  }

  /**
   * Process activity level input
   */
  private processActivityLevel(session: ProfileSetupSession, input: string): boolean {
    const normalized = input.toLowerCase();

    // Activity level mappings
    const activityMap: Record<string, HealthProfile['activity_level']> = {
      // Sedentary
      '1': 'sedentary',
      'sedentary': 'sedentary',
      'sit': 'sedentary',
      '久坐': 'sedentary',

      // Light
      '2': 'light',
      'light': 'light',
      '轻度': 'light',
      '輕度': 'light',

      // Moderate
      '3': 'moderate',
      'moderate': 'moderate',
      '中度': 'moderate',

      // Active
      '4': 'active',
      'active': 'active',
      'very': 'active',
      '高度': 'active',
    };

    for (const [key, level] of Object.entries(activityMap)) {
      if (normalized.includes(key)) {
        session.data.activity_level = level;
        return true;
      }
    }

    throw new Error('Please select a valid activity level (1-4)');
  }

  /**
   * Get next step in setup flow
   */
  private getNextStep(currentStep: ProfileSetupStep): ProfileSetupStep {
    const steps = [
      ProfileSetupStep.HEIGHT,
      ProfileSetupStep.WEIGHT,
      ProfileSetupStep.AGE,
      ProfileSetupStep.GENDER,
      ProfileSetupStep.GOAL,
      ProfileSetupStep.ACTIVITY_LEVEL,
      ProfileSetupStep.COMPLETE,
    ];

    const currentIndex = steps.indexOf(currentStep);
    return steps[currentIndex + 1] || ProfileSetupStep.COMPLETE;
  }

  /**
   * Extract number from text (handles various formats)
   */
  private extractNumber(text: string): number | null {
    // Remove common units and extract number
    const cleaned = text.replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Send message for current setup step
   */
  private async sendStepMessage(
    userId: string,
    step: ProfileSetupStep,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = this.getStepMessages(language);
    const message = messages[step];

    if (message) {
      await whatsappClient.sendTextMessage(userId, message);
    }
  }

  /**
   * Get localized messages for each setup step
   */
  private getStepMessages(language: 'en' | 'zh-CN' | 'zh-TW'): Record<ProfileSetupStep, string> {
    const messages = {
      'en': {
        [ProfileSetupStep.HEIGHT]: `👋 Welcome to Vita AI!

Let's set up your health profile to give you personalized recommendations.

📏 Please tell me your height in centimeters (cm):
Example: 170`,

        [ProfileSetupStep.WEIGHT]: `Great! Now, what's your current weight in kilograms (kg)?
Example: 65`,

        [ProfileSetupStep.AGE]: `Thanks! What's your age?
(You can type "skip" if you prefer not to share)
Example: 25`,

        [ProfileSetupStep.GENDER]: `What's your gender?
Type: male or female
(You can type "skip" to use default)`,

        [ProfileSetupStep.GOAL]: `🎯 What's your health goal?

1️⃣ Lose weight / Reduce fat
2️⃣ Gain muscle
3️⃣ Control blood sugar
4️⃣ Maintain healthy lifestyle

Please reply with the number (1-4):`,

        [ProfileSetupStep.ACTIVITY_LEVEL]: `💪 What's your daily activity level?

1️⃣ Sedentary (office work, little exercise)
2️⃣ Light (light exercise 1-3 days/week)
3️⃣ Moderate (moderate exercise 3-5 days/week)
4️⃣ Active (intense exercise 6-7 days/week)

Please reply with the number (1-4):`,

        [ProfileSetupStep.COMPLETE]: '',
      },

      'zh-CN': {
        [ProfileSetupStep.HEIGHT]: `👋 欢迎使用 Vita AI！

让我们设置您的健康画像，为您提供个性化建议。

📏 请告诉我您的身高（厘米）：
例如：170`,

        [ProfileSetupStep.WEIGHT]: `很好！现在，您的体重是多少公斤（kg）？
例如：65`,

        [ProfileSetupStep.AGE]: `谢谢！您的年龄是？
（如果不想分享可以输入"跳过"）
例如：25`,

        [ProfileSetupStep.GENDER]: `您的性别是？
输入：男 或 女
（可以输入"跳过"使用默认值）`,

        [ProfileSetupStep.GOAL]: `🎯 您的健康目标是什么？

1️⃣ 减脂/减肥
2️⃣ 增肌
3️⃣ 控糖
4️⃣ 维持健康

请回复数字（1-4）：`,

        [ProfileSetupStep.ACTIVITY_LEVEL]: `💪 您的日常活动水平？

1️⃣ 久坐（办公室工作，很少运动）
2️⃣ 轻度活动（每周轻度运动 1-3 天）
3️⃣ 中度活动（每周中度运动 3-5 天）
4️⃣ 高度活动（每周高强度运动 6-7 天）

请回复数字（1-4）：`,

        [ProfileSetupStep.COMPLETE]: '',
      },

      'zh-TW': {
        [ProfileSetupStep.HEIGHT]: `👋 歡迎使用 Vita AI！

讓我們設置您的健康畫像，為您提供個性化建議。

📏 請告訴我您的身高（厘米）：
例如：170`,

        [ProfileSetupStep.WEIGHT]: `很好！現在，您的體重是多少公斤（kg）？
例如：65`,

        [ProfileSetupStep.AGE]: `謝謝！您的年齡是？
（如果不想分享可以輸入"跳過"）
例如：25`,

        [ProfileSetupStep.GENDER]: `您的性別是？
輸入：男 或 女
（可以輸入"跳過"使用默認值）`,

        [ProfileSetupStep.GOAL]: `🎯 您的健康目標是什麼？

1️⃣ 減脂/減肥
2️⃣ 增肌
3️⃣ 控糖
4️⃣ 維持健康

請回覆數字（1-4）：`,

        [ProfileSetupStep.ACTIVITY_LEVEL]: `💪 您的日常活動水平？

1️⃣ 久坐（辦公室工作，很少運動）
2️⃣ 輕度活動（每週輕度運動 1-3 天）
3️⃣ 中度活動（每週中度運動 3-5 天）
4️⃣ 高度活動（每週高強度運動 6-7 天）

請回覆數字（1-4）：`,

        [ProfileSetupStep.COMPLETE]: '',
      },
    };

    return messages[language];
  }

  /**
   * Complete profile setup and save to database
   */
  private async completeSetup(session: ProfileSetupSession): Promise<void> {
    const supabase = await createClient();

    // Ensure required fields are present
    if (!session.data.height || !session.data.weight || !session.data.goal) {
      throw new Error('Missing required profile data');
    }

    // Set defaults for optional fields
    const profileData: HealthProfileInsert = {
      user_id: session.userId,
      height: session.data.height,
      weight: session.data.weight,
      age: session.data.age || 30,
      gender: session.data.gender || 'male',
      goal: session.data.goal,
      activity_level: session.data.activity_level || 'light',
      digest_time: session.data.digest_time || '21:00:00',
      quick_mode: session.data.quick_mode || false,
    };

    // Save to database
    const { error } = await supabase
      .from('health_profiles')
      .insert(profileData);

    if (error) {
      logger.error({
        type: 'profile_save_error',
        userId: session.userId,
        error: error.message,
      });
      throw new Error('Failed to save profile');
    }

    // Calculate and send summary
    await this.sendProfileSummary(session.userId, profileData, session.language);

    logger.info({
      type: 'profile_setup_completed',
      userId: session.userId,
    });
  }

  /**
   * Send profile summary with BMI and calorie calculations
   */
  private async sendProfileSummary(
    userId: string,
    profile: HealthProfileInsert,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    // Calculate BMI
    const bmi = calculateBMI(profile.height, profile.weight);

    // Calculate daily calories
    const dailyCalories = calculateDailyCalories({
      height: profile.height,
      weight: profile.weight,
      age: profile.age || 30,
      gender: profile.gender || 'male',
      activity_level: profile.activity_level,
      goal: profile.goal,
    });

    const messages = {
      'en': `✅ Profile Setup Complete!

📊 Your Health Profile:
• Height: ${profile.height} cm
• Weight: ${profile.weight} kg
• BMI: ${bmi.toFixed(1)}
• Goal: ${this.formatGoal(profile.goal, 'en')}
• Activity: ${this.formatActivityLevel(profile.activity_level, 'en')}

🎯 Daily Calorie Target: ${dailyCalories} kcal

You're all set! Now you can:
📸 Send me photos of your meals for nutrition analysis
💬 Ask me questions about healthy eating
📊 Track your daily nutrition intake

Let's start your healthy journey! 🚀`,

      'zh-CN': `✅ 画像设置完成！

📊 您的健康画像：
• 身高：${profile.height} 厘米
• 体重：${profile.weight} 公斤
• BMI：${bmi.toFixed(1)}
• 目标：${this.formatGoal(profile.goal, 'zh-CN')}
• 活动：${this.formatActivityLevel(profile.activity_level, 'zh-CN')}

🎯 每日卡路里目标：${dailyCalories} 千卡

一切就绪！现在您可以：
📸 发送食物照片进行营养分析
💬 向我咨询健康饮食问题
📊 追踪每日营养摄入

让我们开始健康之旅吧！🚀`,

      'zh-TW': `✅ 畫像設置完成！

📊 您的健康畫像：
• 身高：${profile.height} 厘米
• 體重：${profile.weight} 公斤
• BMI：${bmi.toFixed(1)}
• 目標：${this.formatGoal(profile.goal, 'zh-TW')}
• 活動：${this.formatActivityLevel(profile.activity_level, 'zh-TW')}

🎯 每日卡路里目標：${dailyCalories} 千卡

一切就緒！現在您可以：
📸 發送食物照片進行營養分析
💬 向我諮詢健康飲食問題
📊 追蹤每日營養攝入

讓我們開始健康之旅吧！🚀`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Format goal for display
   */
  private formatGoal(goal: HealthProfile['goal'], language: 'en' | 'zh-CN' | 'zh-TW'): string {
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

    return goals[language][goal];
  }

  /**
   * Format activity level for display
   */
  private formatActivityLevel(
    level: HealthProfile['activity_level'],
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): string {
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

    return levels[language][level];
  }

  /**
   * Send error message during setup
   */
  private async sendErrorMessage(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW',
    errorDetail?: string
  ): Promise<void> {
    const messages = {
      'en': `❌ ${errorDetail || 'Invalid input'}

Please try again with the correct format.`,
      'zh-CN': `❌ ${errorDetail || '输入无效'}

请使用正确的格式重试。`,
      'zh-TW': `❌ ${errorDetail || '輸入無效'}

請使用正確的格式重試。`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);
  }

  /**
   * Check if user has a profile
   */
  async hasProfile(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('health_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<HealthProfile | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as HealthProfile;
  }

  /**
   * Update user profile with optimistic locking
   * Fixed: Issue #7 - Added version checking to prevent race conditions
   */
  async updateProfile(
    userId: string,
    updates: HealthProfileUpdate,
    maxRetries: number = 3
  ): Promise<void> {
    // Validate updates
    const validation = validateHealthProfile(updates);
    if (!validation.valid) {
      throw new Error(validation.errors[0]);
    }

    const supabase = await createClient();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Get current profile with updated_at for optimistic locking
        const { data: current, error: fetchError } = await supabase
          .from('health_profiles')
          .select('updated_at')
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch current profile: ${fetchError.message}`);
        }

        if (!current) {
          throw new Error('Profile not found');
        }

        const currentUpdatedAt = current.updated_at;

        // Update with version check (optimistic locking)
        const { data, error } = await supabase
          .from('health_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('updated_at', currentUpdatedAt) // Version check
          .select()
          .single();

        if (error) {
          throw new Error(`Update failed: ${error.message}`);
        }

        if (!data) {
          // Version conflict - another update happened
          if (attempt < maxRetries - 1) {
            logger.warn({
              type: 'profile_update_conflict',
              userId,
              attempt: attempt + 1,
            });
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            continue;
          } else {
            throw new Error('Profile update conflict - max retries exceeded');
          }
        }

        // Success - invalidate cache
        const { cacheManager } = await import('@/lib/cache/cache-manager');
        await cacheManager.invalidateUserProfile(userId);

        logger.info({
          type: 'profile_updated',
          userId,
          updates: Object.keys(updates),
          attempt: attempt + 1,
        });

        return;
      } catch (error) {
        if (attempt === maxRetries - 1) {
          logger.error({
            type: 'profile_update_error',
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: maxRetries,
          });
          throw error;
        }
      }
    }

    throw new Error('Failed to update profile after retries');
  }

  /**
   * Parse natural language update (e.g., "I'm now 65kg")
   * This is a simple implementation - can be enhanced with AI
   */
  async parseNaturalLanguageUpdate(
    userId: string,
    text: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<boolean> {
    const normalized = text.toLowerCase();
    const updates: HealthProfileUpdate = {};

    // Extract weight
    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|公斤|kilogram)/i);
    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      const validation = validateHealthProfile({ weight });
      if (validation.valid) {
        updates.weight = weight;
      }
    }

    // Extract height
    const heightMatch = text.match(/(\d+)\s*(?:cm|厘米|centimeter)/i);
    if (heightMatch) {
      const height = parseInt(heightMatch[1]);
      const validation = validateHealthProfile({ height });
      if (validation.valid) {
        updates.height = height;
      }
    }

    // If we found updates, apply them
    if (Object.keys(updates).length > 0) {
      await this.updateProfile(userId, updates);

      const messages = {
        'en': `✅ Profile updated successfully!

${updates.height ? `• Height: ${updates.height} cm\n` : ''}${updates.weight ? `• Weight: ${updates.weight} kg\n` : ''}`,
        'zh-CN': `✅ 画像更新成功！

${updates.height ? `• 身高：${updates.height} 厘米\n` : ''}${updates.weight ? `• 体重：${updates.weight} 公斤\n` : ''}`,
        'zh-TW': `✅ 畫像更新成功！

${updates.height ? `• 身高：${updates.height} 厘米\n` : ''}${updates.weight ? `• 體重：${updates.weight} 公斤\n` : ''}`,
      };

      await whatsappClient.sendTextMessage(userId, messages[language]);
      return true;
    }

    return false;
  }

  /**
   * Check if user is in setup flow
   */
  isInSetupFlow(userId: string): boolean {
    return this.setupSessions.has(userId);
  }

  /**
   * Cancel setup flow
   */
  cancelSetup(userId: string): void {
    this.setupSessions.delete(userId);
    logger.info({
      type: 'profile_setup_cancelled',
      userId,
    });
  }
}

// Singleton instance
export const profileManager = new ProfileManager();
