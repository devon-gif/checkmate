# STRIPE_BILLING_SETUP.md — wiring CheckRay to Stripe

This document covers everything needed to take CheckRay from "billing not
configured" to a working subscription flow on `checkray.app`. The code
paths it describes already exist; this is the operational checklist.

Related docs: `docs/USAGE_LIMITS.md` (plan limits + access gate),
`docs/BILLING_PRE_STRIPE_TODO.md` (what was stubbed before Stripe).

## Required environment variables

All Stripe secrets are **server-only**. Only the publishable key is safe
to expose client-side. None of these are read at module-load time — the
code reads `process.env` at call time so missing vars degrade gracefully
to a 503 "billing not configured" response.

| Variable | Scope | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Sensitive** (server) | API key for Stripe SDK. `sk_live_...` in prod, `sk_test_...` in dev. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Publishable key. Not currently used by the server routes but exposed for any future client-side Elements work. |
| `STRIPE_WEBHOOK_SECRET` | **Sensitive** (server) | Signing secret for `/api/stripe/webhook`. Get this from the webhook destination's "Signing secret" in the Stripe dashboard. Different for live vs. test mode. |
| `STRIPE_BASIC_MONTHLY_PRICE_ID` | Server | Stripe price ID for Basic monthly. |
| `STRIPE_BASIC_YEARLY_PRICE_ID` | Server | Basic yearly. |
| `STRIPE_PLUS_MONTHLY_PRICE_ID` | Server | Plus monthly. |
| `STRIPE_PLUS_YEARLY_PRICE_ID` | Server | Plus yearly. |
| `STRIPE_FAMILY_MONTHLY_PRICE_ID` | Server | Family monthly. |
| `STRIPE_FAMILY_YEARLY_PRICE_ID` | Server | Family yearly. |
| `STRIPE_RETENTION_50_OFF_3_MONTHS_COUPON_ID` | Server | Coupon used by the Customer Portal retention flow. Not directly read by app code; configured inside Stripe Portal settings. |
| `STRIPE_RETENTION_PROMO_CODE_ID` | Server | Promo code wrapper for the same coupon. Same note as above. |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical URL — `https://checkray.app` in prod, `http://localhost:3000` in dev. Used for Stripe redirect URLs (`success_url`, `cancel_url`, portal `return_url`). |

## 7-day free trial for paid plans

All Basic, Plus, and Family Checkout sessions are created with
`subscription_data.trial_period_days = 7`. Concretely:

- **Card is required at Checkout** — Stripe collects the payment method
  even though no charge is made on day zero.
  (`payment_method_collection: 'always'` makes this explicit.)
- **No charge is taken on day zero.** The user gets immediate paid-plan
  access for 7 days.
- **Stripe auto-charges on day 7** unless the user cancels through the
  Customer Portal before then.
- **`customer.subscription.created`** fires with `status = 'trialing'`
  and `trial_end` set. The webhook stores this status on `user_billing`
  along with `trial_ends_at = ISO(trial_end)`.
- **`customer.subscription.updated`** fires when the trial converts
  to `active` (or `past_due` if the charge fails). The webhook propagates
  the status change so `BillingStatusCard` flips from "Plus trial" to
  "Plus plan" without intervention.
- **The Free plan is never a Stripe subscription.** It exists only in
  `user_billing` (`plan='free', status='inactive'`) and gets 1 check /
  month from the in-app gate. Cancelling a paid subscription via the
  portal downgrades the user to Free via the
  `customer.subscription.deleted` handler.

### What "trialing grants paid access" means in code

`lib/billing/access.ts` treats `user_billing.status === 'trialing'` as
the equivalent of `'active'` for the resolved plan: a Plus trial gets
50 / mo, a Basic trial gets 10 / mo, a Family trial is unlimited
fair-use. This is what makes the dashboard render "Plus trial / 0 / 50
checks this month" and what lets the user actually run those checks.

Legacy in-app `plan === 'trial'` rows (from the pre-Stripe era) still
get unlimited usage during their window; the access gate distinguishes
between the two by reading `row.plan`.

### Cancellation through the Customer Portal

When a user cancels inside the portal, Stripe fires:

