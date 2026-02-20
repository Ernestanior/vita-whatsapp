import { openai } from '@/lib/openai/client';
import { logger } from '@/utils/logger';
import { FoodRecognitionResult, ErrorType } from '@/types';
import { imageHandler } from './image-handler';
import { buildFoodRecognitionPrompt, buildUserPrompt, detectMealContext } from './prompts';

export interface RecognitionContext {
  userId: string;
  language: 'en' | 'zh-CN' | 'zh-TW';
  mealTime?: Date;
}

export interface RecognitionError {
  type: ErrorType;
  message: string;
  suggestion?: string;
}

export interface RecognitionResponse {
  success: boolean;
  result?: FoodRecognitionResult;
  error?: RecognitionError;
  tokensUsed?: number;
  processingTime?: number;
}

export class FoodRecognizer {
  private readonly MODEL = 'gpt-4o-mini';
  private readonly MAX_TOKENS = 1000;
  private readonly TEMPERATURE = 0.3; // Lower temperature for more consistent results
  private readonly LOW_CONFIDENCE_THRESHOLD = 60;
  private readonly API_TIMEOUT_MS = 45000; // 45 seconds timeout for OpenAI Vision API

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('API_TIMEOUT'));
      }, this.API_TIMEOUT_MS);
    });
  }

  /**
   * Recognize food from image buffer with timeout protection
   * Fixed: Issue #5 - Added 10-second timeout for API calls
   */
  async recognizeFood(
    imageBuffer: Buffer,
    context: RecognitionContext
  ): Promise<RecognitionResponse> {
    const startTime = Date.now();

    try {
      logger.info({ userId: context.userId }, 'Starting food recognition');

      // 1. Validate image
      const isValid = await imageHandler.validateImage(imageBuffer);
      if (!isValid) {
        return this.createErrorResponse(
          ErrorType.UNSUPPORTED_CONTENT,
          'Invalid image format. Please send a clear photo of your food.',
          'Try taking a new photo with better lighting and focus.'
        );
      }

      // 2. Process image (compress and optimize)
      const processed = await imageHandler.processImage(imageBuffer);
      logger.info({ hash: processed.hash, size: processed.size }, 'Image processed');

      // 3. Convert to data URL for OpenAI
      const imageDataUrl = imageHandler.toDataUrl(processed.buffer, processed.format);

      // 4. Build prompts
      const systemPrompt = buildFoodRecognitionPrompt({
        language: context.language,
        mealTime: context.mealTime,
      });
      const userPrompt = buildUserPrompt(context.language);

      // 5. Call OpenAI Vision API with timeout protection
      logger.info({ model: this.MODEL, timeout: this.API_TIMEOUT_MS }, 'Calling OpenAI Vision API');
      
      const response = await Promise.race([
        openai.chat.completions.create({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userPrompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageDataUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: this.MAX_TOKENS,
          temperature: this.TEMPERATURE,
          response_format: { type: 'json_object' },
        }),
        this.createTimeoutPromise(),
      ]);

      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      logger.info(
        {
          tokensUsed,
          processingTime,
          model: this.MODEL,
        },
        'OpenAI API call completed'
      );

      // 6. Parse response
      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.createErrorResponse(
          ErrorType.AI_API_ERROR,
          'Failed to get response from AI',
          'Please try again in a moment.'
        );
      }

      const result = JSON.parse(content) as FoodRecognitionResult;

      // 7. Validate result
      const validationError = this.validateResult(result);
      if (validationError) {
        logger.error({ validationError, result }, 'Invalid recognition result');
        return this.createErrorResponse(
          ErrorType.AI_API_ERROR,
          validationError,
          'Please try taking another photo.'
        );
      }

      // 8. Handle low confidence
      if (this.hasLowConfidence(result)) {
        logger.warn({ result }, 'Low confidence recognition');
        // Still return the result but flag it
        return {
          success: true,
          result: this.enrichResult(result, context),
          tokensUsed,
          processingTime,
        };
      }

      // 9. Enrich result with context
      const enrichedResult = this.enrichResult(result, context);

      logger.info(
        {
          foodCount: enrichedResult.foods.length,
          confidence: enrichedResult.foods[0]?.confidence,
          processingTime,
        },
        'Food recognition completed successfully'
      );

      return {
        success: true,
        result: enrichedResult,
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error({ error, userId: context.userId, processingTime }, 'Food recognition failed');

      if (error instanceof Error) {
        // Handle timeout error
        if (error.message === 'API_TIMEOUT') {
          logger.warn({ userId: context.userId, processingTime }, 'API timeout occurred');
          return this.createErrorResponse(
            ErrorType.TIMEOUT_ERROR,
            context.language === 'en' 
              ? 'Recognition is taking longer than expected. Please try again.'
              : '识别超时，请稍后重试。',
            context.language === 'en'
              ? 'Try taking a clearer photo or check your internet connection.'
              : '请尝试拍摄更清晰的照片或检查网络连接。'
          );
        }

        // Handle rate limit
        if (error.message.includes('rate limit')) {
          return this.createErrorResponse(
            ErrorType.AI_API_ERROR,
            context.language === 'en'
              ? 'Service is temporarily busy'
              : '服务暂时繁忙',
            context.language === 'en'
              ? 'Please wait a moment and try again.'
              : '请稍后再试。'
          );
        }
      }

      return this.createErrorResponse(
        ErrorType.AI_API_ERROR,
        context.language === 'en'
          ? 'Failed to recognize food'
          : '识别失败',
        context.language === 'en'
          ? 'Please try taking another photo with better lighting.'
          : '请尝试在更好的光线下重新拍照。'
      );
    }
  }

  /**
   * Validate recognition result
   */
  private validateResult(result: FoodRecognitionResult): string | null {
    if (!result.foods || !Array.isArray(result.foods) || result.foods.length === 0) {
      return 'No food items detected in the image';
    }

    for (const food of result.foods) {
      if (!food.name || !food.nutrition) {
        return 'Incomplete food information';
      }

      const { nutrition } = food;
      if (
        !nutrition.calories ||
        !nutrition.protein ||
        !nutrition.carbs ||
        !nutrition.fat ||
        !nutrition.sodium
      ) {
        return 'Missing nutrition data';
      }

      // Validate ranges
      if (
        nutrition.calories.min >= nutrition.calories.max ||
        nutrition.protein.min >= nutrition.protein.max ||
        nutrition.carbs.min >= nutrition.carbs.max ||
        nutrition.fat.min >= nutrition.fat.max ||
        nutrition.sodium.min >= nutrition.sodium.max
      ) {
        return 'Invalid nutrition ranges (min should be less than max)';
      }
    }

    if (!result.totalNutrition) {
      return 'Missing total nutrition data';
    }

    return null;
  }

  /**
   * Check if result has low confidence
   */
  private hasLowConfidence(result: FoodRecognitionResult): boolean {
    return result.foods.some(food => food.confidence < this.LOW_CONFIDENCE_THRESHOLD);
  }

  /**
   * Enrich result with additional context
   */
  private enrichResult(
    result: FoodRecognitionResult,
    context: RecognitionContext
  ): FoodRecognitionResult {
    // Detect meal context if not provided
    if (!result.mealContext) {
      result.mealContext = detectMealContext(context.mealTime);
    }

    // Ensure all foods have nameLocal
    result.foods = result.foods.map(food => ({
      ...food,
      nameLocal: food.nameLocal || food.name,
    }));

    return result;
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    type: ErrorType,
    message: string,
    suggestion?: string
  ): RecognitionResponse {
    return {
      success: false,
      error: {
        type,
        message,
        suggestion,
      },
    };
  }

  /**
   * Recognize food from text description (no image)
   * e.g. "午饭吃了鸡饭" or "I had chicken rice for lunch"
   */
  async recognizeFoodFromText(
    text: string,
    context: RecognitionContext
  ): Promise<RecognitionResponse> {
    const startTime = Date.now();

    try {
      logger.info({ userId: context.userId, text: text.substring(0, 50) }, 'Starting text food recognition');

      const systemPrompt = buildFoodRecognitionPrompt({
        language: context.language,
        mealTime: context.mealTime,
      });

      const userPrompt = `The user described what they ate in text (no image). Based on the description, estimate the nutrition as accurately as possible using your Singapore food database knowledge.

User said: "${text}"

Return the same JSON format as image recognition. Set confidence to 70 for text-based estimates. If the description is vague, use standard Singapore hawker portions.`;

      const response = await Promise.race([
        openai.chat.completions.create({
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: this.MAX_TOKENS,
          temperature: this.TEMPERATURE,
          response_format: { type: 'json_object' },
        }),
        this.createTimeoutPromise(),
      ]);

      const processingTime = Date.now() - startTime;
      const tokensUsed = response.usage?.total_tokens || 0;

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.createErrorResponse(
          ErrorType.AI_API_ERROR,
          'Failed to get response from AI',
          'Please try again.'
        );
      }

      const result = JSON.parse(content) as FoodRecognitionResult;

      const validationError = this.validateResult(result);
      if (validationError) {
        return this.createErrorResponse(ErrorType.AI_API_ERROR, validationError);
      }

      const enrichedResult = this.enrichResult(result, context);

      logger.info({
        foodCount: enrichedResult.foods.length,
        processingTime,
      }, 'Text food recognition completed');

      return {
        success: true,
        result: enrichedResult,
        tokensUsed,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error({ error, userId: context.userId, processingTime }, 'Text food recognition failed');

      if (error instanceof Error && error.message === 'API_TIMEOUT') {
        return this.createErrorResponse(ErrorType.TIMEOUT_ERROR, 'Recognition timed out. Please try again.');
      }

      return this.createErrorResponse(ErrorType.AI_API_ERROR, 'Failed to recognize food from text.');
    }
  }
}

export const foodRecognizer = new FoodRecognizer();
