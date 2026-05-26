# ADMIN_BILLING_TEST_MODE.md — Admin-only billing test panel

CheckRay ships with a small admin-only page that lets a whitelisted
admin flip their own `user_billing` row through every plan / status
combination so we can verify dashboard UI, the access-gate behaviour,
and copy without going through Stripe Checkout for each state.

The panel writes to `user_billing` (the canonical source the dashboard
and `lib/billing/access.ts` already read). It **never** calls Stripe —
no subscriptions are created, modified, or cancelled. Real Stripe IDs
on the row are preserved.

## When to use this

- Demoing or QA-ing a plan-specific dashboard state (Plus trial, Family
  unlimited, past-due, downgrade-to-Free, …) without paying.
- Testing access-gate behaviour for over-limit Free / Basic / Plus
  users without running 50 real OpenAI calls.
- Resetting your own monthly usage counter so you can re-test the
  over-limit path on the same day.

## Required env vars

Both must be set, server-side, for the panel to exist at all:

| Variable | Scope | Value |
|---|---|---|
| `ENABLE_ADMIN_TOOLS` | **Server-only** | `true` |
| `ADMIN_EMAILS` | **Server-only** | comma-separated, e.g. `devonavich0@gmail.com,colleague@example.com` |

> **Never prefix either with `NEXT_PUBLIC_`.** That would inline them
> into the client bundle. The panel uses `process.env` server-side only.

Locally, add both to `.env.local`. In Vercel, add both as Production
(and optionally Preview) env vars and re-deploy with the build cache
disabled (`NEXT_PUBLIC_*` is not affected, but flagged routes need a
fresh build).

## Triple-gate (in order)

The page at `/admin/billing-test` and both API routes
(`/api/admin/billing-test/set-plan`, `.../reset-usage`) compose three
checks. If any of them fails the route is invisible / inaccessible:

1. `ENABLE_ADMIN_TOOLS === 'true'` — otherwise the page
   `notFound()`s and the API routes return `404 not_found`. A probe
   cannot distinguish "feature off" from "route doesn't exist".
2. Authenticated session — otherwise the page redirects to
   `/sign-in?next=/admin/billing-test` and the API routes return
   `401 unauthorized`.
3. Email is in `ADMIN_EMAILS` (case-insensitive) — otherwise the page
   `notFound()`s and the API routes return `403 forbidden`.

The page is **doubly gated**: the existing `app/admin/layout.tsx`
already wraps every `/admin/*` page in `requireAdmin()`, which performs
gate (3) at the layout level. The page itself re-checks all three gates
as defence in depth.

## How to access

1. Add both env vars to `.env.local` (or your Vercel project).
2. Restart `pnpm dev` (or redeploy).
3. Sign in as a user whose email is in `ADMIN_EMAILS`.
4. **Either** scroll to the footer and click the small yellow "Admin
   tools" link (visible only to admins when the flag is on),
5. **Or** navigate directly to `/admin/billing-test`.

## What each button does

