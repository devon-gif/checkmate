# CheckRay — Billing Setup

Stripe Checkout (subscriptions only). All payments use the **hosted Stripe
Checkout page** — no card details ever touch our servers or our client
bundle.

## Plans

| Plan | Monthly | Yearly | Checks/month |
|---|---|---|---|
| Free | $0 | — | 1 |
| Basic | $9.99 | $95.88 ($7.99/mo equivalent) | 25 |
| Plus | $19.99 | $191.88 ($15.99/mo equivalent) | Unlimited (fair-use) |

Plan IDs (used internally on `user_billing.plan` and `subscriptions.plan`):
`free`, `trial`, `basic`, `basic_yearly`, `plus`, `plus_yearly`.

Source of truth: `@/lib/billing/plans.ts`.

## Required environment variables

All must be set in **Vercel → Project → Settings → Environment Variables**
for Production (and Preview/Development as needed). After changing any
variable, **redeploy with build cache disabled** (see
`docs/VERCEL_ENV_SETUP.md`).

| Variable | Scope | Required? | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | **Sensitive** | Yes (when going live) | `sk_test_*` for test mode, `sk_live_*` for prod. |
| `STRIPE_WEBHOOK_SECRET` | **Sensitive** | Yes (when going live) | Per-endpoint signing secret from the Stripe dashboard. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | No (today) | Reserved for embedded Elements / Payment Element if we adopt them. **Not required** for hosted Checkout. |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | Server | Per-plan | `price_*` from Stripe → Products → Basic monthly. |
| `STRIPE_BASIC_YEARLY_PRICE_ID` | Server | Per-plan | Basic yearly price. |
| `STRIPE_PLUS_MONTHLY_PRICE_ID` | Server | Per-plan | Plus monthly price. |
| `STRIPE_PLUS_YEARLY_PRICE_ID` | Server | Per-plan | Plus yearly price. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | Public | Legacy | Falls back to `STRIPE_BASIC_MONTHLY_PRICE_ID` if the new var is unset, so old deployments keep working. |
| `NEXT_PUBLIC_APP_URL` | Public | Yes | Canonical URL, no trailing slash. Used as the base for Checkout success/cancel redirects. |

### Fail-soft behavior

If **any** of the four `STRIPE_*_PRICE_ID` vars (or the legacy
`NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`) is set, `hasAnyPlanPriceId()` returns
true and the pricing page renders Checkout buttons.

If **none** are set:

- `/pricing` still renders (free tier, plain "Start 7-day trial" buttons
  that link to `/sign-up` instead of Stripe).
- Dashboard billing card shows "Billing not configured yet".
- `POST /api/billing/create-checkout-session` returns 503 with
  `{ error: 'billing_not_configured', message: 'Billing is not configured yet.' }`.

If a specific plan's price ID is missing (e.g. `plus_yearly` not yet
created in Stripe), checkout for that plan returns 503 with
`{ error: 'price_not_configured' }` and the client surfaces the friendly
message in a browser alert. Other plans continue to work.

## Stripe dashboard setup (test mode first)

1. Stripe Dashboard → **Test mode** toggle (top-right) → ON.
2. **Products** → New product → "CheckRay Basic" → add two recurring
   prices: monthly $9.99 USD and yearly $95.88 USD. Copy each price ID.
3. Repeat for "CheckRay Plus" with $19.99 / $191.88.
4. **Developers → API keys** → copy the test secret key (`sk_test_*`)
   into `STRIPE_SECRET_KEY` on Vercel.
5. **Developers → Webhooks** → Add endpoint → URL
   `https://<your-domain>/api/stripe/webhook`. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

   Copy the **signing secret** (`whsec_*`) into `STRIPE_WEBHOOK_SECRET`.
6. Redeploy with build cache disabled.

For local end-to-end testing, see `docs/STRIPE_WEBHOOK_TESTING.md`.

## Going live (production)

1. Repeat all of the above in **live mode** (top-right toggle OFF).
2. Replace every test value in Vercel with the live equivalent.
3. Verify: do one real $9.99 checkout in incognito, confirm the user's
   `user_billing.status` flips to `active` and the dashboard shows
   "Manage billing".
4. Refund that test purchase via the Stripe dashboard.

## Cancellation flow

The cancel-and-save flow lives in `lib/billing/plans.ts` →
`CANCELLATION_OFFERS`. We do not destructively cancel from the app —
users are redirected to the Stripe Customer Portal via
`POST /api/billing/customer-portal` where Stripe handles the actual
cancellation. Save offers (coupons) are configured by setting the
`STRIPE_COUPON_*` env vars listed in `plans.ts`.

> **Important.** We never call destructive billing actions (cancel /
> refund) from server code without an explicit user-driven action and a
> confirmation dialog. All such actions go through the Stripe Customer
> Portal.

## What the webhook updates

| Event | Effect |
|---|---|
| `checkout.session.completed` | Records `provider_customer_id` + `provider_subscription_id` on `subscriptions`. |
| `customer.subscription.created`/`.updated` | Sets status, period_start/end, cancel_at_period_end, plan (derived from price ID); upserts the same fields onto `user_billing`. |
| `customer.subscription.deleted` | Sets `status = 'canceled'` on both tables. |
| `invoice.payment_succeeded` | Promotes status to `active` and refreshes `current_period_end` on both tables. |
| `invoice.payment_failed` | Sets `status = 'past_due'` on both tables. |

The dashboard reads `user_billing` first, then falls back to
`subscriptions`. Plan derivation prefers the price ID lookup
(`planIdForPriceId`) and falls back to the `checkout_plan_key` metadata
written at session creation.
