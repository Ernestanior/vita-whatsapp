#!/usr/bin/env node

/**
 * Check what responses were sent for the test commands
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000';

console.log('\n🔍 Checking Command Responses\n');
console.log('═'.repeat(60));

async function checkDebugLogs() {
  try {
    const response = await fetch(`${BASE_URL}/api/debug-logs`);
    const data = await response.json();
    const logs = data.logs || [];
    
    console.log(`\n📊 Found ${logs.length} log entries\n`);
    
    // Filter for recent message processing logs
    const recentLogs = logs; // Already limited to 50
    
    // Look for outgoing messages
    const outgoingMessages = recentLogs.filter(log => 
      log.type === 'whatsapp_message_sent' || 
      log.type === 'sending_message' ||
      (typeof log.message === 'string' && log.message.includes('streak')) ||
      (typeof log.message === 'string' && log.message.includes('budget')) ||
      (typeof log.message === 'string' && log.message.includes('preferences'))
    );
    
    console.log(`\n📤 Outgoing Messages (${outgoingMessages.length}):\n`);
    
    for (const log of outgoingMessages) {
      console.log(`\n[${log.timestamp}]`);
      console.log(`Type: ${log.type}`);
      if (log.message) {
        console.log(`Message: ${log.message.substring(0, 200)}...`);
      }
      if (log.text) {
        console.log(`Text: ${log.text.substring(0, 200)}...`);
      }
      console.log('─'.repeat(60));
    }
    
    // Look for command recognition logs
    const commandLogs = recentLogs.filter(log => 
      log.type === 'command_recognized' ||
      log.type === 'command_recognized_result' ||
      log.type === 'recognizing_command'
    );
    
    console.log(`\n🎯 Command Recognition (${commandLogs.length}):\n`);
    
    for (const log of commandLogs) {
      console.log(`\n[${log.timestamp}]`);
      console.log(`Type: ${log.type}`);
      if (log.command) {
        console.log(`Command: ${log.command}`);
      }
      if (log.text) {
        console.log(`Text: ${log.text}`);
      }
      console.log('─'.repeat(60));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDebugLogs();