All buttons write to `user_billing` for the **currently signed-in admin
user** (no target-user picker in this first pass — kept narrow on
purpose to avoid touching anyone else's row).

| Button | `user_billing` write | Expected dashboard |
|---|---|---|
| **Set Free** | `plan='free', status='inactive', trial_ends_at=now` | "Free plan / 0 / 1 checks this month / Upgrade now visible" |
| **Set Basic** | `plan='basic', status='active', trial_ends_at=now` | "Basic plan / 0 / 10 / Manage billing" |
| **Set Plus** | `plan='plus', status='active', trial_ends_at=now` | "Plus plan / 0 / 50 / Manage billing" |
| **Set Family** | `plan='family', status='active', trial_ends_at=now` | "Family plan / unlimited fair-use / Manage billing" |
| **Set Basic Trial** | `plan='basic', status='trialing', trial_ends_at=+7d` | "Basic trial — 0/10 — 7 days left / Manage billing" |
| **Set Plus Trial** | `plan='plus', status='trialing', trial_ends_at=+7d` | "Plus trial — 0/50 — 7 days left / Manage billing" |
| **Set Family Trial** | `plan='family', status='trialing', trial_ends_at=+7d` | "Family trial — 7 days left / Manage billing" |
| **Set Past Due** | keeps existing paid plan (or defaults to `plus`), `status='past_due'` | Payment-issue copy via the standard expired branch |
| **Set Canceled / downgrade to Free** | `plan='free', status='inactive'` | Same as Set Free (matches Stripe deletion handler) |
| **Reset usage count** | DELETEs the user's `usage_events` rows with `event_type='check_created'` for the current calendar month | Stats card returns to `0 / limit`; saved cases & reports are untouched |

## What this panel does NOT do

- Does **not** call Stripe. No checkout sessions, no subscription
  updates, no portal sessions, no customer creations.
- Does **not** clear `stripe_customer_id` or `stripe_subscription_id`
  — if you've ever subscribed for real, those columns stay so the
  webhook can still find you when a real Stripe event lands.
- Does **not** delete `cases`, `risk_reports`, `case_messages`, or any
  other product data. Only `usage_events` (current month) and a
  single `user_billing` row are written.

## "This account has a real Stripe subscription" warning

If `user_billing.stripe_customer_id` or `stripe_subscription_id` is
populated, the admin page shows a yellow banner at the top and the
`set-plan` response includes a `warning` string. The override still
applies — but you should be aware that the next time Stripe fires a
webhook for this customer (renewal, payment, cancellation) it will
overwrite the override with Stripe's reality.

For clean state machine tests, use a separate test account that has
never been through real Stripe Checkout.

## Vercel notes

To enable on a live deploy:

1. Vercel project → Settings → Environment Variables
2. Add `ENABLE_ADMIN_TOOLS=true` (Production scope).
3. Add `ADMIN_EMAILS=devonavich0@gmail.com[,…]` (Production scope).
   **No `NEXT_PUBLIC_` prefix.**
4. Redeploy. (The flag is read at request time, not build time, so a
   plain redeploy is enough — no need to clear the build cache.)
5. Sign in as an allowlisted admin → footer link appears, the route is
   reachable.

To disable:

- Either remove `ENABLE_ADMIN_TOOLS` (or set it to
  anything other than the literal string `true`) — the page 404s and
  the API routes 404. **No redeploy needed beyond Vercel applying the
  new env value to running functions.**
- Or remove yourself from `ADMIN_EMAILS` — same effect: 404.

> **Recommendation:** keep the flag off in Production by default.
> Toggle it on only when you actively need to QA a billing state, then
> toggle it back off. The cost of leaving it on is small (everything
> is gated to admin emails) but the smaller the attack surface the
> better.

## Local test recipe

```bash
# .env.local
ENABLE_ADMIN_TOOLS=true
ADMIN_EMAILS=devonavich0@gmail.com
```

1. `pnpm dev`, sign in with `devonavich0@gmail.com`.
2. Footer shows yellow "Admin tools" link → click it.
3. Page shows your current `plan` / `status` / Stripe IDs.
4. Click **Set Free** → reload `/dashboard` → "Free plan / 0 / 1".
5. Click **Set Basic** → reload `/dashboard` → "Basic plan / 0 / 10",
   no "Upgrade now" button in the header.
6. Click **Set Plus** → "Plus plan / 0 / 50".
7. Click **Set Family** → "Family plan / unlimited fair-use".
8. Click **Set Plus Trial** → "Plus trial — 0/50 — 7 days left".
9. Click **Set Past Due** → payment-issue state shown.
10. Click **Reset usage count** → stats card returns to `0 / limit`.
11. Sign out, sign in as a non-admin → no footer link.
12. Hit `/admin/billing-test` directly while non-admin → 404.

## Source of truth

| Component | Reads from |
|---|---|
| `lib/billing/access.ts` `checkAccess()` | `user_billing` (service-role) |
| `app/dashboard/page.tsx` | `user_billing` (preferred) → falls back to `subscriptions` |
| `components/checkmate/BillingStatusCard.tsx` | props from dashboard |
| Stripe webhook (`app/api/stripe/webhook/route.ts`) | writes both `subscriptions` and `user_billing` |

The admin override writes to **`user_billing` only**. That's the table
the dashboard prefers and the access gate reads, so there is no
split-brain. The `subscriptions` table is left alone; real Stripe IDs
and metadata stay intact.

## Related docs

- `docs/STRIPE_BILLING_SETUP.md` — real Stripe Checkout flow.
- `docs/USAGE_LIMITS.md` — plan matrix + access gate.
- `docs/BILLING_PRE_STRIPE_TODO.md` — what's stubbed.
