/**
 * Debug Logs Endpoint
 * Shows recent webhook activity and errors
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory log storage (will reset on deployment)
const logs: any[] = [];
const MAX_LOGS = 100;

export function addLog(log: any) {
  logs.unshift({
    ...log,
    timestamp: new Date().toISOString(),
  });
  
  // Keep only last 100 logs
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    count: logs.length,
    logs: logs.slice(0, 50), // Return last 50 logs
  });
}

export async function POST(request: NextRequest) {
  // Clear logs
  logs.length = 0;
  return NextResponse.json({
    success: true,
    message: 'Logs cleared',
  });
}