- `customer.subscription.updated` with `cancel_at_period_end = true` —
  the webhook stores this flag; the subscription remains active /
  trialing until the period ends.
- At period end, `customer.subscription.deleted` fires. The webhook sets
  `user_billing.status = 'inactive', plan = 'free'` so the user
  downgrades cleanly to Free (1 check / month) without losing any saved
  cases or reports.

If the user's trial card charge fails on day 7, Stripe will fire
`invoice.payment_failed` and `customer.subscription.updated` with
`status = 'past_due'`. The webhook stores `past_due`; the dashboard
surfaces this state through the standard expired / over-limit copy.

## Stripe product / price mapping

The combined Checkout key → canonical `user_billing.plan` value the
webhook writes after a successful subscription:

| Checkout key | Price ID env var | `user_billing.plan` | Limit |
|---|---|---|---|
| `basic_monthly` | `STRIPE_BASIC_MONTHLY_PRICE_ID` | `basic` | 10 / mo |
| `basic_yearly` | `STRIPE_BASIC_YEARLY_PRICE_ID` | `basic_yearly` | 10 / mo |
| `plus_monthly` | `STRIPE_PLUS_MONTHLY_PRICE_ID` | `plus` | 50 / mo |
| `plus_yearly` | `STRIPE_PLUS_YEARLY_PRICE_ID` | `plus_yearly` | 50 / mo |
| `family_monthly` | `STRIPE_FAMILY_MONTHLY_PRICE_ID` | `family` | Unlimited fair-use |
| `family_yearly` | `STRIPE_FAMILY_YEARLY_PRICE_ID` | `family_yearly` | Unlimited fair-use |

Reverse lookup: `planIdForPriceId()` in `lib/billing/stripe.ts` matches a
Stripe price ID back to the canonical plan. Two metadata fallbacks exist
in the webhook in case the reverse lookup misses:

1. `subscription.metadata.checkout_plan_key` (legacy combined key).
2. `subscription.metadata.plan` + `subscription.metadata.interval` (new
   explicit pair).

## Webhook

**URL:** `https://checkray.app/api/stripe/webhook`

In the Stripe dashboard create a webhook endpoint pointing here and enable
the events below. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

| Event | Handler behaviour |
|---|---|
| `checkout.session.completed` | Save `provider_customer_id` + `provider_subscription_id` on `subscriptions`. |
| `customer.subscription.created` | Insert/update `subscriptions` and `user_billing` with status, plan, period dates. |
| `customer.subscription.updated` | Same as `.created` — drives upgrades, downgrades, and renewal. |
| `customer.subscription.deleted` | Set `subscriptions.status='canceled'` and `user_billing.{status:'inactive', plan:'free'}`. **Does not delete saved cases or reports.** |
| `invoice.payment_succeeded` | Promote to `active` and refresh `current_period_end`. |
| `invoice.payment_failed` | Mark `past_due`. Plan is left untouched. |

Signature verification uses `stripe.webhooks.constructEvent`. If the
signature header is missing or wrong the route returns 400 and ignores
the payload. If `STRIPE_WEBHOOK_SECRET` is unset the route returns 503;
production deploys MUST set this.

### Idempotency

The current implementation does **not** dedupe by `event.id`. Stripe is
at-least-once; re-delivery is possible. Handlers are written to be
idempotent (the writes are upserts / `update where user_id`) so a replay
is safe today. A `stripe_event_id` table is tracked in
`docs/BILLING_PRE_STRIPE_TODO.md` as a follow-up before scaling.

## Local testing

1. `stripe login` (Stripe CLI).
2. In one terminal: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Copy the `whsec_…` shown by the CLI into `.env.local` as
   `STRIPE_WEBHOOK_SECRET` and restart `pnpm dev`.
