/**
 * Stripe Manager
 * Manages Stripe subscriptions, products, and webhook events
 * Fixed: Issue #4 - Added idempotency handling for webhook events
 * Requirements: 7.3, 7.4, 7.5
 */

import Stripe from 'stripe';
import { stripe } from './client';
import { SubscriptionManager } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/utils/logger';
import { whatsappClient } from '@/lib/whatsapp/client';

export interface SubscriptionProduct {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  priceIdMonthly: string;
  priceIdYearly: string;
  features: string[];
}

export interface CreateSubscriptionParams {
  userId: string;
  email: string;
  priceId: string;
  tier: 'premium' | 'pro';
}

export interface SubscriptionResult {
  subscriptionId: string;
  clientSecret: string;
  customerId: string;
}

export class StripeManager {
  private subscriptionManager: SubscriptionManager;

  constructor() {
    this.subscriptionManager = new SubscriptionManager();
  }

  /**
   * Get subscription products and prices
   * Requirements: 7.3
   */
  getProducts(): SubscriptionProduct[] {
    return [
      {
        id: 'premium',
        name: 'Premium',
        description: 'Unlimited food recognition and daily health summaries',
        priceMonthly: 9.90,
        priceYearly: 99.00, // 20% discount
        priceIdMonthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
        priceIdYearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_premium_yearly',
        features: [
          'Unlimited food recognition',
          'Daily health summaries',
          'History tracking',
          'Advanced analytics',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        description: 'All Premium features plus priority support',
        priceMonthly: 19.90,
        priceYearly: 199.00, // 20% discount
        priceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
        priceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
        features: [
          'All Premium features',
          'Priority support',
          'Custom reports',
          'Advanced insights',
        ],
      },
    ];
  }

  /**
   * Create or get Stripe customer
   * Requirements: 7.4
   */
  async createOrGetCustomer(userId: string, email: string, name?: string): Promise<string> {
    // Check if customer already exists
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    return customer.id;
  }

  /**
   * Create subscription
   * Requirements: 7.4
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const { userId, email, priceId, tier } = params;

    // Create or get customer
    const customerId = await this.createOrGetCustomer(userId, email);

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card', 'paynow'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        tier,
      },
    });

    // Extract payment intent from expanded invoice
    const invoice: any = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (!paymentIntent || typeof paymentIntent === 'string') {
      throw new Error('Payment intent not found');
    }

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret!,
      customerId,
    };
  }

  /**
   * Cancel subscription
   * Requirements: 7.4
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Update subscription
   * Requirements: 7.4
   */
  async updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Handle Stripe webhook events with idempotency
   * Fixed: Issue #4 - Prevents duplicate event processing
   * Requirements: 7.5
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    const supabase = await createClient();

    // Check if event has already been processed (idempotency)
    const { data: existing } = await (supabase as any)
      .from('stripe_events')
      .select('event_id')
      .eq('event_id', event.id)
      .single();

    if (existing) {
      logger.info('Stripe event already processed (idempotent)', {
        eventId: event.id,
        eventType: event.type,
      });
      return;
    }

    // Extract user ID from metadata if available
    let userId: string | null = null;
    if ('metadata' in event.data.object && event.data.object.metadata) {
      userId = event.data.object.metadata.userId || null;
    }

    // Record the event to prevent duplicate processing
    const { error: recordError } = await (supabase as any)
      .from('stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        user_id: userId,
        payload: event.data as any,
      });

    if (recordError) {
      logger.error('Failed to record Stripe event', {
        eventId: event.id,
        error: recordError.message,
      });
      // If we can't record the event, don't process it to avoid duplicates
      throw new Error('Failed to record event for idempotency');
    }

    // Process the event
    try {
      await this.processEvent(event);
      
      logger.info('Stripe event processed successfully', {
        eventId: event.id,
        eventType: event.type,
      });
    } catch (error) {
      logger.error('Failed to process Stripe event', {
        eventId: event.id,
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process Stripe event based on type
   * Requirements: 7.5
   */
  private async processEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        logger.warn('Unhandled Stripe event type', { type: event.type });
    }
  }

  /**
   * Handle subscription created/updated
   * Requirements: 7.5
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.tier as 'premium' | 'pro';

    if (!userId || !tier) {
      logger.error('Missing userId or tier in subscription metadata', {
        subscriptionId: subscription.id,
        hasUserId: !!userId,
        hasTier: !!tier,
      });
      return;
    }

    // Update subscription in database
    await this.subscriptionManager.updateSubscriptionTier(
      userId,
      tier,
      subscription.id,
      subscription.customer as string
    );

    logger.info('Subscription updated', {
      userId,
      tier,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle subscription deleted/cancelled
   * Requirements: 7.5
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata.userId;

    if (!userId) {
      logger.error('Missing userId in subscription metadata', {
        subscriptionId: subscription.id,
      });
      return;
    }

    // Cancel subscription in database
    await this.subscriptionManager.cancelSubscription(userId);

    // Notify user via WhatsApp
    try {
      await whatsappClient.sendTextMessage(
        userId,
        '您的订阅已取消。感谢您使用 Vita AI！如需重新订阅，请输入"升级"。'
      );
    } catch (error) {
      logger.error('Failed to send cancellation notification', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    logger.info('Subscription cancelled', {
      userId,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle payment succeeded
   * Requirements: 7.5
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Payment succeeded', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    });

    // Get user ID from subscription metadata
    const subId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
    if (subId) {
      const subscription = await stripe.subscriptions.retrieve(
        typeof subId === 'string' ? subId : subId.id
      );
      const userId = subscription.metadata.userId;

      if (userId) {
        // Notify user via WhatsApp
        try {
          await whatsappClient.sendTextMessage(
            userId,
            `✅ 支付成功！感谢您订阅 Vita AI ${subscription.metadata.tier?.toUpperCase()}。`
          );
        } catch (error) {
          logger.error('Failed to send payment success notification', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  /**
   * Handle payment failed
   * Requirements: 7.5
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
    });

    // Get user ID from subscription metadata
    const subId = (invoice as any).subscription || (invoice as any).parent?.subscription_details?.subscription;
    if (subId) {
      const subscription = await stripe.subscriptions.retrieve(
        typeof subId === 'string' ? subId : subId.id
      );
      const userId = subscription.metadata.userId;

      if (userId) {
        // Notify user via WhatsApp
        try {
          await whatsappClient.sendTextMessage(
            userId,
            '⚠️ 支付失败。请更新您的支付方式以继续使用 Premium 功能。输入"账单"管理您的订阅。'
          );
        } catch (error) {
          logger.error('Failed to send payment failure notification', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  /**
   * Handle charge refunded
   * Requirements: 7.5
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    logger.info('Charge refunded', {
      chargeId: charge.id,
      customerId: charge.customer,
      amount: charge.amount_refunded,
    });

    // Additional logic can be added here (e.g., notify user)
  }

  /**
   * Verify webhook signature
   * Requirements: 7.5
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Get subscription details
   * Requirements: 7.4
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Get customer details
   * Requirements: 7.4
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  /**
   * Create billing portal session
   * Requirements: 7.4
   */
  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }
}
