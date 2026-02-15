/**
 * CostOptimizer - Optimizes AI API costs through intelligent strategies
 * 
 * Responsibilities:
 * - Select appropriate AI model based on context
 * - Optimize image quality before API calls
 * - Check cache before making API calls
 * - Record API usage and costs
 * - Implement cost-saving strategies
 * 
 * Requirements: 20.1, 20.3, 20.5
 */

import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

/**
 * AI Model configuration
 */
export interface AIModel {
  name: string;
  inputCostPer1M: number; // USD per 1M tokens
  outputCostPer1M: number; // USD per 1M tokens
  maxTokens: number;
  supportsVision: boolean;
}

/**
 * Available AI models
 */
export const AI_MODELS: Record<string, AIModel> = {
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    maxTokens: 128000,
    supportsVision: true,
  },
  'gpt-4o': {
    name: 'gpt-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
    maxTokens: 128000,
    supportsVision: true,
  },
};

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

/**
 * API call metrics
 */
export interface APICallMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
  imageOptimized: boolean;
  originalImageSize?: number;
  optimizedImageSize?: number;
  duration: number;
}

export class CostOptimizer {
  private readonly DEFAULT_IMAGE_OPTIONS: ImageOptimizationOptions = {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 85,
    format: 'jpeg',
  };

  /**
   * Optimize AI API call with cost-saving strategies
   * Requirements: 20.1, 20.3, 20.5
   */
  async optimizeAPICall<T>(
    operation: () => Promise<T>,
    context: {
      userId: string;
      userTier: 'free' | 'premium' | 'pro';
      imageBuffer?: Buffer;
      cacheKey?: string;
    }
  ): Promise<{ result: T; metrics: APICallMetrics }> {
    const startTime = Date.now();
    let cached = false;
    let imageOptimized = false;
    let originalImageSize: number | undefined;
    let optimizedImageSize: number | undefined;

    try {
      // 1. Check cache first
      if (context.cacheKey) {
        const cachedResult = await this.checkCache<T>(context.cacheKey);
        if (cachedResult) {
          cached = true;
          const duration = Date.now() - startTime;

          logger.info(
            {
              userId: context.userId,
              cacheKey: context.cacheKey,
              duration,
            },
            'Cache hit - API call avoided'
          );

          return {
            result: cachedResult,
            metrics: {
              model: 'cached',
              inputTokens: 0,
              outputTokens: 0,
              cost: 0,
              cached: true,
              imageOptimized: false,
              duration,
            },
          };
        }
      }

      // 2. Optimize image if provided
      let optimizedBuffer: Buffer | undefined;
      if (context.imageBuffer) {
        originalImageSize = context.imageBuffer.length;
        optimizedBuffer = await this.optimizeImage(context.imageBuffer);
        optimizedImageSize = optimizedBuffer.length;
        imageOptimized = true;

        logger.info(
          {
            userId: context.userId,
            originalSize: originalImageSize,
            optimizedSize: optimizedImageSize,
            reduction: ((1 - optimizedImageSize / originalImageSize) * 100).toFixed(1) + '%',
          },
          'Image optimized'
        );
      }

      // 3. Execute operation
      const result = await operation();

      // 4. Cache result if cache key provided
      if (context.cacheKey && result) {
        await this.cacheResult(context.cacheKey, result);
      }

      const duration = Date.now() - startTime;

      // 5. Estimate cost (actual tokens would come from API response)
      const estimatedMetrics: APICallMetrics = {
        model: this.selectModel(context.userTier),
        inputTokens: 0, // Would be filled by actual API response
        outputTokens: 0, // Would be filled by actual API response
        cost: 0, // Would be calculated from actual tokens
        cached: false,
        imageOptimized,
        originalImageSize,
        optimizedImageSize,
        duration,
      };

      return {
        result,
        metrics: estimatedMetrics,
      };
    } catch (error) {
      logger.error(
        {
          error,
          userId: context.userId,
          cached,
          imageOptimized,
        },
        'API call optimization failed'
      );
      throw error;
    }
  }

  /**
   * Select appropriate AI model based on user tier and context
   * Requirements: 20.3
   */
  selectModel(userTier: 'free' | 'premium' | 'pro'): string {
    // Pro users get the best model for higher accuracy
    if (userTier === 'pro') {
      return 'gpt-4o';
    }

    // Free and Premium users get the cost-effective model
    return 'gpt-4o-mini';
  }

  /**
   * Optimize image to reduce token usage
   * Requirements: 20.1
   */
  async optimizeImage(
    imageBuffer: Buffer,
    options: Partial<ImageOptimizationOptions> = {}
  ): Promise<Buffer> {
    const opts = { ...this.DEFAULT_IMAGE_OPTIONS, ...options };

    try {
      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();

      // Skip optimization if already small enough
      if (
        metadata.width &&
        metadata.height &&
        metadata.width <= opts.maxWidth &&
        metadata.height <= opts.maxHeight &&
        imageBuffer.length < 500 * 1024 // < 500KB
      ) {
        return imageBuffer;
      }

      // Optimize image
      const optimized = await sharp(imageBuffer)
        .resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: opts.quality,
          progressive: true,
        })
        .toBuffer();

      return optimized;
    } catch (error) {
      logger.error({ error }, 'Image optimization failed, using original');
      return imageBuffer;
    }
  }

  /**
   * Calculate image hash for caching
   * Requirements: 20.5
   */
  calculateImageHash(imageBuffer: Buffer): string {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Check cache for existing result
   * Requirements: 20.5
   */
  private async checkCache<T>(cacheKey: string): Promise<T | null> {
    try {
      // Use Redis directly for generic caching
      const { redis } = await import('@/lib/redis/client');
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      logger.warn({ error, cacheKey }, 'Cache check failed');
      return null;
    }
  }

  /**
   * Cache result for future use
   * Requirements: 20.5
   */
  private async cacheResult<T>(cacheKey: string, result: T): Promise<void> {
    try {
      // Cache for 7 days
      const { redis } = await import('@/lib/redis/client');
      await redis.setex(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(result));
    } catch (error) {
      logger.warn({ error, cacheKey }, 'Failed to cache result');
    }
  }

  /**
   * Calculate cost from token usage
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = AI_MODELS[model];
    if (!modelConfig) {
      logger.warn({ model }, 'Unknown model for cost calculation');
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * modelConfig.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * modelConfig.outputCostPer1M;

    return inputCost + outputCost;
  }

  /**
   * Estimate tokens from image size
   * Rough estimation: 1024x1024 image ≈ 1000 tokens
   */
  estimateImageTokens(imageSize: number): number {
    // Base tokens for image processing
    const baseTokens = 85;

    // Additional tokens based on image size
    // Assuming ~1 token per KB
    const sizeTokens = Math.ceil(imageSize / 1024);

    return baseTokens + sizeTokens;
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName: string): AIModel | null {
    return AI_MODELS[modelName] || null;
  }

  /**
   * Check if cost optimization is enabled
   */
  isOptimizationEnabled(): boolean {
    return process.env.ENABLE_COST_OPTIMIZATION !== 'false';
  }

  /**
   * Get optimization statistics
   */
  async getOptimizationStats(_userId: string, _days: number = 7): Promise<{
    totalCalls: number;
    cachedCalls: number;
    cacheHitRate: number;
    totalCost: number;
    savedCost: number;
  }> {
    // This would query from a metrics database
    // For now, return placeholder
    return {
      totalCalls: 0,
      cachedCalls: 0,
      cacheHitRate: 0,
      totalCost: 0,
      savedCost: 0,
    };
  }
}

// Singleton instance
export const costOptimizer = new CostOptimizer();
