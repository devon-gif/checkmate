# Billing TODO

Deferred billing tasks not yet implemented. These are non-blocking for MVP launch but required for full billing functionality.

---

## Stripe configuration

- [ ] Create Stripe products and price objects for all 4 billable plans:
  - Basic monthly — $9.99/mo
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
- [ ] Show usage meter: X / 25 checks this month (Basic)

---

## Emails (future)

- [ ] Trial ending in 2 days reminder
- [ ] Trial ended — upgrade prompt
- [ ] Payment failed notice
- [ ] Cancellation confirmation with survey link
