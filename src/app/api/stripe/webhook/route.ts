/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for subscription management
 * Requirements: 7.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { StripeManager } from '@/lib/stripe/stripe-manager';
import { env } from '@/config/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const stripeManager = new StripeManager();

    // Verify webhook signature
    const event = stripeManager.verifyWebhookSignature(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    await stripeManager.handleWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
