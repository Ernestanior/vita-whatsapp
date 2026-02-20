#!/usr/bin/env node

/**
 * Phase 3 Readiness Verification Script
 * Checks if all Phase 3 components are ready for testing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Phase 3 Readiness Verification\n');
console.log('═'.repeat(50));

const checks = [];

// Check 1: Database tables exist
async function checkDatabaseTables() {
  console.log('\n1️⃣ Checking Database Tables...\n');
  
  const requiredTables = [
    'user_preferences',
    'daily_budgets',
    'user_streaks',
    'achievements',
    'reminders',
    'visual_cards',
    'feature_discovery',
    'user_engagement_metrics',
  ];

  let allTablesExist = true;

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      
      if (error) {
        if (error.code === '42P01') {
          console.log(`   ❌ Table '${table}' does not exist`);
          allTablesExist = false;
        } else {
          console.log(`   ✅ Table '${table}' exists`);
        }
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table '${table}':`, err.message);
      allTablesExist = false;
    }
  }

  checks.push({
    name: 'Database Tables',
    passed: allTablesExist,
    critical: true,
  });

  return allTablesExist;
}

// Check 2: Service files exist
async function checkServiceFiles() {
  console.log('\n2️⃣ Checking Service Files...\n');
  
  const { existsSync } = await import('fs');
  
  const requiredFiles = [
    'src/lib/phase3/types.ts',
    'src/lib/phase3/service-container.ts',
    'src/lib/phase3/services/feature-discovery-engine.ts',
    'src/lib/phase3/services/preference-manager.ts',
    'src/lib/phase3/services/budget-tracker.ts',
    'src/lib/phase3/services/streak-manager.ts',
    'src/lib/phase3/commands/command-handler.ts',
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} missing`);
      allFilesExist = false;
    }
  }

  checks.push({
    name: 'Service Files',
    passed: allFilesExist,
    critical: true,
  });

  return allFilesExist;
}

// Check 3: Integration files modified
async function checkIntegrationFiles() {
  console.log('\n3️⃣ Checking Integration Files...\n');
  
  const { readFileSync, existsSync } = await import('fs');
  
  const integrationChecks = [
    {
      file: 'src/lib/whatsapp/text-handler.ts',
      contains: 'phase3',
      description: 'Phase 3 command recognition',
    },
    {
      file: 'src/lib/whatsapp/image-handler.ts',
      contains: 'phase3',
      description: 'Phase 3 service calls',
    },
    {
      file: 'src/lib/whatsapp/response-formatter-sg.ts',
      contains: 'phase3',
      description: 'Phase 3 data formatting',
    },
  ];

  let allIntegrated = true;

  for (const check of integrationChecks) {
    if (!existsSync(check.file)) {
      console.log(`   ❌ ${check.file} missing`);
      allIntegrated = false;
      continue;
    }

    const content = readFileSync(check.file, 'utf-8');
    if (content.toLowerCase().includes(check.contains)) {
      console.log(`   ✅ ${check.description} in ${check.file}`);
    } else {
      console.log(`   ⚠️  ${check.description} not found in ${check.file}`);
      allIntegrated = false;
    }
  }

  checks.push({
    name: 'Integration Files',
    passed: allIntegrated,
    critical: true,
  });

  return allIntegrated;
}

// Check 4: Test user streak functionality
async function testStreakFunctionality() {
  console.log('\n4️⃣ Testing Streak Functionality...\n');
  
  try {
    // Get a test user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('   ⚠️  No test user found, skipping streak test');
      checks.push({
        name: 'Streak Functionality',
        passed: false,
        critical: false,
      });
      return false;
    }

    const testUserId = users[0].id;

    // Check if user_streaks table has correct columns
    const { data: streak, error: streakError } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, last_checkin_date, streak_freezes_available')
      .eq('user_id', testUserId)
      .maybeSingle();

    if (streakError) {
      console.log(`   ❌ Error querying user_streaks: ${streakError.message}`);
      checks.push({
        name: 'Streak Functionality',
        passed: false,
        critical: true,
      });
      return false;
    }

    console.log('   ✅ user_streaks table has correct columns');
    console.log('   ✅ Streak functionality ready');

    checks.push({
      name: 'Streak Functionality',
      passed: true,
      critical: true,
    });

    return true;
  } catch (err) {
    console.log(`   ❌ Error testing streak: ${err.message}`);
    checks.push({
      name: 'Streak Functionality',
      passed: false,
      critical: true,
    });
    return false;
  }
}

// Check 5: Test achievements table
async function testAchievementsTable() {
  console.log('\n5️⃣ Testing Achievements Table...\n');
  
  try {
    const { error } = await supabase
      .from('achievements')
      .select('id, achievement_type, achievement_tier, title, description, emoji')
      .limit(1);

    if (error) {
      console.log(`   ❌ Error querying achievements: ${error.message}`);
      checks.push({
        name: 'Achievements Table',
        passed: false,
        critical: true,
      });
      return false;
    }

    console.log('   ✅ achievements table has correct columns');
    console.log('   ✅ Achievement system ready');

    checks.push({
      name: 'Achievements Table',
      passed: true,
      critical: true,
    });

    return true;
  } catch (err) {
    console.log(`   ❌ Error testing achievements: ${err.message}`);
    checks.push({
      name: 'Achievements Table',
      passed: false,
      critical: true,
    });
    return false;
  }
}

// Run all checks
async function runAllChecks() {
  const tablesOk = await checkDatabaseTables();
  const filesOk = await checkServiceFiles();
  const integrationOk = await checkIntegrationFiles();
  const streakOk = await testStreakFunctionality();
  const achievementsOk = await testAchievementsTable();

  console.log('\n═'.repeat(50));
  console.log('\n📊 Verification Summary\n');

  const criticalChecks = checks.filter(c => c.critical);
  const passedCritical = criticalChecks.filter(c => c.passed).length;
  const totalCritical = criticalChecks.length;

  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const critical = check.critical ? '(CRITICAL)' : '';
    console.log(`   ${icon} ${check.name} ${critical}`);
  });

  console.log('\n═'.repeat(50));

  if (passedCritical === totalCritical) {
    console.log('\n🎉 All critical checks passed!');
    console.log('\n✅ Phase 3 is READY for testing!\n');
    console.log('Next steps:');
    console.log('1. Run integration tests: node test-phase3-user-journey.mjs');
    console.log('2. Test with real WhatsApp messages');
    console.log('3. Try commands: streak, budget set 1800, preferences\n');
    return true;
  } else {
    console.log(`\n⚠️  ${totalCritical - passedCritical} critical check(s) failed\n`);
    
    if (!tablesOk) {
      console.log('❌ Database migration required!');
      console.log('\nPlease run the migration:');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Copy contents of: migrations/011_phase3_FINAL.sql');
      console.log('3. Paste and run in SQL Editor\n');
    }
    
    return false;
  }
}

// Run the verification
runAllChecks()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n❌ Verification failed:', err);
    process.exit(1);
  });
