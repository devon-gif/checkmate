# CheckRay — Stripe Webhook Testing

End-to-end testing for `POST /api/stripe/webhook` using the Stripe CLI.

## Prerequisites

1. Stripe CLI installed:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```
2. Logged in:
   ```bash
   stripe login
   ```
3. Local Next.js server running on port 3000 (or whatever port — adjust
   commands below). See `docs/VERCEL_ENV_SETUP.md` for required env vars.
4. `.env.local` contains:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_BASIC_MONTHLY_PRICE_ID=price_...` (and/or other plan IDs)
   - Supabase publics + service role key

## 1. Forward live test events to localhost

In one terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI prints a temporary signing secret like:

```
Ready! Your webhook signing secret is whsec_abcd1234...
```

Copy that value into your `.env.local` as `STRIPE_WEBHOOK_SECRET`, then
restart `next dev` so the new value is picked up.

> **Why a temporary secret?** The CLI generates a short-lived signing
> secret distinct from your dashboard webhook's secret. This is how
> Stripe lets you test signature verification without re-using the
> production secret.

## 2. Run a real test checkout

In a second terminal, ask your local server for a checkout URL:

```bash
curl -X POST http://localhost:3000/api/billing/create-checkout-session \
  -H 'Content-Type: application/json' \
  -d '{"plan":"basic_monthly"}' \
  -b "<paste-your-supabase-auth-cookie-here>"
```

Open the returned `url` in a browser and complete checkout with one of
the [Stripe test cards](https://stripe.com/docs/testing):

- `4242 4242 4242 4242` — succeeds
- `4000 0000 0000 9995` — declines after authentication
- Any future expiry, any 3-digit CVC, any ZIP.

The CLI terminal should print a stream of events:

```
checkout.session.completed       [evt_*]  → 200 OK
customer.subscription.created    [evt_*]  → 200 OK
invoice.payment_succeeded        [evt_*]  → 200 OK
```

If any returns non-200, inspect your dev server log.

## 3. Trigger individual events without checkout

Useful for testing the failure paths without burning through Stripe test
mode invoices.

```bash
# Create a fake successful invoice payment
stripe trigger invoice.payment_succeeded

# Create a fake failed invoice payment
stripe trigger invoice.payment_failed

# Create a subscription cancellation
stripe trigger customer.subscription.deleted
```

These events synthesise a complete object graph (customer, subscription,
invoice) on the fly. They are NOT linked to a real CheckRay user, so the
webhook will accept them but skip the DB write (`user_id` lookup misses).
That's the correct behaviour — confirm there's no 500.

## 4. Verify DB updates after a real checkout

After completing a real test checkout from step 2:

```sql
-- In Supabase SQL editor
select user_id, plan, status, current_period_end, cancel_at_period_end
from user_billing
where user_id = '<your-test-user-id>';

select user_id, plan, status, provider_customer_id, provider_subscription_id
from subscriptions
where user_id = '<your-test-user-id>';
```

Expected: both rows show `status = 'active'`, `plan = 'basic'` (or
whichever plan you bought), and a future `current_period_end`.

## 5. Test the customer portal

```bash
curl -X POST http://localhost:3000/api/billing/customer-portal \
  -b "<your-supabase-auth-cookie>"
```

Returns a `url` to a Stripe-hosted billing portal where the test user
can cancel, update payment method, or change plan. After cancellation,
verify `user_billing.status = 'canceled'` after the
`customer.subscription.deleted` event arrives.

## Common pitfalls

- **`Invalid signature.` 400 from webhook.** Your `.env.local` has a
  stale `STRIPE_WEBHOOK_SECRET`. Re-copy the value from `stripe listen`
  and restart Next.
- **Webhook returns 503 `billing_not_configured`.** `STRIPE_SECRET_KEY`
  is unset.
- **Webhook returns 200 but DB does not update.** The subscription's
  `metadata.supabase_user_id` is missing because checkout was created
  outside our app. Always go through `/api/billing/create-checkout-session`.
- **`customer_period_end` not refreshing on renewal.** Check the
  `invoice.payment_succeeded` handler is firing — Stripe Test mode
  generates a renewal invoice immediately when you call
  `stripe trigger invoice.payment_succeeded`.

## Production verification checklist

- [ ] Webhook endpoint registered in Stripe Dashboard (live mode) for all
      6 events listed in `BILLING_SETUP.md`.
- [ ] Endpoint returns 200 for the dashboard's "Send test webhook" probe.
- [ ] One real $9.99 checkout completed end-to-end in incognito.
- [ ] Refund that test purchase via Stripe dashboard.
- [ ] Confirm `user_billing.status` flips to `canceled` after refund.
