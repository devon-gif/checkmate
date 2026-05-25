# BILLING_PRE_STRIPE_TODO.md — What ships, what's pending, what Stripe needs

This is a snapshot of the access/billing layer **right before** real Stripe
checkout is wired up. The goal is to make sure the in-app gating and the
dashboard UX are correct and stable, so adding Stripe later is purely an
upgrade-path change.

## What ships today (no Stripe required)

- Plan IDs and monthly limits in `lib/billing/plans.ts` match the product
  spec: Free 1 / mo, Basic 10 / mo, Plus 50 / mo, Family unlimited.
- `lib/billing/access.ts` enforces the limits **before** any OpenAI call.
- Free plan is a real, addressable state — when a trial ends the user is
  downgraded to Free (1 check / month) instead of being fully blocked.
- Anonymous users get exactly 1 lifetime check (cookie-tracked) and are
  prompted to create an account on attempt 2.
- `BillingStatusCard` renders accurate per-plan copy — Plus shows
  `X / 50`, Family shows "Unlimited fair-use", trial shows remaining days,
  Free shows "1 check per month", expired shows the soft "now on Free"
  message instead of "blocked".
- Dashboard top-stats card shows "Checks this month" with the real plan
  limit (or "Unlimited fair-use" when applicable). The stale
  `FREE_TIER_DAILY_LIMIT = 25` daily counter has been removed.
- `/api/analyze-case` returns 402 with a stable shape when the user is
  over limit; the client renders an inline gate panel.
- Service-role key is server-only — `lib/billing/access.ts` and
  `lib/notifications/preferences.ts` both declare `import 'server-only'`.

## What is still stubbed / placeholder

- `BillingStatusCard` action button uses `stripeConfigured` as a feature
  flag. When `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PRICE_ID_*` are
  not set, the upgrade CTA renders as a disabled note: "Billing not
  configured yet".
- `/api/billing/create-checkout-session` and `/api/billing/customer-portal`
  exist as route handlers — confirm both correctly return 503 / a no-op
  when Stripe env is missing before flipping the flag.
- Cancellation save offers (`CANCELLATION_OFFERS` in `plans.ts`) reference
  `stripeCouponEnvKey` values that are not yet set in Vercel. Wire these
  up at the same time as primary checkout, not before.

## Stripe fields required when checkout goes live

| Env var | Scope | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Sensitive (server) | API access — never expose client-side. |
| `STRIPE_WEBHOOK_SECRET` | Sensitive (server) | Verifies `/api/stripe/webhook` signatures. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC` | Public | Price ID for the Basic plan checkout. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY` | Public | Yearly variant. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS` | Public | Price ID for Plus. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS_YEARLY` | Public | Yearly variant. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY` | Public | Price ID for Family. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_YEARLY` | Public | Yearly variant. |
| `STRIPE_COUPON_BASIC_SAVE_1` etc. | Server | Cancellation save coupons. Optional but referenced in `CANCELLATION_OFFERS`. |
| `NEXT_PUBLIC_APP_URL` | Public | Used in Stripe redirect URLs (`success_url`, `cancel_url`). |

## Webhook → user_billing upgrade contract

When Stripe is wired up, the webhook handler must update `user_billing` to:

- `plan` ∈ {`'basic'`, `'basic_yearly'`, `'plus'`, `'plus_yearly'`,
  `'family'`, `'family_yearly'`} matching the purchased price ID.
- `status` = `'active'` on `checkout.session.completed` and on
  `customer.subscription.updated` with active status.
- `status` = `'past_due'` or `'inactive'` on cancellation / failed
  payment. `checkAccess()` treats both as "downgrade to Free" — the user
  is not fully blocked.
- `trial_ends_at` is left alone after Stripe takes over; the access gate
  only consults it while `status === 'trialing'`.

## Open items / known gaps

1. **`/cases/new` over-limit copy:** there is now a `📅` icon for the
   Free-monthly-used state. If product wants different artwork or a
   "Buy more checks" one-time option, add the SKU in `plans.ts` first.
2. **Reset on the 1st of the month is UTC** — confirm acceptable for
   international users or move to user's timezone before launch.
3. **Webhook idempotency:** when implementing, dedupe by
   `stripe_event_id` against a table; this code doesn't exist yet.
4. **Email receipts / dunning emails** are out of scope for this MVP —
   tracked in `NOTIFICATIONS_TODO.md`.
5. **Cancellation save flow** (`CANCELLATION_OFFERS`) renders in the
   support UI but the coupon-apply route is unimplemented.

## Quick verification before merging Stripe

When you add Stripe, re-run:

```bash
pnpm run type-check
pnpm run build
gitleaks detect --source .
```

Then manually re-run the test matrix in `docs/USAGE_LIMITS.md` plus:

- Upgrade path: Free → Basic via checkout → `BillingStatusCard` should
  flip to "Basic plan / 0 / 10" without a full reload.
- Webhook race: subscribe and immediately reload `/dashboard` — card
  must not flicker to "Trial ended" before the webhook lands.
- Cancellation: cancel → `BillingStatusCard` should show "Free plan",
  not "Trial ended" or "Blocked".

## Related docs

- `docs/USAGE_LIMITS.md` — plan limits and the access gate.
- `docs/SECURITY_BOUNDARIES.md` — service-role rules.
- `docs/SCHEMA_CONTRACTS.md` — analyzer response shape governance.
- `BILLING_TESTS.md` (root) — existing Stripe test matrix to revive.
