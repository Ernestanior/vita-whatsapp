/**
 * Products API
 * Returns available subscription products and pricing
 * Requirements: 7.3
 */

import { NextResponse } from 'next/server';
import { StripeManager } from '@/lib/stripe/stripe-manager';

export async function GET() {
  try {
    const stripeManager = new StripeManager();
    const products = stripeManager.getProducts();

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);

    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}
