# Billing Tests — CheckRay MVP

Manual test checklist for access control, trial gating, and Stripe billing.

---

## 1. Anonymous first check works

- Open a fresh browser (private/incognito, no cookies)
- Go to `/try`
- Paste any suspicious text and submit
- **Expected:** Analysis result is returned. No sign-in prompt.
- **Expected:** `cm_anon_id` cookie is set on the response.

---

## 2. Anonymous second check is blocked

- Use the same browser session from Test 1 (keep the `cm_anon_id` cookie)
- Paste a different text and submit again
- **Expected:** API returns `HTTP 402` with:
  ```json
  {
    "error": "usage_limit_reached",
    "message": "You've used your free check. Create a free account to start your 7-day trial.",
    "access": { "canAnalyze": false, "accessStatus": "blocked", ... }
  }
  ```
- **Expected:** UI shows a prompt to create an account.

---

## 3. New user starts 7-day trial

- Sign up with a fresh email address
- **Expected:** A row is inserted into `subscriptions` with:
  - `plan = 'trial'`
  - `status = 'trialing'`
  - `trial_starts_at = now()`
  - `trial_ends_at = now() + 7 days`
- This row is created lazily on the **first `/api/analyze-case` call** by `checkAccess()`.

---

## 4. Trial user can analyze

- Sign in as a user whose `trial_ends_at` is in the future
- Paste text and submit
- **Expected:** Analysis completes, result is returned, case is saved to DB.
- **Expected:** Response includes `"access": { "accessStatus": "trialing", "canAnalyze": true }`.

---

## 5. Expired trial user is blocked

- Find a user (or manually update DB) with `status = 'trialing'` and `trial_ends_at` in the past
- Attempt to submit an analysis
- **Expected:** API returns `HTTP 402` with:
  ```json
  {
    "error": "usage_limit_reached",
    "message": "Your free trial has ended. Subscribe to continue using CheckRay.",
    "access": { "accessStatus": "expired", "canAnalyze": false }
  }
  ```
- **Expected:** Dashboard shows "Trial ended — subscribe to continue" in the billing card.

---

## 6. Active paid user can analyze

- Set a user's subscription to `status = 'active'` in the DB (or complete a real/test Stripe checkout)
- Submit an analysis
- **Expected:** Full analysis is returned, case is saved.
- **Expected:** Dashboard billing card shows "Pro plan active" with green dot.
- **Expected:** "Manage billing" button appears instead of "Upgrade to Pro".

---

## 7. Stripe checkout route returns URL if env configured

- Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` in `.env.local`
- Sign in as any user
- `POST /api/billing/create-checkout-session`
- **Expected:** `200 OK` with `{ "url": "https://checkout.stripe.com/..." }`
- Opening the URL shows a Stripe Checkout page.

---

## 8. Stripe missing env does not crash

- Remove (or leave unset) `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`
- `POST /api/billing/create-checkout-session`
- **Expected:** `503` with `{ "error": "billing_not_configured", "message": "Billing is not configured yet." }`
- **Expected:** App builds and runs without errors. No crash.

---

## 9. Dashboard shows billing status

- Sign in as a **trialing** user → billing card shows yellow dot, "Free trial — X days left"
- Sign in as an **expired** user → billing card shows red dot, "Trial ended"
- Sign in as an **active** user → billing card shows green dot, "Pro plan active"
- Stripe not configured → upgrade button shows "Billing not configured yet"

---

## DB Queries for Manual Testing

```sql
-- View a user's subscription
select * from public.subscriptions where user_id = '<user-id>';

-- Simulate expired trial
update public.subscriptions
set trial_ends_at = now() - interval '1 day'
where user_id = '<user-id>';

-- Simulate active subscription
update public.subscriptions
set status = 'active', plan = 'pro'
where user_id = '<user-id>';

-- Count anonymous checks for a given cookie
select count(*) from public.anonymous_checks
where anonymous_id = '<cm_anon_id cookie value>';
```

---

## Webhook Testing (local)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook

# In another terminal, trigger a test event:
stripe trigger customer.subscription.created
```

---

> Refunds are handled manually in the Stripe Dashboard for MVP.
> Admin CRM for managing users/billing is tracked in ADMIN_CRM_TODO.md.
