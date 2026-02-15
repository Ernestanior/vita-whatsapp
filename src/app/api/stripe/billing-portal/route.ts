/**
 * Billing Portal API
 * Creates a Stripe billing portal session for subscription management
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { StripeManager } from '@/lib/stripe/stripe-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, returnUrl } = body;

    if (!customerId || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, returnUrl' },
        { status: 400 }
      );
    }

    const stripeManager = new StripeManager();

    // Create billing portal session
    const url = await stripeManager.createBillingPortalSession(customerId, returnUrl);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Create billing portal error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
