#!/usr/bin/env node

/**
 * Test meal logging with Phase 3 integration
 * Simulates sending a food photo and checks if Phase 3 services are triggered
 */

import dotenv from 'dotenv';
dotenv.config();

const TEST_USER = process.env.TEST_WHATSAPP_NUMBER || '6583153431';
const BASE_URL = 'http://localhost:3000';

console.log('\n🍽️ Testing Meal Logging with Phase 3 Integration\n');
console.log('═'.repeat(80));

async function testMealLogging() {
  // First, set a budget
  console.log('\n1️⃣ Setting daily budget to 1800 kcal...');
  await sendCommand('budget set 1800');
  await sleep(2000);
  
  // Check streak before meal
  console.log('\n2️⃣ Checking streak before meal...');
  await sendCommand('streak');
  await sleep(2000);
  
  // Simulate a meal log (we'll use the test API endpoint)
  console.log('\n3️⃣ Simulating meal log...');
  try {
    const response = await fetch(`${BASE_URL}/api/test-phase3-integration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER,
        testType: 'meal_log'
      })
    });
    
    const result = await response.json();
    console.log('   Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('   ✅ Meal logged successfully');
      console.log('   📊 Streak updated:', result.streak ? 'Yes' : 'No');
      console.log('   💰 Budget tracked:', result.budget ? 'Yes' : 'No');
    } else {
      console.log('   ❌ Meal log failed:', result.error);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  await sleep(2000);
  
  // Check streak after meal
  console.log('\n4️⃣ Checking streak after meal...');
  await sendCommand('streak');
  await sleep(2000);
  
  // Check budget status
  console.log('\n5️⃣ Checking budget status...');
  await sendCommand('budget status');
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Test completed!');
  console.log('\n📱 Check your WhatsApp for all responses\n');
}

async function sendCommand(text) {
  const webhookPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15550000000',
            phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: TEST_USER
          }],
          messages: [{
            from: TEST_USER,
            id: `test_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000).toString(),
            text: { body: text },
            type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  console.log(`   Sending: "${text}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (response.status === 200) {
      console.log(`   ✅ Command processed`);
    } else {
      console.log(`   ❌ Error: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testMealLogging().catch(console.error);
