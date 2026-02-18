/**
 * Test Singapore-style Response Formatter
 * Tests the new personality-based response system
 */

import { NextResponse } from 'next/server';
import { responseFormatterSG } from '@/lib/whatsapp/response-formatter-sg';
import type { FoodRecognitionResult, HealthRating } from '@/types';

export async function GET() {
  const results: any[] = [];

  try {
    // Mock food recognition result (Roti Prata)
    const mockResult: FoodRecognitionResult = {
      foods: [
        {
          name: 'Roti Prata with Egg',
          nameLocal: 'Roti Prata with Egg',
          confidence: 95,
          portion: '2 pieces with 1 egg',
          nutrition: {
            calories: { min: 550, max: 550 },
            protein: { min: 14, max: 14 },
            carbs: { min: 65, max: 65 },
            fat: { min: 28, max: 28 },
            sodium: { min: 700, max: 700 },
          },
        },
      ],
      totalNutrition: {
        calories: { min: 550, max: 550 },
        protein: { min: 14, max: 14 },
        carbs: { min: 65, max: 65 },
        fat: { min: 28, max: 28 },
        sodium: { min: 700, max: 700 },
      },
      mealContext: 'breakfast',
    };

    // Mock health rating (moderate)
    const mockRating: HealthRating = {
      overall: 'yellow',
      score: 66,
      factors: [
        {
          name: 'Calories',
          status: 'good',
          message: 'Calorie content is appropriate for breakfast (550 kcal)',
        },
        {
          name: 'Sodium',
          status: 'moderate',
          message: 'High sodium content (700mg) - consider reducing',
        },
        {
          name: 'Fat',
          status: 'poor',
          message: 'High fat content (28g, 45% of calories)',
        },
        {
          name: 'Balance',
          status: 'poor',
          message: 'Unbalanced meal (P:10% C:46% F:44%)',
        },
      ],
      suggestions: [
        'Watch sodium intake for the rest of the day',
        'Remove visible fat and chicken skin',
        'Choose steamed or grilled options instead of fried',
        'Add more protein (lean meat, tofu, eggs) for better balance',
      ],
    };

    // Mock budget
    const mockBudget = {
      caloriesUsed: 550,
      caloriesTotal: 2000,
      fatUsed: 28,
      fatTotal: 67,
      sodiumUsed: 700,
      sodiumTotal: 2300,
    };

    // Test 1: Uncle personality
    results.push({
      test: 'Uncle Personality',
      status: 'testing',
    });

    const uncleResponse = responseFormatterSG.formatResponse(
      mockResult,
      mockRating,
      'uncle',
      mockBudget
    );

    results.push({
      test: 'Uncle Personality',
      status: 'success',
      response: uncleResponse,
    });

    // Test 2: Hardcore personality
    results.push({
      test: 'Hardcore Personality',
      status: 'testing',
    });

    const hardcoreResponse = responseFormatterSG.formatResponse(
      mockResult,
      mockRating,
      'hardcore',
      mockBudget
    );

    results.push({
      test: 'Hardcore Personality',
      status: 'success',
      response: hardcoreResponse,
    });

    // Test 3: Gentle personality
    results.push({
      test: 'Gentle Personality',
      status: 'testing',
    });

    const gentleResponse = responseFormatterSG.formatResponse(
      mockResult,
      mockRating,
      'gentle',
      mockBudget
    );

    results.push({
      test: 'Gentle Personality',
      status: 'success',
      response: gentleResponse,
    });

    // Test 4: Without budget
    results.push({
      test: 'Uncle Without Budget',
      status: 'testing',
    });

    const noBudgetResponse = responseFormatterSG.formatResponse(
      mockResult,
      mockRating,
      'uncle'
    );

    results.push({
      test: 'Uncle Without Budget',
      status: 'success',
      response: noBudgetResponse,
    });

    // Summary
    const summary = {
      totalTests: 4,
      passed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results,
    });
  }
}