4. In another terminal trigger events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   stripe trigger customer.subscription.updated
   stripe trigger customer.subscription.deleted
   stripe trigger invoice.payment_succeeded
   stripe trigger invoice.payment_failed
   ```
5. Inspect `user_billing` and `subscriptions` rows in Supabase to confirm
   plan / status updates.

For full UI flow, set test-mode keys + test price IDs in `.env.local` and
walk through the pricing page → checkout → dashboard return path. Use the
Stripe test card `4242 4242 4242 4242`.

## Live mode warning

> **When you flip to live mode you are accepting real charges.**

- `STRIPE_SECRET_KEY` must be `sk_live_…` not `sk_test_…`.
- `STRIPE_WEBHOOK_SECRET` must be the live-mode signing secret (different
  from test mode).
- All `STRIPE_*_PRICE_ID` values must be **live-mode** price IDs.
- `NEXT_PUBLIC_APP_URL` must be `https://checkray.app`.
- Do not test live mode with a real card you wouldn't want billed. Use
  Stripe's [test clocks](https://docs.stripe.com/billing/testing/test-clocks)
  in test mode for end-to-end subscription lifecycle drills.

## How the dashboard / pricing flow works

```
Pricing card "Start 7-day trial"
   └─► POST /api/billing/create-checkout-session  { plan, interval }
         ├─ 401 → /sign-up?next=/pricing
         ├─ 503 → friendly alert (price not configured)
         └─ 200 → Stripe Checkout (mode: subscription)
                  └─ success_url → /dashboard?checkout=success
                  └─ cancel_url  → /pricing?checkout=cancelled

Dashboard "Upgrade now" / BillingStatusCard "Upgrade"
   └─► navigates to /pricing  (user picks plan + interval first)

Dashboard "Manage billing" (status === 'active')
   └─► POST /api/billing/customer-portal
         └─ 200 → Stripe Customer Portal
                  └─ return_url → /dashboard
```

The previous "Upgrade now" → direct POST flow has been removed because it
silently defaulted to `basic_monthly`, which was a UX trap. All upgrade
paths now go through the pricing page where the plan + interval are an
explicit choice.

## Customer Portal behaviour

The portal session is created from `POST /api/billing/customer-portal`
with `return_url = ${NEXT_PUBLIC_APP_URL}/dashboard`. From the portal a
user can:

- Update their payment method.
- Cancel their subscription (cancel-at-period-end by default).
- Resume / change plan if portal "Plan switching" is enabled in Stripe.
- See past invoices.

If the user has no `provider_customer_id` on `subscriptions` yet (i.e.
they have never started checkout), the route returns 404
`no_customer`. `BillingStatusCard` only shows the "Manage billing" button
when `status === 'active'`, so this 404 should be unreachable in normal
use.

## Cancellation / retention coupon

A retention coupon (`STRIPE_RETENTION_50_OFF_3_MONTHS_COUPON_ID`) and a
promo-code wrapper (`STRIPE_RETENTION_PROMO_CODE_ID`) have been created
in Stripe. CheckRay does **not** build a custom cancellation-save flow
right now — the simplest path is to enable the retention offer in the
Stripe Customer Portal settings:

1. Stripe dashboard → Settings → Billing → Customer portal.
2. Cancellation → Reasons → enable "Show cancellation reasons" if you
   want feedback.
3. Cancellation → Retention → enable coupon offers, select the retention
   coupon.

A custom save-offer page can be built later — `lib/billing/plans.ts`
already has `CANCELLATION_OFFERS` constants ready for that.

## Pre-launch checklist

- [ ] All `STRIPE_*_PRICE_ID` values set in Vercel (Production + Preview).
- [ ] `STRIPE_SECRET_KEY` set live, scoped Production only (Preview can
      keep test mode).
- [ ] `STRIPE_WEBHOOK_SECRET` set for the live webhook destination.
- [ ] `NEXT_PUBLIC_APP_URL=https://checkray.app` set Production.
- [ ] Webhook endpoint created in Stripe dashboard pointing at
      `https://checkray.app/api/stripe/webhook` with the 6 events listed
      above.
- [ ] Re-deploy with build cache disabled after env changes (Next.js
      inlines `NEXT_PUBLIC_*` at build time — see `VERCEL_ENV_SETUP.md`).
- [ ] Manual test: pricing → Basic monthly → test card → land on
      `/dashboard?checkout=success` → `BillingStatusCard` shows
      "Basic plan / 0 / 10 checks this month".
- [ ] Manual test: dashboard → "Manage billing" → cancel subscription →
      webhook fires → `BillingStatusCard` shows "Free plan".
