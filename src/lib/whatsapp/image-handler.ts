/**
 * ImageHandler - Handles image messages with complete food recognition flow
 * 
 * Flow:
 * 1. Check user quota
 * 2. Download and process image
 * 3. Check cache for existing recognition
 * 4. If not cached, call food recognizer
 * 5. Get health rating from rating engine
 * 6. Save record to database
 * 7. Upload image to storage
 * 8. Send response with quick reply buttons
 * 9. Cache the result
 * 
 * Requirements: 1.1, 1.2, 1.3, 3.1, 17.1, 17.2
 */

import { logger } from '@/utils/logger';
import { whatsappClient } from './client';
import { foodRecognizer } from '@/lib/food-recognition/recognizer';
import { ratingEngine } from '@/lib/rating/rating-engine';
import { cacheManager } from '@/lib/cache/cache-manager';
import { profileManager } from '@/lib/profile/profile-manager';
import { createClient } from '@/lib/supabase/server';
import { imageHandler as imageProcessor } from '@/lib/food-recognition/image-handler';
import { responseFormatterSG } from './response-formatter-sg';
import type { Message, MessageContext } from '@/types/whatsapp';
import type { FoodRecognitionResult, HealthRating } from '@/types';
import type { FoodRecordInsert } from '@/lib/database/schema';

