# DEPLOY_CHECKLIST.md — CheckRay Deploy Checklist

Last updated: May 2026

> **Deployment policy:** Preview deploys happen automatically via Vercel on every push.
> **Production deploys are manual only** — trigger via Vercel Dashboard or `vercel --prod` after the checklist below is complete.

---

## How the app degrades when envs are missing

The MVP is hardened so that a misconfigured env on Vercel does **not** take
down the whole site:

- **Middleware** (`middleware.ts`) only runs on `/dashboard`, `/cases`,
  `/settings`, `/account`, `/billing`. Any throw is caught and the request
  is allowed through. The homepage and marketing pages cannot be killed by
  middleware.
- **`/api/analyze-case`** is wrapped in a top-level try/catch and returns a
  friendly JSON error instead of a stack trace.
- **`lib/billing/access.ts`** logs and returns a permissive
  `anonymous_free` result if `SUPABASE_SERVICE_ROLE_KEY` /
  `NEXT_PUBLIC_SUPABASE_URL` are missing or Supabase is unreachable, so
  `/cases/new` still renders.
- **`/dashboard`** no longer uses `.throwOnError()`; missing tables or
  empty results render the empty-state UI instead of a 500.

These are safety nets — you still need every env below set correctly for
the product to actually work end-to-end.

---

## Before first deploy

### 1. Environment variables (Vercel → Settings → Environment Variables)

> **Fail-safe contract.** Public marketing pages (`/`, `/pricing`, `/sign-in`,
> `/sign-up`, legal pages) render even if every variable below is missing.
> Missing Supabase publics simply disable auth/dashboard. Missing
> `OPENAI_API_KEY` triggers the deterministic fallback analyzer. Missing
> Stripe disables billing. No env var should ever cause an "Application
> error: a server-side exception" on the homepage. If you see one, file a
> bug — the env layer is supposed to fail soft.

**Required for full product (auth + dashboard + saved cases):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — mark as **Sensitive**
- [ ] `NEXT_PUBLIC_APP_URL` — set to `https://checkray.app` (no trailing slash)

**Strongly recommended (AI quality):**
- [ ] `OPENAI_API_KEY` — mark as **Sensitive**. Without it, `/api/analyze-case`
      transparently uses the deterministic fallback analyzer.
- [ ] `CHECKMATE_ANALYZER_MODEL` — defaults to `gpt-4o-mini` when unset.

**Optional (media):**
- [ ] `NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL` — hero phone video CDN URL.
      Falls back to `/videos/checkray-mobile-video.mp4` if unset.

**Optional / future (billing — Stripe not yet live):**
- [ ] `STRIPE_SECRET_KEY` — mark as **Sensitive**
- [ ] `STRIPE_WEBHOOK_SECRET` — mark as **Sensitive**
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` (or per-plan IDs when multi-plan checkout is ready)

### 2. Supabase — run all migrations

In Supabase Dashboard → SQL Editor, run each migration file in order:
```
20230707053030_init.sql
20260515120000_add_core_app_tables.sql
20260515130000_add_legal_tables.sql
20260516120000_extend_core_tables.sql
20260516130000_add_billing_tables.sql
20260516140000_add_user_billing_table.sql
20260516150000_extend_user_billing_cancellation.sql
20260516160000_add_notification_preferences.sql
20260516170000_harden_rls.sql          ← RLS hardening (subscriptions + usage_events)
```

Or use Supabase CLI: `supabase db push`

### 3. Supabase — verify RLS

Run the SUPABASE_RLS_TESTS.md checks to confirm no policies are misconfigured.

### 4. Supabase Auth

- [ ] Enable Email/Password provider in Supabase Auth settings
- [ ] Set Site URL to `https://checkray.app`
- [ ] Set Redirect URLs to `https://checkray.app/api/auth/callback`
- [ ] (Optional) Enable GitHub OAuth with correct redirect URL

### 5. Supabase — confirm tables exist

In Supabase Dashboard → Table Editor, confirm all tables exist:
- [ ] users
- [ ] profiles
- [ ] cases
- [ ] case_messages
- [ ] risk_reports
- [ ] usage_events
- [ ] subscriptions
- [ ] user_billing
- [ ] anonymous_checks
- [ ] legal_versions
- [ ] user_legal_acceptances
- [ ] notification_preferences

---

## CI gates (must be green before promoting to production)

| Check | Workflow | How to run locally |
|---|---|---|
| TypeScript type-check | `.github/workflows/ci.yml` | `pnpm type-check` |
| Next.js build | `.github/workflows/ci.yml` | `pnpm build` |
| Secret scan | `.github/workflows/gitleaks.yml` | `gitleaks detect --source .` |
| Playwright E2E | `.github/workflows/playwright.yml` | `pnpm exec playwright test` |
| k6 load smoke | `.github/workflows/load-smoke.yml` | `pnpm load:smoke` |

```bash
# Run all local checks before promoting
pnpm type-check && pnpm build && pnpm exec playwright test
```

---

## Observability — verify before going live

- [ ] **Sentry** — `SENTRY_DSN` set in Vercel env; test with `throw new Error('sentry-test')` in a route, confirm event appears in Sentry dashboard.
- [ ] **Vercel Runtime Logs** — visit Vercel Dashboard → Logs → confirm API routes are logging and not 500ing.
- [ ] **Supabase logs** — Supabase Dashboard → Logs → API/Postgres; confirm queries are landing.
- [ ] **Stripe webhook logs** — Stripe Dashboard → Developers → Webhooks → confirm `/api/billing/webhook` is receiving events (when Stripe is live).

---

## Build verification

```bash
cd checkmate
pnpm tsc --noEmit   # must pass with 0 errors
pnpm build          # must complete without errors
```

---

## Post-deploy smoke tests

### Auth
- [ ] Sign up with email/password → receives confirmation email → confirms → lands on /dashboard
- [ ] Sign in with existing account → lands on /dashboard
- [ ] Legal modal appears on first sign-in if not yet accepted → accept → modal dismissed
- [ ] Refresh dashboard → legal modal does NOT re-appear

### Check flow
- [ ] Anonymous: visit /cases/new → run check → result displayed → no save indicator
- [ ] Anonymous: second check → blocked gate shown → upgrade prompt
- [ ] Logged in: run check → result displayed → "Saved to your dashboard" appears → link to /cases/[id]
- [ ] Visit /cases/[id] → full report detail renders → follow-up box visible

### Dashboard
- [ ] New user (0 checks): empty state shown with CTA
- [ ] After first check: case card appears with risk badge, score, category, date
- [ ] BillingStatusCard shows correct plan (trial/basic/plus/expired)
- [ ] ScamWatchCard toggle works → preference saved

### Access gating
- [ ] Trial user: unlimited checks during 7-day trial
- [ ] Basic user: 25 checks/month enforced (test with manual `usage_events` insert in DB)
- [ ] Plus user: unlimited checks
- [ ] Expired trial: blocked on /cases/new with upgrade prompt

### API
Run BACKEND_TESTS.md curl tests J1–J4 against production URL.

---

## Remaining blockers before billing goes live

- [ ] Stripe webhook route (`/api/billing/webhook`) — see BILLING_TODO.md
- [ ] Multi-plan checkout (currently single `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`)
- [ ] Verify `user_billing` updated correctly from webhook events

---

## Not blocking MVP launch

- Weekly email sending (NOTIFICATIONS_TODO.md)
- SMS/phone channel
- CRM/admin panel
- Cancellation discount flows
- Family plans
