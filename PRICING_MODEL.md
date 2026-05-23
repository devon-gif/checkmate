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

### Basic — $4.99/month | $47.88/year (Save 20%, equiv. $3.99/month)

- 10 checks per month
- Saved reports
- Safer reply drafts
- Dashboard
- Weekly Scam Watch emails
- Email support
- 7-day free trial (no credit card required)
- CTA: "Start 7-day trial"

---

### Plus — $9.99/month | $95.88/year (Save 20%, equiv. $7.99/month)

- 50 checks per month
- Everything in Basic
- Chrome extension access
- Trusted Circle sharing
- More detailed verification steps
- Email & text workflows *(early access when available)*
- 7-day free trial (no credit card required)
- CTA: "Start 7-day trial"

> **Note:** "Unlimited plans are subject to fair-use limits to prevent abuse."

---

### Family — $19.99/month | $191.88/year (Save 20%, equiv. $15.99/month)

- Unlimited fair-use checks
- Everything in Plus
- Family & trusted contact support
- Priority access to new features
- Best for parents, job seekers, and heavy use
- Call Ray access *(coming soon)*
- 7-day free trial (no credit card required)
- CTA: "Start 7-day trial"

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
| free           | 1                |
| trial          | unlimited        |
| basic          | 10               |
| basic_yearly   | 10               |
| plus           | 50               |
| plus_yearly    | 50               |
| family         | unlimited (fair-use) |
| family_yearly  | unlimited (fair-use) |

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

## Chrome Extension (planned — Basic+ feature)

**Feature name:** CheckRay Browser Extension

**Core promise:** "Check anything suspicious while you browse."

**Availability:** Basic plan and Plus plan only. Not available on the free tier.

**Marketing line:**
> Chrome extension coming soon: check suspicious job posts, emails, links, and pages while you browse.

### V1 use cases

- Highlight suspicious text in the browser and send it to Ray
- Paste email, recruiter message, or job description text into the extension popup
- Check the current page URL for common phishing/scam signals
- Check job descriptions and company websites for possible red flags
- Check suspicious links, bills, marketplace listings, and emails
- Save results directly to the user's CheckRay dashboard
- Open the full report in the web app

### Safe wording rules (carry forward from web app)

Use: *common red flags*, *risk signals*, *possible scam*, *possible ghost job*, *verify through official sources*, *Ray can be wrong*

Never use: *Ray proves it is fake*, *Ray confirms it is legit*, *guaranteed scam detection*, *verified safe*

### Auth model

- User must be signed in to use the extension (Basic or Plus subscriber)
- Extension uses the same Supabase session as the web app (shared cookie or token)
- Free/anonymous users see an upgrade prompt inside the popup

### Gating

- Extension checks use the same `POST /api/analyze-case` route — billing gate already enforces plan limits
- No separate extension-specific quota needed for V1

### Not in scope for V1

- Gmail/Outlook in-page helper
- LinkedIn/Indeed job post auto-detection
- Browser warning overlay for high-risk pages
- Trusted contact sharing from extension

See `RETENTION_FEATURES_TODO.md` → Chrome Extension section for full feature roadmap.

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
