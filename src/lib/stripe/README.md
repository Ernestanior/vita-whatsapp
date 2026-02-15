# Stripe Integration

Stripe integration for subscription management in Vita AI.

## Features

- Subscription creation and management
- Multiple pricing tiers (Premium, Pro)
- Monthly and yearly billing options
- PayNow support for Singapore users
- Webhook event handling
- Billing portal for self-service management

## Setup

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete account verification
3. Enable test mode for development

### 2. Create Products and Prices

Create the following products in Stripe Dashboard:

#### Premium Tier
- **Product Name**: Premium
- **Monthly Price**: SGD 9.90
- **Yearly Price**: SGD 99.00 (20% discount)
- **Features**: Unlimited recognition, Daily summaries, History tracking

#### Pro Tier
- **Product Name**: Pro
- **Monthly Price**: SGD 19.90
- **Yearly Price**: SGD 199.00 (20% discount)
- **Features**: All Premium + Priority support, Custom reports

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs (from Stripe Dashboard)
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

### 4. Set Up Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Enable PayNow (Singapore)

1. Go to Stripe Dashboard > Settings > Payment methods
2. Enable PayNow
3. Configure PayNow settings for Singapore

## Usage

### Get Available Products

```typescript
import { StripeManager } from '@/lib/stripe/stripe-manager';

const stripeManager = new StripeManager();
const products = stripeManager.getProducts();
```

### Create Subscription

```typescript
const result = await stripeManager.createSubscription({
  userId: 'user-123',
  email: 'user@example.com',
  priceId: 'price_premium_monthly',
  tier: 'premium',
});

// Use result.clientSecret for payment confirmation
```

### Handle Webhook Events

Webhook events are automatically handled by the `/api/stripe/webhook` endpoint.

### Cancel Subscription

```typescript
await stripeManager.cancelSubscription(subscriptionId);
```

### Create Billing Portal Session

```typescript
const url = await stripeManager.createBillingPortalSession(
  customerId,
  'https://your-app.com/settings'
);

// Redirect user to url for self-service management
```

## API Endpoints

### GET /api/stripe/products
Get available subscription products and pricing.

**Response:**
```json
{
  "products": [
    {
      "id": "premium",
      "name": "Premium",
      "priceMonthly": 9.90,
      "priceYearly": 99.00,
      "features": [...]
    }
  ]
}
```

### POST /api/stripe/create-subscription
Create a new subscription.

**Request:**
```json
{
  "userId": "user-123",
  "email": "user@example.com",
  "priceId": "price_premium_monthly",
  "tier": "premium"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_...",
  "clientSecret": "pi_..._secret_...",
  "customerId": "cus_..."
}
```

### POST /api/stripe/cancel-subscription
Cancel a subscription.

**Request:**
```json
{
  "subscriptionId": "sub_..."
}
```

### POST /api/stripe/billing-portal
Create a billing portal session.

**Request:**
```json
{
  "customerId": "cus_...",
  "returnUrl": "https://your-app.com/settings"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

### POST /api/stripe/webhook
Handle Stripe webhook events (called by Stripe).

## Testing

### Test Cards

Use these test cards in development:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

### Test PayNow

In test mode, use the test PayNow QR code provided by Stripe.

### Webhook Testing

Use Stripe CLI to test webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger customer.subscription.created
```

## Requirements

- Requirements: 7.3, 7.4, 7.5
- Stripe API version: 2026-01-28.clover
- Supported payment methods: Card, PayNow

## Security

- Webhook signatures are verified before processing
- Customer metadata includes userId for tracking
- Subscription metadata includes tier information
- All sensitive data is handled server-side

## Error Handling

All API endpoints return appropriate error messages:

```json
{
  "error": "Error message here"
}
```

Common errors:
- 400: Missing or invalid parameters
- 500: Stripe API error or internal server error
