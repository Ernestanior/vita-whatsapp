#!/usr/bin/env node

/**
 * Comprehensive test of all Phase 3 commands
 */

import dotenv from 'dotenv';
dotenv.config();

const TEST_USER = process.env.TEST_WHATSAPP_NUMBER || '6583153431';
const BASE_URL = 'http://localhost:3000';

console.log('\n🧪 Testing All Phase 3 Commands\n');
console.log('═'.repeat(80));
console.log(`\nTest User: ${TEST_USER}`);
console.log(`Base URL: ${BASE_URL}\n`);

// Simulate WhatsApp webhook message
async function sendTestMessage(text, description) {
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

  console.log(`\n📝 Test: ${description}`);
  console.log(`   Command: "${text}"`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const status = response.status;
    
    if (status === 200) {
      console.log(`   ✅ Status: ${status} - Message processed`);
    } else {
      const text = await response.text();
      console.log(`   ❌ Status: ${status} - Error: ${text}`);
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

// Test all commands
async function runTests() {
  console.log('\n🔥 STREAK COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('streak', 'View streak stats');
  
  console.log('\n\n💰 BUDGET COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('budget status', 'Check budget status');
  await sendTestMessage('budget set 2000', 'Set budget to 2000 kcal');
  await sendTestMessage('budget disable', 'Disable budget tracking');
  await sendTestMessage('budget enable', 'Re-enable budget tracking');
  
  console.log('\n\n⚙️ PREFERENCES COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('preferences', 'View current preferences');
  await sendTestMessage('I am vegetarian', 'Set vegetarian preference (natural language)');
  await sendTestMessage('I am allergic to peanuts', 'Set allergy (natural language)');
  
  console.log('\n\n🎴 CARD COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('card', 'View visual card');
  
  console.log('\n\n⏰ REMINDER COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('reminders', 'View reminders');
  
  console.log('\n\n📊 PROGRESS COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('progress', 'View progress');
  
  console.log('\n\n🔍 COMPARE COMMANDS:\n');
  console.log('─'.repeat(80));
  await sendTestMessage('compare', 'Compare meals');
  
  console.log('\n\n' + '═'.repeat(80));
  console.log('\n✅ All tests completed!\n');
  console.log('📱 Check your WhatsApp (${TEST_USER}) for responses\n');
  console.log('💡 Tip: Check server logs with: node show-all-logs.mjs\n');
}

// Wait for server to be ready
console.log('⏳ Waiting for server to be ready...\n');
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);
