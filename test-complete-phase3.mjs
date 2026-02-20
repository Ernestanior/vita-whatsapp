#!/usr/bin/env node

/**
 * Complete Phase 3 End-to-End Test
 * Tests all features in a realistic user journey
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🧪 Phase 3 Complete End-to-End Test\n');
console.log('═'.repeat(60));

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    console.log(`\n🔍 ${name}...`);
    await fn();
    console.log(`   ✅ PASSED`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    testsFailed++;
  }
}

// Get or create test user
async function getTestUser() {
  const { data: users } = await supabase
    .from('users')
    .select('id, phone_number')
    .limit(1);

  if (!users || users.length === 0) {
    throw new Error('No test user found');
  }

  return users[0];
}

// Test 1: Database tables exist
await test('Database tables exist', async () => {
  const tables = [
    'user_preferences',
    'daily_budgets',
    'user_streaks',
    'achievements',
    'reminders',
    'visual_cards',
    'feature_discovery',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === '42P01') {
      throw new Error(`Table ${table} does not exist`);
    }
  }
});

// Test 2: Streak tracking
await test('Streak tracking works', async () => {
  const user = await getTestUser();
  
  // Check user_streaks table structure
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_checkin_date, streak_freezes_available')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Streak query failed: ${error.message}`);
  }

  console.log(`   📊 Streak data structure verified`);
});

// Test 3: Achievements table
await test('Achievements table structure', async () => {
  const { error } = await supabase
    .from('achievements')
    .select('id, achievement_type, achievement_tier, title, description, emoji')
    .limit(1);

  if (error) {
    throw new Error(`Achievements query failed: ${error.message}`);
  }

  console.log(`   📊 Achievements table verified`);
});

// Test 4: Budget tracking
await test('Budget tracking works', async () => {
  const user = await getTestUser();
  const today = new Date().toISOString().split('T')[0];

  // Try to insert a test budget
  const { error: insertError } = await supabase
    .from('daily_budgets')
    .upsert({
      user_id: user.id,
      date: today,
      calorie_target: 2000,
      calories_consumed: 0,
      enabled: true,
    }, {
      onConflict: 'user_id,date'
    });

  if (insertError) {
    throw new Error(`Budget insert failed: ${insertError.message}`);
  }

  // Verify we can read it back
  const { data, error: selectError } = await supabase
    .from('daily_budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  if (selectError) {
    throw new Error(`Budget select failed: ${selectError.message}`);
  }

  if (data.calorie_target !== 2000) {
    throw new Error('Budget data mismatch');
  }

  console.log(`   📊 Budget: ${data.calories_consumed}/${data.calorie_target} kcal`);
});

// Test 5: Preferences storage
await test('Preferences storage works', async () => {
  const user = await getTestUser();

  // Try to upsert preferences
  const { error: upsertError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      dietary_types: ['vegetarian'],
      allergies: [{ allergen: 'peanuts', severity: 'severe' }],
      favorite_foods: [],
      disliked_foods: [],
      cuisine_preferences: [],
      meal_timing_preferences: {},
      health_goals: [],
      auto_detected: false,
      language_preference: 'en',
    }, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    throw new Error(`Preferences upsert failed: ${upsertError.message}`);
  }

  // Verify we can read it back
  const { data, error: selectError } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (selectError) {
    throw new Error(`Preferences select failed: ${selectError.message}`);
  }

  if (!data.dietary_types.includes('vegetarian')) {
    throw new Error('Preferences data mismatch');
  }

  console.log(`   📊 Dietary: ${data.dietary_types.join(', ')}`);
});

// Test 6: Feature discovery
await test('Feature discovery tracking', async () => {
  const user = await getTestUser();

  // Try to insert a feature discovery record
  const { error: insertError } = await supabase
    .from('feature_discovery')
    .insert({
      user_id: user.id,
      feature_name: 'test_feature',
      trigger_type: 'milestone',
      trigger_value: 'day_3',
      shown_at: new Date().toISOString(),
      user_engaged: false,
    });

  if (insertError && insertError.code !== '23505') { // Ignore duplicate key
    throw new Error(`Feature discovery insert failed: ${insertError.message}`);
  }

  console.log(`   📊 Feature discovery tracking verified`);
});

// Test 7: API endpoint accessibility
await test('Phase 3 API endpoints accessible', async () => {
  const response = await fetch('http://localhost:3000/api/test-phase3-integration');
  
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.results) {
    throw new Error('API response missing results');
  }

  console.log(`   📊 API tests: ${data.summary.success}/${data.summary.total} passed`);
});

// Test 8: Service container initialization
await test('Service container initializes', async () => {
  const response = await fetch('http://localhost:3000/api/test-phase3-integration');
  const data = await response.json();
  
  const containerTest = data.results.find(r => r.test === 'Service Container');
  
  if (!containerTest || !containerTest.success) {
    throw new Error('Service container failed to initialize');
  }

  console.log(`   📊 All services initialized`);
});

// Summary
console.log('\n═'.repeat(60));
console.log('\n📊 Test Summary\n');
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);
console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Phase 3 is ready for production!\n');
  console.log('Next steps:');
  console.log('1. Test with real WhatsApp messages');
  console.log('2. Try commands: streak, budget set 1800, preferences');
  console.log('3. Monitor for any errors in production\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}
