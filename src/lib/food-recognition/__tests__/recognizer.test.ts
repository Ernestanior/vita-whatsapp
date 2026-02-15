import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FoodRecognizer } from '../recognizer';
import { ErrorType } from '@/types';
import sharp from 'sharp';

// Mock OpenAI client
jest.mock('@/lib/openai/client', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { openai } from '@/lib/openai/client';

describe('FoodRecognizer', () => {
  let recognizer: FoodRecognizer;
  let mockCreate: jest.MockedFunction<typeof openai.chat.completions.create>;

  beforeEach(() => {
    recognizer = new FoodRecognizer();
    mockCreate = openai.chat.completions.create as jest.MockedFunction<
      typeof openai.chat.completions.create
    >;
    jest.clearAllMocks();
  });

  async function createTestImage(): Promise<Buffer> {
    return await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 3,
        background: { r: 255, g: 200, b: 100 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  describe('recognizeFood', () => {
    it('should successfully recognize food with valid response', async () => {
      const imageBuffer = await createTestImage();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  {
                    name: 'Chicken Rice',
                    nameLocal: '海南鸡饭',
                    confidence: 92,
                    portion: '1 plate',
                    nutrition: {
                      calories: { min: 500, max: 600 },
                      protein: { min: 25, max: 30 },
                      carbs: { min: 60, max: 70 },
                      fat: { min: 15, max: 20 },
                      sodium: { min: 800, max: 1000 },
                    },
                  },
                ],
                totalNutrition: {
                  calories: { min: 500, max: 600 },
                  protein: { min: 25, max: 30 },
                  carbs: { min: 60, max: 70 },
                  fat: { min: 15, max: 20 },
                  sodium: { min: 800, max: 1000 },
                },
                mealContext: 'lunch',
              }),
            },
          },
        ],
        usage: {
          total_tokens: 1234,
        },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
      expect(response.result!.foods).toHaveLength(1);
      expect(response.result!.foods[0].name).toBe('Chicken Rice');
      expect(response.result!.foods[0].confidence).toBe(92);
      expect(response.tokensUsed).toBe(1234);
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should handle low confidence recognition', async () => {
      const imageBuffer = await createTestImage();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  {
                    name: 'Unknown Dish',
                    nameLocal: 'Unknown',
                    confidence: 45, // Low confidence
                    portion: '1 plate',
                    nutrition: {
                      calories: { min: 400, max: 600 },
                      protein: { min: 15, max: 25 },
                      carbs: { min: 50, max: 70 },
                      fat: { min: 10, max: 20 },
                      sodium: { min: 600, max: 1000 },
                    },
                  },
                ],
                totalNutrition: {
                  calories: { min: 400, max: 600 },
                  protein: { min: 15, max: 25 },
                  carbs: { min: 50, max: 70 },
                  fat: { min: 10, max: 20 },
                  sodium: { min: 600, max: 1000 },
                },
                mealContext: 'lunch',
              }),
            },
          },
        ],
        usage: { total_tokens: 1000 },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      // Should still succeed but flag low confidence
      expect(response.success).toBe(true);
      expect(response.result!.foods[0].confidence).toBeLessThan(60);
    });

    it('should reject invalid image format', async () => {
      const invalidBuffer = Buffer.from('not an image');

      const response = await recognizer.recognizeFood(invalidBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.UNSUPPORTED_CONTENT);
      expect(response.error?.message).toContain('Invalid image format');
    });

    it('should handle missing nutrition data', async () => {
      const imageBuffer = await createTestImage();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  {
                    name: 'Chicken Rice',
                    nameLocal: '海南鸡饭',
                    confidence: 92,
                    portion: '1 plate',
                    // Missing nutrition data
                  },
                ],
              }),
            },
          },
        ],
        usage: { total_tokens: 1000 },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.AI_API_ERROR);
      expect(response.error?.message).toContain('Incomplete food information');
    });

    it('should handle invalid nutrition ranges', async () => {
      const imageBuffer = await createTestImage();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  {
                    name: 'Chicken Rice',
                    nameLocal: '海南鸡饭',
                    confidence: 92,
                    portion: '1 plate',
                    nutrition: {
                      calories: { min: 600, max: 500 }, // Invalid: min > max
                      protein: { min: 25, max: 30 },
                      carbs: { min: 60, max: 70 },
                      fat: { min: 15, max: 20 },
                      sodium: { min: 800, max: 1000 },
                    },
                  },
                ],
                totalNutrition: {
                  calories: { min: 600, max: 500 },
                  protein: { min: 25, max: 30 },
                  carbs: { min: 60, max: 70 },
                  fat: { min: 15, max: 20 },
                  sodium: { min: 800, max: 1000 },
                },
              }),
            },
          },
        ],
        usage: { total_tokens: 1000 },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.AI_API_ERROR);
      expect(response.error?.message).toContain('Invalid nutrition ranges');
    });

    it('should handle API timeout', async () => {
      const imageBuffer = await createTestImage();

      mockCreate.mockRejectedValue(new Error('Request timeout'));

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it('should handle rate limit errors', async () => {
      const imageBuffer = await createTestImage();

      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
      });

      expect(response.success).toBe(false);
      expect(response.error?.type).toBe(ErrorType.AI_API_ERROR);
      expect(response.error?.message).toContain('temporarily busy');
    });

    it('should enrich result with meal context', async () => {
      const imageBuffer = await createTestImage();

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                foods: [
                  {
                    name: 'Chicken Rice',
                    nameLocal: '海南鸡饭',
                    confidence: 92,
                    portion: '1 plate',
                    nutrition: {
                      calories: { min: 500, max: 600 },
                      protein: { min: 25, max: 30 },
                      carbs: { min: 60, max: 70 },
                      fat: { min: 15, max: 20 },
                      sodium: { min: 800, max: 1000 },
                    },
                  },
                ],
                totalNutrition: {
                  calories: { min: 500, max: 600 },
                  protein: { min: 25, max: 30 },
                  carbs: { min: 60, max: 70 },
                  fat: { min: 15, max: 20 },
                  sodium: { min: 800, max: 1000 },
                },
                // No mealContext provided
              }),
            },
          },
        ],
        usage: { total_tokens: 1000 },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const lunchTime = new Date('2024-01-01T12:00:00');
      const response = await recognizer.recognizeFood(imageBuffer, {
        userId: 'test-user',
        language: 'en',
        mealTime: lunchTime,
      });

      expect(response.success).toBe(true);
      expect(response.result!.mealContext).toBe('lunch');
    });
  });
});
