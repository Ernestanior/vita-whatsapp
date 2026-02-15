/**
 * Cancel Subscription API
 * Cancels a user's Stripe subscription
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { StripeManager } from '@/lib/stripe/stripe-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Missing required field: subscriptionId' },
        { status: 400 }
      );
    }

    const stripeManager = new StripeManager();

    // Cancel subscription
    await stripeManager.cancelSubscription(subscriptionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
