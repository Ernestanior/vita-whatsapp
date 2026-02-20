/**
 * Test Phase 3 Commands - Fixed Version
 * Tests all Phase 3 commands via WhatsApp simulation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_PHONE = '+6512345678';

async function testPhase3Commands() {
  console.log('🧪 Testing Phase 3 Commands\n');

  try {
    // Test 1: Streak command
    console.log('1️⃣ Testing STREAK command...');
    const streakResponse = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-streak-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: 'streak' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });
    console.log('   Status:', streakResponse.status);
    if (streakResponse.status === 200) {
      console.log('   ✅ Streak command sent successfully\n');
    } else {
      console.log('   ❌ Failed:', await streakResponse.text(), '\n');
    }

    // Wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Budget command (view)
    console.log('2️⃣ Testing BUDGET command (view)...');
    const budgetViewResponse = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-budget-view-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: 'budget' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });
    console.log('   Status:', budgetViewResponse.status);
    if (budgetViewResponse.status === 200) {
      console.log('   ✅ Budget view command sent successfully\n');
    } else {
      console.log('   ❌ Failed:', await budgetViewResponse.text(), '\n');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Budget command (set)
    console.log('3️⃣ Testing BUDGET SET command...');
    const budgetSetResponse = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-budget-set-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: 'budget set 1800' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });
    console.log('   Status:', budgetSetResponse.status);
    if (budgetSetResponse.status === 200) {
      console.log('   ✅ Budget set command sent successfully\n');
    } else {
      console.log('   ❌ Failed:', await budgetSetResponse.text(), '\n');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Preferences command
    console.log('4️⃣ Testing PREFERENCES command...');
    const preferencesResponse = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-preferences-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: 'preferences' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });
    console.log('   Status:', preferencesResponse.status);
    if (preferencesResponse.status === 200) {
      console.log('   ✅ Preferences command sent successfully\n');
    } else {
      console.log('   ❌ Failed:', await preferencesResponse.text(), '\n');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Chinese command (连续)
    console.log('5️⃣ Testing Chinese STREAK command (连续)...');
    const chineseStreakResponse = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'test-chinese-streak-' + Date.now(),
                from: TEST_USER_PHONE,
                type: 'text',
                text: { body: '连续' },
                timestamp: Math.floor(Date.now() / 1000).toString(),
              }],
              contacts: [{
                profile: { name: 'Test User' },
                wa_id: TEST_USER_PHONE,
              }],
            },
          }],
        }],
      }),
    });
    console.log('   Status:', chineseStreakResponse.status);
    if (chineseStreakResponse.status === 200) {
      console.log('   ✅ Chinese streak command sent successfully\n');
    } else {
      console.log('   ❌ Failed:', await chineseStreakResponse.text(), '\n');
    }

    console.log('\n✅ All commands sent! Check WhatsApp for responses.\n');
    console.log('📱 Expected responses:');
    console.log('   1. Streak stats with current/longest streak');
    console.log('   2. Budget status (disabled or current usage)');
    console.log('   3. Budget set confirmation (1800 kcal)');
    console.log('   4. Preferences display');
    console.log('   5. Chinese streak stats\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPhase3Commands();
