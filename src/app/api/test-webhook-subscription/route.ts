/**
 * Test Webhook Subscription
 * Checks if webhook is properly subscribed to messages field
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

export async function GET(request: NextRequest) {
  try {
    const appId = '1310039257567144';
    const appToken = `${appId}|${env.WHATSAPP_APP_SECRET}`;
    
    // Check app subscriptions
    const appSubsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${appId}/subscriptions?access_token=${appToken}`
    );
    const appSubs = await appSubsResponse.json();
    
    // Check WABA subscriptions
    const wabaId = '759692460137163';
    const wabaSubsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps?access_token=${env.WHATSAPP_TOKEN}`
    );
    const wabaSubs = await wabaSubsResponse.json();
    
    return NextResponse.json({
      success: true,
      appSubscriptions: appSubs,
      wabaSubscriptions: wabaSubs,
      analysis: {
        appHasWebhook: appSubs.data?.length > 0,
        appFields: appSubs.data?.[0]?.fields || [],
        wabaConnected: wabaSubs.data?.length > 0,
        wabaFields: wabaSubs.data?.[0]?.whatsapp_business_api_data?.subscribed_fields || [],
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
