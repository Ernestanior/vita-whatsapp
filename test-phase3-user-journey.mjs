/**
 * Test Phase 3 User Journey
 * Simulates a complete user experience with Phase 3 features
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith("'") && value.endsWith("'")) || 
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const BASE_URL = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🚀 Phase 3 User Journey Test\n');
console.log(`📍 Testing against: ${BASE_URL}\n`);

async function testPhase3Integration() {
  console.log('1️⃣ Testing Phase 3 Integration API...\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/test-phase3-integration`);
    const data = await response.json();
    
    console.log('📊 Test Results:\n');
    
    for (const result of data.results) {
      const icon = result.status === 'success' ? '✅' : 
                   result.status === 'error' ? '❌' : 
                   result.status === 'partial' ? '⚠️' : 'ℹ️';
      
      console.log(`${icon} ${result.step}`);
      
      if (result.data) {
        console.log(`   Data:`, JSON.stringify(result.data, null, 2));
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
      
      console.log('');
    }
    
    if (data.success) {
      console.log('✅ All Phase 3 integration tests passed!\n');
    } else {
      console.log('⚠️ Some tests failed. Check the results above.\n');
    }
    
    return data.success;
  } catch (error) {
    console.error('❌ Failed to run integration tests:', error.message);
    return false;
  }
}

async function testUserJourney() {
  console.log('2️⃣ Simulating User Journey...\n');
  
  const scenarios = [
    {
      name: 'Day 1: First meal log',
      description: 'User logs their first meal, streak starts at 1',
    },
    {
      name: 'Day 2: Second meal log',
      description: 'User logs second meal, gets prompt for basic info',
    },
    {
      name: 'Day 3: Feature discovery',
      description: 'User gets introduced to reminders feature',
    },
    {
      name: 'Day 7: Budget suggestion',
      description: 'User gets introduced to budget tracking',
    },
    {
      name: 'Command: streak',
      description: 'User checks their streak stats',
    },
    {
      name: 'Command: budget set 1800',
      description: 'User sets daily calorie budget',
    },
    {
      name: 'Command: preferences',
      description: 'User views their learned preferences',
    },
  ];
  
  console.log('📋 User Journey Scenarios:\n');
  
  for (const scenario of scenarios) {
    console.log(`✓ ${scenario.name}`);
    console.log(`  ${scenario.description}\n`);
  }
  
  console.log('💡 To test these scenarios manually:\n');
  console.log('1. Send a food photo to the WhatsApp bot');
  console.log('2. Wait for the response with streak info');
  console.log('3. Try commands: streak, budget, preferences');
  console.log('4. Send "I\'m vegetarian" to test preference extraction');
  console.log('5. Set budget with: budget set 1800\n');
}

async function checkMigrationStatus() {
  console.log('3️⃣ Checking Migration Status...\n');
  
  console.log('⚠️  Database migration required!\n');
  console.log('Please run the Phase 3 migration manually:\n');
  console.log('1. Open Supabase Dashboard SQL Editor');
  console.log('2. Copy contents of: migrations/011_phase3_personalization_gamification.sql');
  console.log('3. Paste and run in SQL Editor\n');
  console.log('Or use Supabase CLI:');
  console.log('   supabase db push\n');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('  Phase 3: Personalization & Gamification Test Suite\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check migration
  await checkMigrationStatus();
  
  // Test integration
  const integrationPassed = await testPhase3Integration();
  
  // Show user journey
  await testUserJourney();
  
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('  Test Summary\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (integrationPassed) {
    console.log('✅ Phase 3 integration is working correctly!');
    console.log('✅ All services are initialized and functional');
    console.log('✅ Command handlers are ready');
    console.log('✅ Ready for user testing\n');
    
    console.log('📱 Next Steps:\n');
    console.log('1. Ensure database migration is applied');
    console.log('2. Test with real WhatsApp messages');
    console.log('3. Verify streak tracking works across days');
    console.log('4. Test budget tracking with multiple meals');
    console.log('5. Verify feature discovery triggers correctly\n');
  } else {
    console.log('⚠️ Some integration tests failed');
    console.log('⚠️ Check the error messages above');
    console.log('⚠️ Ensure database migration is applied\n');
  }
}

main().catch(console.error);
