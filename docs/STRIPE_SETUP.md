# Stripe Setup Guide

Complete guide for setting up Stripe integration in Vita AI.

## Prerequisites

- Stripe account (sign up at [stripe.com](https://stripe.com))
- Verified business information
- Bank account for payouts

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete business verification
3. Add bank account for payouts
4. Enable test mode for development

## Step 2: Create Products

### Create Premium Product

1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Fill in details:
   - **Name**: Premium
   - **Description**: Unlimited food recognition and daily health summaries
   - **Pricing model**: Standard pricing
   - **Price**: SGD 9.90
   - **Billing period**: Monthly
   - **Currency**: SGD
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`)
6. Add to `.env` as `STRIPE_PREMIUM_MONTHLY_PRICE_ID`

7. Add another price for yearly billing:
   - Click **Add another price**
   - **Price**: SGD 99.00
   - **Billing period**: Yearly
   - Copy **Price ID** to `STRIPE_PREMIUM_YEARLY_PRICE_ID`

### Create Pro Product

Repeat the same steps for Pro tier:
- **Name**: Pro
- **Description**: All Premium features plus priority support
- **Monthly Price**: SGD 19.90
- **Yearly Price**: SGD 199.00
- Save Price IDs to `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_YEARLY_PRICE_ID`

## Step 3: Get API Keys

1. Go to **Developers** > **API keys**
2. Copy **Publishable key** to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Click **Reveal test key** for **Secret key**
4. Copy to `STRIPE_SECRET_KEY`

⚠️ **Important**: Never commit secret keys to version control!

## Step 4: Set Up Webhook

### Development (Local Testing)

1. Install Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe:
   ```bash
   stripe login
   ```

3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

### Production

1. Go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Enter endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy **Signing secret** to `STRIPE_WEBHOOK_SECRET`

## Step 5: Enable PayNow (Singapore)

1. Go to **Settings** > **Payment methods**
2. Find **PayNow** in the list
3. Click **Enable**
4. Configure PayNow settings:
   - **Country**: Singapore
   - **Currency**: SGD
5. Save changes

## Step 6: Configure Billing Portal

1. Go to **Settings** > **Billing**
2. Click **Customer portal**
3. Enable customer portal
4. Configure settings:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Set cancellation behavior (immediate or end of period)
5. Save settings

## Step 7: Environment Variables

Create a `.env.local` file with all Stripe variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
```

## Step 8: Test Integration

### Test Subscription Creation

```bash
curl -X POST http://localhost:3000/api/stripe/create-subscription \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "email": "test@example.com",
    "priceId": "price_...",
    "tier": "premium"
  }'
```

### Test Webhook

```bash
stripe trigger customer.subscription.created
```

### Test Cards

Use these test cards:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184
- **Insufficient funds**: 4000 0000 0000 9995

## Step 9: Go Live

### Switch to Production

1. Toggle **View test data** off in Stripe Dashboard
2. Create production products and prices
3. Update environment variables with production keys
4. Update webhook endpoint to production URL
5. Test thoroughly before launching

### Production Checklist

- [ ] Products created in production mode
- [ ] Production API keys configured
- [ ] Production webhook endpoint added
- [ ] PayNow enabled for production
- [ ] Billing portal configured
- [ ] Test subscription flow end-to-end
- [ ] Test webhook events
- [ ] Test payment methods (card, PayNow)
- [ ] Test cancellation flow
- [ ] Monitor first transactions

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook endpoint is accessible
2. Verify webhook secret is correct
3. Check Stripe Dashboard > Webhooks > Logs
4. Ensure events are selected in webhook configuration

### Payment Fails

1. Check test card numbers are correct
2. Verify PayNow is enabled
3. Check Stripe Dashboard > Payments for error details
4. Review webhook logs for payment_failed events

### Subscription Not Created

1. Check API keys are correct
2. Verify price IDs exist
3. Check customer email is valid
4. Review server logs for errors

## Security Best Practices

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` server-side only
2. **Verify webhook signatures**: Always verify webhook signatures before processing
3. **Use HTTPS**: Always use HTTPS in production
4. **Validate input**: Validate all user input before creating subscriptions
5. **Monitor logs**: Regularly check Stripe Dashboard for suspicious activity
6. **Rotate keys**: Rotate API keys periodically
7. **Limit permissions**: Use restricted API keys when possible

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Stripe Status: https://status.stripe.com

## Requirements

- Requirements: 7.3, 7.4, 7.5
- Stripe API Version: 2026-01-28.clover
- Supported Currencies: SGD
- Supported Payment Methods: Card, PayNow
