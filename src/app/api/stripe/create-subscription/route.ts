/**
 * Create Subscription API
 * Creates a new Stripe subscription for a user
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { StripeManager } from '@/lib/stripe/stripe-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, priceId, tier } = body;

    // Validate required fields
    if (!userId || !email || !priceId || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, priceId, tier' },
        { status: 400 }
      );
    }

    // Validate tier
    if (tier !== 'premium' && tier !== 'pro') {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "premium" or "pro"' },
        { status: 400 }
      );
    }

    const stripeManager = new StripeManager();

    // Create subscription
    const result = await stripeManager.createSubscription({
      userId,
      email,
      priceId,
      tier,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create subscription error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
