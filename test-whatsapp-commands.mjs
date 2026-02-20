#!/usr/bin/env node

/**
 * Test WhatsApp Commands by simulating webhook calls
 */

import dotenv from 'dotenv';
dotenv.config();

const TEST_USER = process.env.TEST_WHATSAPP_NUMBER || '6583153431';
const BASE_URL = 'http://localhost:3000';

console.log('\n🧪 Testing WhatsApp Commands\n');
console.log('═'.repeat(60));
console.log(`\nTest User: ${TEST_USER}`);
console.log(`Base URL: ${BASE_URL}\n`);

// Simulate WhatsApp webhook message
async function sendTestMessage(text) {
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

  console.log(`\n📤 Sending: "${text}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const status = response.status;
    console.log(`   Status: ${status}`);
    
    if (status === 200) {
      console.log('   ✅ Message processed');
    } else {
      const text = await response.text();
      console.log(`   ❌ Error: ${text}`);
    }
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Test commands
async function runTests() {
  console.log('\n🔍 Testing Phase 3 Commands:\n');
  
  const tests = [
    { command: 'streak', description: 'View streak stats' },
    { command: 'budget status', description: 'Check budget status' },
    { command: 'preferences', description: 'View preferences' },
    { command: 'budget set 1800', description: 'Set budget to 1800' },
  ];

  for (const test of tests) {
    console.log(`\nTest: ${test.description}`);
    await sendTestMessage(test.command);
  }

  console.log('\n═'.repeat(60));
  console.log('\n✅ Tests completed!');
  console.log('\n📱 Check your WhatsApp for responses');
  console.log('   If you see proper command responses, it works!');
  console.log('   If you see conversational responses, there\'s still an issue.\n');
}

// Wait for server to be ready
console.log('⏳ Waiting for server to be ready...');
setTimeout(() => {
  runTests().catch(console.error);
}, 5000);