export class ImageHandler {
  /**
   * Handle image message with complete flow
   */
  async handle(message: Message, context: MessageContext): Promise<void> {
    const startTime = Date.now();
    let timeoutMessageSent = false;

    // Set up timeout warning (30 seconds - more reasonable for image processing)
    const timeoutWarning = setTimeout(async () => {
      try {
        timeoutMessageSent = true;
        
        // Use user's language for timeout message
        const messages = {
          'en': '⏳ Processing is taking longer than usual, please wait...',
          'zh-CN': '⏳ 处理时间较长，请稍候...',
          'zh-TW': '⏳ 處理時間較長，請稍候...',
        };
        
        await whatsappClient.sendTextMessage(
          context.userId,
          messages[context.language]
        );
        logger.info({
          type: 'timeout_warning_sent',
          userId: context.userId,
          messageId: message.id,
        });
      } catch (error) {
        logger.error({
          type: 'timeout_warning_failed',
          userId: context.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 30000); // 30 seconds instead of 10

    try {
      logger.info({
        type: 'image_handling_started',
        userId: context.userId,
        messageId: message.id,
      });

      // 1. Send initial acknowledgment (critical - must succeed)
      try {
        await this.sendAcknowledgment(context);
      } catch (ackError) {
        logger.error({
          type: 'acknowledgment_critical_error',
          userId: context.userId,
          error: ackError instanceof Error ? ackError.message : 'Unknown error',
        });
        // If we can't even send acknowledgment, something is very wrong
        clearTimeout(timeoutWarning);
        throw ackError;
      }

      // 2. Check and increment quota atomically (prevents race conditions)
      const quotaResult = await this.checkAndIncrementQuota(context.userId);
      if (!quotaResult.allowed) {
        await this.sendQuotaExceededMessage(context, quotaResult);
        return;
      }

      // 4. Download image
      if (!message.image?.id) {
        throw new Error('No image ID in message');
      }

      const imageBuffer = await whatsappClient.downloadMedia(message.image.id);
      logger.info({
        type: 'image_downloaded',
        size: imageBuffer.length,
        messageId: message.id,
      });

      // 5. Process image and get hash
      const processed = await imageProcessor.processImage(imageBuffer);
      const imageHash = processed.hash;

      // 6. Check cache
      const cachedResult = await cacheManager.getFoodRecognition(imageHash);
      let recognitionResult: FoodRecognitionResult;
      let tokensUsed = 0;

      if (cachedResult) {
        logger.info({
          type: 'cache_hit',
          imageHash,
          userId: context.userId,
        });
        recognitionResult = cachedResult;
      } else {
        // 7. Call food recognizer
        logger.info({
          type: 'calling_food_recognizer',
          userId: context.userId,
        });

        const recognitionResponse = await foodRecognizer.recognizeFood(
          imageBuffer,
          {
            userId: context.userId,
            language: context.language,
            mealTime: context.timestamp,
          }
        );

        if (!recognitionResponse.success || !recognitionResponse.result) {
          await this.sendErrorResponse(context, recognitionResponse.error);
          return;
        }

        recognitionResult = recognitionResponse.result;
        tokensUsed = recognitionResponse.tokensUsed || 0;

        // Cache the result
        await cacheManager.setFoodRecognition(imageHash, recognitionResult);
      }

      // 8. Get user profile for rating (use defaults if not set)
      const profile = await profileManager.getProfile(context.userId);
      
      // Use smart defaults if no profile exists yet
      const ratingProfile = profile ? {
        userId: profile.user_id,
        height: profile.height,
        weight: profile.weight,
        age: profile.age ?? undefined,
        gender: profile.gender ?? undefined,
        goal: profile.goal,
        activityLevel: profile.activity_level,
        trainingType: (profile.training_type as any) || 'none',
        proteinTarget: profile.protein_target || undefined,
        carbTarget: profile.carb_target || undefined,
        digestTime: profile.digest_time,
        quickMode: profile.quick_mode,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      } : {
        userId: context.userId,
        height: 170, // Default height
        weight: 65,  // Default weight
        age: 30,
        gender: 'male' as const,
        goal: 'maintain' as const,
        activityLevel: 'light' as const,
        trainingType: 'none' as const,
        digestTime: '21:00:00',
        quickMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 9. Get health rating
      logger.info({
        type: 'calculating_health_rating',
        userId: context.userId,
      });

      const healthRating = await ratingEngine.evaluate(recognitionResult, ratingProfile, context.language);

      // 10. Upload image to storage (non-blocking)
      let imageUrl = '';
      try {
        imageUrl = await this.uploadImage(
          context.userId,
          processed.buffer,
          imageHash
        );
      } catch (uploadError) {
        logger.warn({
          type: 'image_upload_failed_non_critical',
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        });
        // Continue without image URL - not critical
        imageUrl = `placeholder://${imageHash}`;
      }

      // 11. Save record to database
      const recordId = await this.saveRecord(
        context.userId,
        imageUrl,
        imageHash,
        recognitionResult,
        healthRating
      );

      // 12. Save record and quota already incremented atomically
      // No need to call incrementUsage separately

      // 13. Send response with quick reply buttons
      await this.sendResponse(
        context,
        recognitionResult,
        healthRating,
        recordId
      );

      // 14. Phase 3: Call services after meal log
      await this.callPhase3Services(
        context.userId,
        recognitionResult,
        healthRating
      );

      // 15. Progressive profiling - ask for info at the right time
      await this.checkAndSendProgressivePrompt(context.userId, context.language);

      // Clear timeout warning
      clearTimeout(timeoutWarning);

      const processingTime = Date.now() - startTime;
      logger.info({
        type: 'image_handling_completed',
        userId: context.userId,
        messageId: message.id,
        processingTime,
        tokensUsed,
        cached: !!cachedResult,
        timeoutMessageSent,
      });
    } catch (error) {
      // Clear timeout warning
      clearTimeout(timeoutWarning);

      const processingTime = Date.now() - startTime;
      
      logger.error({
        type: 'image_handling_error',
        userId: context.userId,
        messageId: message.id,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // CRITICAL: Always send error message to user
      try {
        await this.sendGenericError(context);
      } catch (errorSendError) {
        logger.error({
          type: 'error_message_send_failed',
          userId: context.userId,
          error: errorSendError instanceof Error ? errorSendError.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Send initial acknowledgment (< 3 seconds)
   */
  private async sendAcknowledgment(context: MessageContext): Promise<void> {
    const messages = {
      'en': '📸 Got your photo! Analyzing your food...',
      'zh-CN': '📸 收到照片！正在分析您的食物...',
      'zh-TW': '📸 收到照片！正在分析您的食物...',
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Atomically check and increment quota (prevents race conditions)
   * Fixed: Issue #1 - Race condition in quota checking
   */
  private async checkAndIncrementQuota(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
    tier: string;
  }> {
    const supabase = await createClient();

    // First, ensure user exists and get UUID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .maybeSingle();

    if (!user) {
      // Create user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone_number: userId,
          language: 'en',
        })
        .select('id')
        .single();

      if (createError || !newUser) {
        logger.error({
          type: 'user_creation_error_in_quota',
          userId,
          error: createError?.message,
        });
        // Allow the request to proceed (fail open)
        return {
          allowed: true,
          remaining: 3,
          limit: 3,
          tier: 'free',
        };
      }

      // New user, allow the request
      return {
        allowed: true,
        remaining: 2, // Used 1, have 2 left
        limit: 3,
        tier: 'free',
      };
    }

    const userUuid = user.id;

    // Get user subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userUuid)
      .eq('status', 'active')
      .single();

    // Premium/Pro users have unlimited quota
    if (subscription && subscription.tier !== 'free') {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        tier: subscription.tier,
      };
    }

    // Free users: use atomic operation
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await (supabase.rpc as any)('check_and_increment_quota', {
      p_user_id: userUuid,
      p_date: today,
      p_limit: 3, // Free tier limit
    });

    if (error) {
      logger.error({
        type: 'quota_check_error',
        userId,
        userUuid,
        error: error.message,
      });
      // Fail open - allow the request
      return {
        allowed: true,
        remaining: 3,
        limit: 3,
        tier: 'free',
      };
    }

    if (!data || data.length === 0) {
      logger.error({
        type: 'quota_check_no_data',
        userId,
        userUuid,
      });
      // Fail open
      return {
        allowed: true,
        remaining: 3,
        limit: 3,
        tier: 'free',
      };
    }

    const result = data[0] as any;
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      limit: 3,
      tier: 'free',
    };
  }

  /**
   * Check user quota (deprecated - will be replaced with atomic operation)
   * @deprecated This method has a race condition. Use checkAndIncrementQuota instead.
   */
  private async checkQuota(userId: string): Promise<boolean> {
    const supabase = await createClient();

    // Get user subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    // Premium/Pro users have unlimited quota
    if (subscription && subscription.tier !== 'free') {
      return true;
    }

    // Check today's usage for free users
    const today = new Date().toISOString().split('T')[0];

    const { data: quota } = await supabase
      .from('usage_quotas')
      .select('recognitions_used, recognitions_limit')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!quota) {
      // No record yet, user has quota
      return true;
    }

    return quota.recognitions_used < quota.recognitions_limit;
  }

  /**
   * Increment usage quota (deprecated - will be removed)
   * @deprecated This method has a race condition. Use checkAndIncrementQuota instead.
   */
  private async incrementUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Use database function to increment usage
    const { error } = await supabase.rpc('increment_usage', {
      p_user_id: userId,
      p_date: today,
    });

    if (error) {
      logger.error({
        type: 'increment_usage_error',
        userId,
        error: error.message,
      });
      // Don't throw - this shouldn't block the user
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadImage(
    userId: string,
    imageBuffer: Buffer,
    imageHash: string
  ): Promise<string> {
    const supabase = await createClient();

    // Generate filename: userId/hash.jpg
    const filename = `${userId}/${imageHash}.jpg`;

    const { error } = await supabase.storage
      .from('food-images')
      .upload(filename, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      logger.error({
        type: 'image_upload_error',
        userId,
        error: error.message,
      });
      throw new Error('Failed to upload image');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('food-images')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }

  /**
   * Save food record to database
   */
  private async saveRecord(
    userId: string,
    imageUrl: string,
    imageHash: string,
    recognitionResult: FoodRecognitionResult,
    healthRating: HealthRating
  ): Promise<string> {
    const supabase = await createClient();

    // Get user UUID from phone number
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', userId)
      .maybeSingle();

    if (!user) {
      logger.error({
        type: 'record_save_user_not_found',
        userId,
      });
      throw new Error('User not found');
    }

    const userUuid = user.id;

    const record: FoodRecordInsert = {
      user_id: userUuid,
      image_url: imageUrl,
      image_hash: imageHash,
      recognition_result: recognitionResult as any,
      health_rating: healthRating as any,
      meal_context: recognitionResult.mealContext,
    };

    const { data, error} = await (supabase
      .from('food_records') as any)
      .insert(record)
      .select('id')
      .single();

    if (error) {
      logger.error({
        type: 'record_save_error',
        userId,
        userUuid,
        error: error.message,
      });
      throw new Error('Failed to save record');
    }

    return data.id;
  }

  /**
   * Send response with recognition result and quick reply buttons
   */
  private async sendResponse(
    context: MessageContext,
    result: FoodRecognitionResult,
    rating: HealthRating,
    recordId: string
  ): Promise<void> {
    // Concise response: food + calories + score + one tip
    const message = responseFormatterSG.formatResponse(result, rating, undefined, context.language);

    // Send the main message
    await whatsappClient.sendTextMessage(context.userId, message);

    // Send action buttons (auto-recorded, user can view details or modify)
    await this.sendQuickReplyButtons(context, recordId);
  }

  /**
   * Format response message with recognition and rating
   */
  private formatResponseMessage(
    result: FoodRecognitionResult,
    rating: HealthRating,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): string {
    const ratingEmoji = {
      green: '🟢',
      yellow: '🟡',
      red: '🔴',
    };

    const ratingText = {
      'en': { green: 'Healthy', yellow: 'Moderate', red: 'Unhealthy' },
      'zh-CN': { green: '健康', yellow: '适中', red: '不健康' },
      'zh-TW': { green: '健康', yellow: '適中', red: '不健康' },
    };

    let message = '';

    // Header with rating
    message += `${ratingEmoji[rating.overall]} ${ratingText[language][rating.overall]} (${rating.score}/100)\n\n`;

    // Food items
    if (language === 'en') {
      message += '🍽️ Detected Food:\n';
      for (const food of result.foods) {
        message += `• ${food.name} (${food.portion})\n`;
        message += `  ${Math.round((food.nutrition.calories.min + food.nutrition.calories.max) / 2)} kcal\n`;
      }
    } else {
      message += '🍽️ 识别的食物：\n';
      for (const food of result.foods) {
        message += `• ${food.nameLocal} (${food.portion})\n`;
        message += `  ${Math.round((food.nutrition.calories.min + food.nutrition.calories.max) / 2)} 千卡\n`;
      }
    }

    message += '\n';

    // Total nutrition
    const avgCal = Math.round(
      (result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2
    );
    const avgProtein = Math.round(
      (result.totalNutrition.protein.min + result.totalNutrition.protein.max) / 2
    );
    const avgCarbs = Math.round(
      (result.totalNutrition.carbs.min + result.totalNutrition.carbs.max) / 2
    );
    const avgFat = Math.round(
      (result.totalNutrition.fat.min + result.totalNutrition.fat.max) / 2
    );

    if (language === 'en') {
      message += '📊 Total Nutrition:\n';
      message += `• Calories: ${avgCal} kcal\n`;
      message += `• Protein: ${avgProtein}g\n`;
      message += `• Carbs: ${avgCarbs}g\n`;
      message += `• Fat: ${avgFat}g\n`;
    } else {
      message += '📊 总营养：\n';
      message += `• 卡路里：${avgCal} 千卡\n`;
      message += `• 蛋白质：${avgProtein}克\n`;
      message += `• 碳水：${avgCarbs}克\n`;
      message += `• 脂肪：${avgFat}克\n`;
    }

    message += '\n';

    // Health factors
    if (language === 'en') {
      message += '💡 Health Analysis:\n';
      for (const factor of rating.factors) {
        const emoji = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
        message += `${emoji} ${factor.message}\n`;
      }
    } else {
      message += '💡 健康分析：\n';
      for (const factor of rating.factors) {
        const emoji = factor.status === 'good' ? '✅' : factor.status === 'moderate' ? '⚠️' : '❌';
        message += `${emoji} ${factor.message}\n`;
      }
    }

    // Suggestions
    if (rating.suggestions.length > 0) {
      message += '\n';
      if (language === 'en') {
        message += '💪 Suggestions:\n';
      } else {
        message += '💪 建议：\n';
      }
      for (const suggestion of rating.suggestions) {
        message += `• ${suggestion}\n`;
      }
    }

    return message;
  }

  /**
   * Send quick reply buttons
   */
  private async sendQuickReplyButtons(
    context: MessageContext,
    recordId: string
  ): Promise<void> {
    const buttonTexts = {
      'en': {
        detail: '📊 Details',
        modify: '✏️ Modify',
        ignore: '❌ Ignore',
      },
      'zh-CN': {
        detail: '📊 详情',
        modify: '✏️ 修改',
        ignore: '❌ 忽略',
      },
      'zh-TW': {
        detail: '📊 詳情',
        modify: '✏️ 修改',
        ignore: '❌ 忽略',
      },
    };

    const buttons = buttonTexts[context.language];

    await whatsappClient.sendInteractiveButtons(
      context.userId,
      context.language === 'en'
        ? 'Tap for more info'
        : '点击查看更多',
      [
        { id: `detail_${recordId}`, title: buttons.detail },
        { id: `modify_${recordId}`, title: buttons.modify },
        { id: `ignore_${recordId}`, title: buttons.ignore },
      ]
    );
  }

  /**
   * Send profile setup prompt
   */
  private async sendProfileSetupPrompt(context: MessageContext): Promise<void> {
    const messages = {
      'en': `👋 Welcome to Vita AI!

Before I can analyze your food, I need to know a bit about you.

Let's set up your health profile - it only takes a minute!

Type "start" to begin, or send me your height in cm (e.g., 170)`,

      'zh-CN': `👋 欢迎使用 Vita AI！

在分析您的食物之前，我需要了解一些关于您的信息。

让我们设置您的健康画像 - 只需一分钟！

输入"开始"或直接告诉我您的身高（厘米，例如：170）`,

      'zh-TW': `👋 歡迎使用 Vita AI！

在分析您的食物之前，我需要了解一些關於您的信息。

讓我們設置您的健康畫像 - 只需一分鐘！

輸入"開始"或直接告訴我您的身高（厘米，例如：170）`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );

    // Initialize profile setup
    await profileManager.initializeProfile(context.userId, context.language);
  }

  /**
   * Send quota exceeded message
   */
  private async sendQuotaExceededMessage(
    context: MessageContext,
    quotaResult: { remaining: number; limit: number }
  ): Promise<void> {
    const messages = {
      'en': `📊 You've reached your daily limit of ${quotaResult.limit} free scans!

Upgrade to Premium for:
✨ Unlimited food recognition
📈 Daily health summaries
📊 Advanced analytics

Type "upgrade" to learn more, or come back tomorrow for ${quotaResult.limit} more free scans!`,

      'zh-CN': `📊 您今天的 ${quotaResult.limit} 次免费识别已用完！

升级到 Premium 享受：
✨ 无限次食物识别
📈 每日健康总结
📊 高级数据分析

输入"升级"了解更多，或明天再来获得 ${quotaResult.limit} 次免费识别！`,

      'zh-TW': `📊 您今天的 ${quotaResult.limit} 次免費識別已用完！

升級到 Premium 享受：
✨ 無限次食物識別
📈 每日健康總結
📊 高級數據分析

輸入"升級"了解更多，或明天再來獲得 ${quotaResult.limit} 次免費識別！`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }

  /**
   * Send error response
   */
  private async sendErrorResponse(
    context: MessageContext,
    error?: { type: string; message: string; suggestion?: string }
  ): Promise<void> {
    if (!error) {
      await this.sendGenericError(context);
      return;
    }

    let message = `❌ ${error.message}`;
    if (error.suggestion) {
      message += `\n\n💡 ${error.suggestion}`;
    }

    await whatsappClient.sendTextMessage(context.userId, message);
  }

  /**
   * Call Phase 3 services after meal log
   */
  private async callPhase3Services(
    userId: string,
    result: FoodRecognitionResult,
    rating: HealthRating
  ): Promise<void> {
    try {
      logger.info({
        type: 'phase3_services_calling',
        userId,
      });

      const supabase = await createClient();
      const { ServiceContainer } = await import('@/lib/phase3/service-container');
      const container = ServiceContainer.getInstance(supabase);

      // Get user UUID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', userId)
        .maybeSingle();

      if (!user) {
        logger.warn({
          type: 'phase3_user_not_found',
          userId,
        });
        return;
      }

      const userUuid = user.id;

      // 1. Update streak
      try {
        const streakManager = container.getStreakManager();
        const streakUpdate = await streakManager.updateStreak(userUuid);
        
        logger.info({
          type: 'phase3_streak_updated',
          userId,
          userUuid,
          currentStreak: streakUpdate.currentStreak,
          isNewRecord: streakUpdate.isNewRecord,
        });

        // Send streak milestone message if achieved
        if (streakUpdate.milestoneReached) {
          await whatsappClient.sendTextMessage(
            userId,
            `🔥 ${streakUpdate.message}`
          );
        }

        // Send achievement message if earned
        if (streakUpdate.achievementEarned) {
          const ach = streakUpdate.achievementEarned;
          await whatsappClient.sendTextMessage(
            userId,
            `🎉 ${ach.emoji} *${ach.title}*\n\n${ach.description}`
          );
        }
      } catch (error) {
        logger.error({
          type: 'phase3_streak_update_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 2. Update budget if enabled
      try {
        const budgetTracker = container.getBudgetTracker();
        const budgetStatus = await budgetTracker.getBudgetStatus(userUuid);
        
        if (budgetStatus.enabled) {
          const calories = Math.round(
            (result.totalNutrition.calories.min + result.totalNutrition.calories.max) / 2
          );
          
          const updatedBudget = await budgetTracker.updateAfterMeal(userUuid, calories);
          
          logger.info({
            type: 'phase3_budget_updated',
            userId,
            userUuid,
            calories,
            remaining: updatedBudget.remaining,
            status: updatedBudget.status,
          });

          // Send budget warning if approaching limit or over
          if (updatedBudget.status === 'approaching_limit' || updatedBudget.status === 'over_budget') {
            if (updatedBudget.message) {
              await whatsappClient.sendTextMessage(userId, updatedBudget.message);
            }
          }
        }
      } catch (error) {
        logger.error({
          type: 'phase3_budget_update_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 3. Check for feature introductions
      try {
        const featureDiscovery = container.getFeatureDiscovery();
        
        // Get user context
        const { data: foodRecords } = await supabase
          .from('food_records')
          .select('id')
          .eq('user_id', userUuid);

        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('current_streak, days_active')
          .eq('user_id', userUuid)
          .maybeSingle();

        const userContext = {
          userId: userUuid,
          totalMealsLogged: foodRecords?.length || 0,
          currentStreak: streakData?.current_streak || 0,
          daysActive: streakData?.days_active || 0,
          lastActionType: 'meal_log' as const,
        };

        const introduction = await featureDiscovery.checkForIntroduction(userContext);
        
        if (introduction) {
          logger.info({
            type: 'phase3_feature_introduction',
            userId,
            userUuid,
            featureName: introduction.featureName,
          });

          await whatsappClient.sendTextMessage(userId, introduction.message);
        }
      } catch (error) {
        logger.error({
          type: 'phase3_feature_discovery_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 4. Check allergens
      try {
        const preferenceManager = container.getPreferenceManager();
        const foodNames = result.foods.map(f => f.nameLocal || f.name);
        
        const warnings = await preferenceManager.checkAllergens(userUuid, foodNames);
        
        if (warnings.length > 0) {
          logger.info({
            type: 'phase3_allergen_warnings',
            userId,
            userUuid,
            warnings: warnings.map(w => w.allergen),
          });

          for (const warning of warnings) {
            await whatsappClient.sendTextMessage(userId, `⚠️ ${warning.message}`);
          }
        }
      } catch (error) {
        logger.error({
          type: 'phase3_allergen_check_error',
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      logger.info({
        type: 'phase3_services_completed',
        userId,
        userUuid,
      });
    } catch (error) {
      logger.error({
        type: 'phase3_services_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - Phase 3 features should not break main flow
    }
  }

  /**
   * Check user's onboarding status and send progressive prompts
   * - After 2nd photo: Ask for basic info (age, height, weight)
   * - After 5th photo: Ask for goals and preferences
   */
  private async checkAndSendProgressivePrompt(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    try {
      // Check if user already has a profile
      const hasProfile = await profileManager.hasProfile(userId);
      if (hasProfile) {
        return; // User already set up, no need for prompts
      }

      // Count user's food records
      const recordCount = await this.getUserFoodRecordCount(userId);

      logger.info({
        type: 'progressive_profiling_check',
        userId,
        recordCount,
        hasProfile,
      });

      // After 2nd photo: Ask for basic info
      if (recordCount === 2) {
        await this.sendBasicInfoPrompt(userId, language);
      }
      // After 5th photo: Ask for goals (if they provided basic info)
      else if (recordCount === 5 && hasProfile) {
        await this.sendGoalsPrompt(userId, language);
      }
    } catch (error) {
      logger.error({
        type: 'progressive_profiling_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - this shouldn't block the main flow
    }
  }

  /**
   * Get user's food record count
   */
  private async getUserFoodRecordCount(userId: string): Promise<number> {
    try {
      const supabase = await createClient();
      
      const { count, error } = await supabase
        .from('food_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        logger.error({
          type: 'food_record_count_error',
          userId,
          error: error.message,
        });
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error({
        type: 'food_record_count_exception',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Send prompt for basic info after 2nd photo
   */
  private async sendBasicInfoPrompt(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': `🎉 Great! You've logged 2 meals!

Want personalized nutrition advice?

Just send me 3 numbers:
\`age height weight\`

Example: \`25 170 65\`

Or keep sending photos - I'll keep analyzing! 📸`,

      'zh-CN': `🎉 太棒了！您已记录 2 餐！

想要个性化营养建议吗？

只需发送 3 个数字：
\`年龄 身高 体重\`

例如：\`25 170 65\`

或继续发送照片 - 我会继续分析！📸`,

      'zh-TW': `🎉 太棒了！您已記錄 2 餐！

想要個性化營養建議嗎？

只需發送 3 個數字：
\`年齡 身高 體重\`

例如：\`25 170 65\`

或繼續發送照片 - 我會繼續分析！📸`,
    };

    await whatsappClient.sendTextMessage(userId, messages[language]);

    logger.info({
      type: 'basic_info_prompt_sent',
      userId,
      language,
    });
  }

  /**
   * Send prompt for goals after 5th photo
   */
  private async sendGoalsPrompt(
    userId: string,
    language: 'en' | 'zh-CN' | 'zh-TW'
  ): Promise<void> {
    const messages = {
      'en': `💪 You're doing great! 5 meals tracked!

Want even better recommendations?

Tell me your health goal:
1️⃣ Lose weight
2️⃣ Gain muscle
3️⃣ Control blood sugar
4️⃣ Maintain health

Just reply with the number (1-4)`,

      'zh-CN': `💪 做得很好！已记录 5 餐！

想要更好的建议吗？

告诉我您的健康目标：
1️⃣ 减脂
2️⃣ 增肌
3️⃣ 控糖
4️⃣ 维持健康

只需回复数字（1-4）`,

      'zh-TW': `💪 做得很好！已記錄 5 餐！

想要更好的建議嗎？

告訴我您的健康目標：
1️⃣ 減脂
2️⃣ 增肌
3️⃣ 控糖
4️⃣ 維持健康

只需回覆數字（1-4）`,
    };

    await whatsappClient.sendButtonMessage(
      userId,
      messages[language],
      [
        { id: 'goal_1', title: '1️⃣ Lose Weight' },
        { id: 'goal_2', title: '2️⃣ Gain Muscle' },
        { id: 'goal_3', title: '3️⃣ Control Sugar' },
        { id: 'goal_4', title: '4️⃣ Maintain' },
      ]
    );

    logger.info({
      type: 'goals_prompt_sent',
      userId,
      language,
    });
  }

  /**
   * Send generic error message
   */
  private async sendGenericError(context: MessageContext): Promise<void> {
    const messages = {
      'en': `❌ Oops! Something went wrong while analyzing your food.

Please try again, or send a different photo.

If the problem persists, type "help" for support.`,

      'zh-CN': `❌ 哎呀！分析您的食物时出错了。

请重试，或发送另一张照片。

如果问题持续，输入"帮助"获取支持。`,

      'zh-TW': `❌ 哎呀！分析您的食物時出錯了。

請重試，或發送另一張照片。

如果問題持續，輸入"幫助"獲取支持。`,
    };

    await whatsappClient.sendTextMessage(
      context.userId,
      messages[context.language]
    );
  }
}

// Singleton instance
export const imageHandler = new ImageHandler();
