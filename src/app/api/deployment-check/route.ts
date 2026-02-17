import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    deploymentTime: new Date().toISOString(),
    version: '190c39f',
    message: 'Webhook processing is now synchronous',
  });
}
