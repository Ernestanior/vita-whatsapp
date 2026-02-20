/**
 * Verify Phase 3 Setup
 * Checks database tables and basic functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifySetup() {
  console.log('🔍 Verifying Phase 3 Setup\n');
  console.log('='.repeat(60));

  const checks = [];

  // Check 1: User Streaks table
  console.log('\n1️⃣ Checking user_streaks table...');
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ user_streaks table exists');
    checks.push({ name: 'user_streaks', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'user_streaks', status: 'error', error: error.message });
  }

  // Check 2: Daily Budgets table
  console.log('\n2️⃣ Checking daily_budgets table...');
  try {
    const { data, error } = await supabase
      .from('daily_budgets')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ daily_budgets table exists');
    checks.push({ name: 'daily_budgets', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'daily_budgets', status: 'error', error: error.message });
  }

  // Check 3: User Preferences table
  console.log('\n3️⃣ Checking user_preferences table...');
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ user_preferences table exists');
    checks.push({ name: 'user_preferences', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'user_preferences', status: 'error', error: error.message });
  }

  // Check 4: Achievements table
  console.log('\n4️⃣ Checking achievements table...');
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ achievements table exists');
    checks.push({ name: 'achievements', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'achievements', status: 'error', error: error.message });
  }

  // Check 5: Feature Discovery table
  console.log('\n5️⃣ Checking feature_discovery table...');
  try {
    const { data, error } = await supabase
      .from('feature_discovery')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ feature_discovery table exists');
    checks.push({ name: 'feature_discovery', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'feature_discovery', status: 'error', error: error.message });
  }

  // Check 6: Meal Reminders table
  console.log('\n6️⃣ Checking meal_reminders table...');
  try {
    const { data, error } = await supabase
      .from('meal_reminders')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ meal_reminders table exists');
    checks.push({ name: 'meal_reminders', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'meal_reminders', status: 'error', error: error.message });
  }

  // Check 7: Visual Cards table
  console.log('\n7️⃣ Checking visual_cards table...');
  try {
    const { data, error } = await supabase
      .from('visual_cards')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('   ✅ visual_cards table exists');
    checks.push({ name: 'visual_cards', status: 'ok' });
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'visual_cards', status: 'error', error: error.message });
  }

  // Check 8: Test user exists
  console.log('\n8️⃣ Checking test user...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', '+6512345678')
      .maybeSingle();
    
    if (error) throw error;
    if (data) {
      console.log('   ✅ Test user exists:', data.id);
      checks.push({ name: 'test_user', status: 'ok', userId: data.id });
    } else {
      console.log('   ⚠️  Test user not found (will be created on first message)');
      checks.push({ name: 'test_user', status: 'not_found' });
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    checks.push({ name: 'test_user', status: 'error', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  
  const okCount = checks.filter(c => c.status === 'ok').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'not_found').length;

  console.log(`✅ Passed: ${okCount}`);
  if (warningCount > 0) console.log(`⚠️  Warnings: ${warningCount}`);
  if (errorCount > 0) console.log(`❌ Failed: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Phase 3 database setup is complete!\n');
    console.log('Next steps:');
    console.log('1. Run: node test-commands-simple.mjs');
    console.log('2. Check WhatsApp for command responses');
    console.log('3. Send food photos to test integration\n');
  } else {
    console.log('\n⚠️  Some tables are missing. Run migration:');
    console.log('node scripts/apply-phase3-migration.mjs\n');
  }
}

verifySetup().catch(console.error);
