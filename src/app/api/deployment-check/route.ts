import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    deploymentTime: new Date().toISOString(),
    version: '42ff22a-FORCE-REDEPLOY',
    message: 'Webhook processing is now synchronous with extensive logging',
    gitCommit: '42ff22a',
  });
}
