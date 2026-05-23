# BILLING_TODO.md — Stripe Billing Setup Checklist

Billing routes (`/api/billing/create-checkout-session`, `/api/billing/customer-portal`) exist
but require Stripe products/prices and a webhook route before they are functional.

---

## Current state (May 2026)

- `/api/billing/create-checkout-session` ✅ exists, needs multi-plan price param
- `/api/billing/customer-portal` ✅ exists, functional once Stripe is configured
- `/api/billing/webhook` ❌ **does not exist — must create before billing goes live**
- `user_billing` table ✅ exists, RLS correct
- `lib/billing/stripe.ts` gracefully returns null if `STRIPE_SECRET_KEY` is absent (app runs without billing)

---

## 1. Create Stripe products and prices

```
Product: CheckRay Basic
  Price: $9.99/month  → NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC
  Price: $99/year     → NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY

Product: CheckRay Plus
  Price: $19.99/month → NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS
  Price: $199/year    → NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS_YEARLY
```

## 2. Update checkout session route

Current route uses a single `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`. Update to accept `priceId` body param:

```ts
const { priceId } = await req.json()
const allowed = [BASIC_ID, BASIC_YEARLY_ID, PLUS_ID, PLUS_YEARLY_ID]
if (!allowed.includes(priceId)) return 400
```

## 3. Create Stripe webhook route

File: `app/api/billing/webhook/route.ts`

Handle:
- `checkout.session.completed` → set `user_billing.status = 'active'`, map price → plan
- `customer.subscription.updated` → update plan/status/period
- `customer.subscription.deleted` → set `status = 'canceled'`
- `invoice.payment_failed` → set `status = 'past_due'`

Use `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
Write to `user_billing` using the service-role Supabase client.

## 4. Price → Plan mapping

```ts
const PRICE_TO_PLAN: Record<string, PlanId> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC!]:         'basic',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY!]:  'basic_yearly',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS!]:          'plus',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS_YEARLY!]:   'plus_yearly',
}
```

## 5. Enable Stripe Customer Portal

In Stripe Dashboard → Customer Portal:
- Allow plan switching (Basic ↔ Plus)
- Allow cancellation
- Enable invoice history
- Return URL: `https://checkray.app/dashboard`

## 6. Test mode checklist

- [ ] Create test products/prices in Stripe test mode
- [ ] Set test price IDs in `.env.local`
- [ ] Run `stripe listen --forward-to localhost:3000/api/billing/webhook`
- [ ] Complete test checkout → verify `user_billing.status = 'active'`
- [ ] Open customer portal → cancel → verify `user_billing.status = 'canceled'`
- [ ] Verify Basic plan enforces 10 checks/month after upgrade
- [ ] Verify Plus plan enforces 50 checks/month
- [ ] Verify Family plan allows unlimited fair-use checks

## 7. Remaining tasks

- [ ] Webhook route (`/api/billing/webhook`)
- [ ] Multi-plan checkout param support
- [ ] PricingCards connect to correct priceId per plan
- [ ] Cancellation survey / save offers (post-launch)

  - Basic yearly — $95.88/yr
  - Plus monthly — $19.99/mo
  - Plus yearly — $191.88/yr
- [ ] Add env vars:
  ```
  STRIPE_PRICE_BASIC_MONTHLY=price_xxx
  STRIPE_PRICE_BASIC_YEARLY=price_xxx
  STRIPE_PRICE_PLUS_MONTHLY=price_xxx
  STRIPE_PRICE_PLUS_YEARLY=price_xxx
  ```
- [ ] Update `app/api/billing/create-checkout-session/route.ts` to accept `plan` and `interval` params and look up correct price ID
- [ ] Wire `PricingCards.tsx` monthly/yearly toggle to pass `interval` in POST body

---

## Cancellation coupons (Stripe)

- [ ] Create Stripe coupons:
  - `COUPON_BASIC_SAVE_1` — 30% off forever (Basic → $6.99)
  - `COUPON_BASIC_SAVE_2` — 70% off for 3 months (Basic → $2.99)
  - `COUPON_PLUS_SAVE_1` — 35% off forever (Plus → $12.99)
  - `COUPON_PLUS_SAVE_2` — 55% off for 3 months (Plus → $8.99)
- [ ] Add env vars:
  ```
  STRIPE_COUPON_BASIC_SAVE_1=coupon_xxx
  STRIPE_COUPON_BASIC_SAVE_2=coupon_xxx
  STRIPE_COUPON_PLUS_SAVE_1=coupon_xxx
  STRIPE_COUPON_PLUS_SAVE_2=coupon_xxx
  ```

---

## Cancellation flow UI

- [ ] Build `/account/cancel` page:
  - Step 1: Survey ("Why are you cancelling?")
  - Step 2: Save offer 1 (based on plan)
  - Step 3: Save offer 2 (if user declines offer 1)
  - Step 4: Final confirmation + confirm cancel
- [ ] On save offer accepted:
  - Call `POST /api/billing/apply-coupon` → apply Stripe coupon to subscription
  - Update `user_billing.cancel_offer_stage`
  - Redirect to `/dashboard?billing=saved`
- [ ] On cancellation confirmed:
  - Call `POST /api/billing/cancel-subscription` → Stripe cancel at period end
  - Insert cancellation survey response into `user_billing`
  - Redirect to `/dashboard?billing=cancelled`

---

## Cancellation API routes

- [ ] `POST /api/billing/cancel-subscription`
  - Auth required
  - Stripe: `stripe.subscriptions.update(id, { cancel_at_period_end: true })`
  - DB: set `user_billing.status = 'canceling'` (or leave — webhook will set `canceled`)
- [ ] `POST /api/billing/apply-coupon`
  - Auth required, accepts `{ couponId }`
  - Stripe: `stripe.subscriptions.update(id, { coupon: couponId })`
  - DB: update `user_billing.cancel_offer_stage`

---

## Webhook improvements

- [ ] Handle `customer.subscription.updated` to sync `plan` when user changes plan (upgrade/downgrade)
- [ ] Handle `invoice.payment_failed` → set `user_billing.status = 'past_due'`
- [ ] Handle `customer.subscription.deleted` → set `user_billing.status = 'canceled'`, clear `stripe_subscription_id`
- [ ] Map Stripe price ID back to `PlanId` in webhook handler

---

## Access control improvements

- [ ] Enforce `past_due` status as blocked in `checkAccess()`
- [ ] Grace period: allow 3-day grace on `past_due` before hard block
- [ ] Expose `daysLeft` in `AccessResult` for trial countdown UI

---

## Dashboard / account page

- [ ] Add "Cancel subscription" link to `BillingStatusCard`
- [ ] Show current plan name and renewal date
- [ ] Show usage meter: X / 10 checks this month (Basic), X / 50 checks (Plus)

---

## Emails (future)

- [ ] Trial ending in 2 days reminder
- [ ] Trial ended — upgrade prompt
- [ ] Payment failed notice
- [ ] Cancellation confirmation with survey link
