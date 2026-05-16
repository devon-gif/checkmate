# CheckRay Pricing Model

**Last updated: May 2026**

---

## Plans

### Free — $0/month

- 1 check per month (no account required for your first check)
- Risk score
- Common red flags
- Suggested next steps
- Results not saved
- CTA: "Try your free check"

---

### Basic — $9.99/month | $95.88/year (Save 20%, equiv. $7.99/month)

- 25 checks per month
- Saved check history
- Safer reply drafts
- Dashboard
- Email support
- 7-day free trial (no credit card required)
- CTA: "Start 7-day trial"

---

### Plus — $19.99/month | $191.88/year (Save 20%, equiv. $15.99/month)

- Unlimited fair-use checks
- Saved check history
- Safer reply drafts
- Priority analysis
- Dashboard
- Priority support
- 7-day free trial (no credit card required)
- CTA: "Start 7-day trial"

> **Note:** "Unlimited plans are subject to fair-use limits to prevent abuse."

---

## 7-Day Free Trial

- Available on Basic and Plus
- Starts on sign-up
- No credit card required at trial start
- After 7 days: user must subscribe or is blocked
- Trial tracked in `user_billing.trial_ends_at`

---

## Plan limits (monthly check caps)

| Plan           | Checks/month     |
|----------------|-----------------|
| free           | 1               |
| trial          | unlimited        |
| basic          | 25              |
| basic_yearly   | 25              |
| plus           | unlimited (fair-use) |
| plus_yearly    | unlimited (fair-use) |

Defined in `lib/billing/plans.ts` → `PLAN_MONTHLY_LIMIT`.

---

## Yearly billing

| Plan           | Monthly price | Yearly price | Savings |
|----------------|--------------|--------------|---------|
| Basic monthly  | $9.99        | —            | —       |
| Basic yearly   | $7.99/mo     | $95.88/yr    | Save 20% |
| Plus monthly   | $19.99       | —            | —       |
| Plus yearly    | $15.99/mo    | $191.88/yr   | Save 20% |

---

## Cancellation save offers

Offers are shown in order when a user initiates cancellation.
Coupons must be created in Stripe and referenced via env vars (see BILLING_TODO.md).

### Basic ($9.99/month) cancellation

| Stage | Offer | Details |
|-------|-------|---------|
| 1 | Stay for $6.99/month | Permanent discount |
| 2 | $2.99/month for 3 months | Time-limited offer |

### Plus ($19.99/month) cancellation

| Stage | Offer | Details |
|-------|-------|---------|
| 1 | Stay for $12.99/month | Permanent discount |
| 2 | $8.99/month for 3 months | Time-limited offer |

Defined in `lib/billing/plans.ts` → `CANCELLATION_OFFERS`.

**UX rules:**
- User must always see a clear "Continue cancellation" option.
- Do not hide or obscure the cancel button.
- Never trap users. Cancellation must remain easy and transparent.

---

## Cancellation survey

Shown after cancellation is confirmed (or before — to inform save offers).

**Question:** "Why are you cancelling?"

**Options (single select):**
- Too expensive
- I don't use it enough
- I only needed it once
- Results were not helpful
- I had technical issues
- I found another tool
- Privacy concerns
- Other

**Optional text box:** "Anything we could improve?"

**Buttons:**
- "Submit and continue"
- "Skip"

Responses stored in `user_billing.cancellation_reason` and `user_billing.cancellation_feedback`.

---

## Database columns (user_billing)

| Column | Type | Notes |
|---|---|---|
| `plan` | text | free, trial, basic, basic_yearly, plus, plus_yearly |
| `status` | text | trialing, active, inactive, canceled, past_due |
| `trial_started_at` | timestamptz | |
| `trial_ends_at` | timestamptz | |
| `stripe_customer_id` | text | Set on first Stripe checkout |
| `stripe_subscription_id` | text | Set on checkout.session.completed |
| `current_period_end` | timestamptz | From Stripe webhook |
| `cancel_offer_stage` | integer | 0=none shown, 1=first shown, 2=second shown |
| `cancellation_reason` | text | From cancellation survey |
| `cancellation_feedback` | text | Free-text from survey |
