/**
 * Manual test script for PreferenceService
 * Run this to verify Tasks 4.1 and 4.2 implementation
 * 
 * Usage: npx tsx src/lib/phase3/services/__tests__/manual-test-preferences.ts
 */

import { PreferenceService } from '../preference-manager';

// Mock Supabase client for testing
const mockSupabase: any = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        gte: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    upsert: () => Promise.resolve({ error: null }),
  }),
};

async function testPreferenceExtraction() {
  console.log('=== Testing Task 4.1: NLP-based Preference Extraction ===\n');
  
  const service = new PreferenceService(mockSupabase);

  // Test 1: Extract vegetarian
  console.log('Test 1: Extract vegetarian dietary type');
  const result1 = await service.extractFromMessage('user123', "I'm vegetarian");
  console.log('Input: "I\'m vegetarian"');
  console.log('Result:', result1);
  console.log('✓ Should contain "vegetarian":', result1.dietaryType?.includes('vegetarian'));
  console.log();

  // Test 2: Extract halal
  console.log('Test 2: Extract halal dietary type');
  const result2 = await service.extractFromMessage('user123', 'I only eat halal food');
  console.log('Input: "I only eat halal food"');
  console.log('Result:', result2);
  console.log('✓ Should contain "halal":', result2.dietaryType?.includes('halal'));
  console.log();

  // Test 3: Extract peanut allergy
  console.log('Test 3: Extract peanut allergy');
  const result3 = await service.extractFromMessage('user123', "I'm allergic to peanuts");
  console.log('Input: "I\'m allergic to peanuts"');
  console.log('Result:', result3);
  console.log('✓ Should detect peanut allergy:', result3.allergies?.[0]?.allergen === 'peanuts');
  console.log('✓ Should be severe:', result3.allergies?.[0]?.severity === 'severe');
  console.log();

  // Test 4: Extract multiple dietary types
  console.log('Test 4: Extract multiple dietary types');
  const result4 = await service.extractFromMessage('user123', "I'm vegetarian and gluten-free");
  console.log('Input: "I\'m vegetarian and gluten-free"');
  console.log('Result:', result4);
  console.log('✓ Should contain both:', 
    result4.dietaryType?.includes('vegetarian') && 
    result4.dietaryType?.includes('gluten-free')
  );
  console.log();

  // Test 5: Chinese text
  console.log('Test 5: Chinese text for dietary type');
  const result5 = await service.extractFromMessage('user123', '我吃素');
  console.log('Input: "我吃素"');
  console.log('Result:', result5);
  console.log('✓ Should detect vegetarian:', result5.dietaryType?.includes('vegetarian'));
  console.log();

  // Test 6: No allergy without keywords
  console.log('Test 6: Should not extract allergy without keywords');
  const result6 = await service.extractFromMessage('user123', 'I love peanuts');
  console.log('Input: "I love peanuts"');
  console.log('Result:', result6);
  console.log('✓ Should not detect allergy:', !result6.allergies || result6.allergies.length === 0);
  console.log();
}

async function testAllergenChecking() {
  console.log('\n=== Testing Task 4.2: Allergen Checking System ===\n');
  
  const service = new PreferenceService(mockSupabase);

  // Mock getPreferences to return test allergies
  (service as any).getPreferences = async () => ({
    dietaryType: [],
    allergies: [
      { allergen: 'peanuts', severity: 'severe', detectedFrom: 'user_mention' },
      { allergen: 'shellfish', severity: 'severe', detectedFrom: 'user_mention' },
      { allergen: 'milk', severity: 'moderate', detectedFrom: 'user_mention' },
    ],
    favorites: [],
    eatingHabits: {},
    minimalMode: false,
  });

  // Test 1: Detect peanut allergen
  console.log('Test 1: Detect peanut allergen');
  const warnings1 = await service.checkAllergens('user123', ['peanut butter sandwich']);
  console.log('Food: "peanut butter sandwich"');
  console.log('Warnings:', warnings1);
  console.log('✓ Should warn about peanuts:', warnings1.some(w => w.allergen === 'peanuts'));
  console.log('✓ Should be severe:', warnings1[0]?.severity === 'severe');
  console.log('✓ Message contains "SEVERE":', warnings1[0]?.message.includes('SEVERE'));
  console.log();

  // Test 2: Detect shellfish
  console.log('Test 2: Detect shellfish allergen');
  const warnings2 = await service.checkAllergens('user123', ['shrimp fried rice']);
  console.log('Food: "shrimp fried rice"');
  console.log('Warnings:', warnings2);
  console.log('✓ Should warn about shellfish:', warnings2.some(w => w.allergen === 'shellfish'));
  console.log();

  // Test 3: Safe food
  console.log('Test 3: Safe food (no allergens)');
  const warnings3 = await service.checkAllergens('user123', ['chicken rice']);
  console.log('Food: "chicken rice"');
  console.log('Warnings:', warnings3);
  console.log('✓ Should have no warnings:', warnings3.length === 0);
  console.log();

  // Test 4: Moderate severity
  console.log('Test 4: Moderate severity warning');
  const warnings4 = await service.checkAllergens('user123', ['cheese pizza']);
  console.log('Food: "cheese pizza"');
  console.log('Warnings:', warnings4);
  console.log('✓ Should warn about milk:', warnings4.some(w => w.allergen === 'milk'));
  console.log('✓ Should be moderate:', warnings4.find(w => w.allergen === 'milk')?.severity === 'moderate');
  console.log('✓ Message contains "Allergy Alert":', 
    warnings4.find(w => w.allergen === 'milk')?.message.includes('Allergy Alert')
  );
  console.log();
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  PreferenceService Manual Test                             ║');
  console.log('║  Tasks 4.1 & 4.2: NLP Extraction + Allergen Checking      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await testPreferenceExtraction();
    await testAllergenChecking();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  All tests completed!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

main();
