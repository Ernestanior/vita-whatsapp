/**
 * Stripe Module
 * Exports Stripe integration functionality
 */

export { stripe } from './client';
export { StripeManager } from './stripe-manager';
export type {
  SubscriptionProduct,
  CreateSubscriptionParams,
  SubscriptionResult,
} from './stripe-manager';
