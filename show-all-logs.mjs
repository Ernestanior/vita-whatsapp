#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function showLogs() {
  try {
    const response = await fetch(`${BASE_URL}/api/debug-logs`);
    const data = await response.json();
    const logs = data.logs || [];
    
    console.log(`\n📊 Total Logs: ${logs.length}\n`);
    console.log('═'.repeat(80));
    
    for (const log of logs) {
      console.log(`\n[${log.timestamp}] ${log.type}`);
      console.log(JSON.stringify(log, null, 2));
      console.log('─'.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

showLogs();
