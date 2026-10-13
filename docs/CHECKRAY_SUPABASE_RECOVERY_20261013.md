# CheckRay Supabase recovery / switchover — 2026-10-13

## Verified new backend (NOT wired to production yet)

- Supabase organization: **JobGhost Inc** (`pmrtnosiljzffktbpoyo`), Pro.
- Project: **CheckRay** (`bnrabfnacicyyofcymmt`), region `us-east-1`.
- API URL: `https://bnrabfnacicyyofcymmt.supabase.co`.
- Supabase quoted incremental project cost: **$0/month** at creation time.
- State: `ACTIVE_HEALTHY`.
- 25 migrations applied: 24 original migration scripts (including corrected fresh-install FK constraint order) plus security hardening.
- Migration ledger reconciled to the exact version prefixes in the GitHub filenames (25/25 match), so future `supabase db push` should not rerun existing DDL.
- 27 public tables, each with RLS enabled.
- Initial seed: 10 curated scam intelligence patterns, 4 legal versions.
- New project contains **zero** authenticated users, user-owned cases and paid subscriptions.
- Security advisor after hardening: no public-executable auth-trigger warning; remaining advisories include `citext` in public and intentionally server-only RLS tables with no policies.

## Approved fresh-start decision

On 2026-10-13 the owner confirmed **there are no CheckRay sign-ups and authorized starting fresh**. Do not migrate the original database or preserve old auth sessions. The new project is the sole intended backend after cutover. Clear old auth cookies/sign in again when switched.

## Previous production backend and open questions

- Vercel production runtime tried `yrqvjnmeedauwqtuuamh.supabase.co` and logged `ENOTFOUND`.
- Exact old Supabase project is not accessible through current connector; JobGhost Inc dashboard does not show CheckRay among its prior projects.
- The owner explicitly approved a fresh start: no old accounts/reports need restoration. **Do not imply the new DB contains those records.**
- Vercel environment-variable listing returned HTTP 403 to the connector; DO NOT assume the values were updated or connected.

## Safe cutover checklist (not yet completed)

1. **Approved:** start with a clean database and no import. Record the production switch date; old signed-in sessions must authenticate again.
2. Configure Supabase Auth: `https://checkray.app` as Site URL and correct redirect URLs (at least `https://checkray.app/auth/callback`, `https://www.checkray.app/auth/callback`). Confirm email provider and production SMTP.
3. In Vercel project `checkmate` → Settings → Environment Variables, configure **Production** (and Preview for staging as appropriate):
   - `NEXT_PUBLIC_SUPABASE_URL=https://bnrabfnacicyyofcymmt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the project's **legacy anon** key (active; `@supabase/auth-helpers-nextjs` compatibility). Get it from Supabase → Project Settings → API Keys → Legacy.
   - `SUPABASE_SERVICE_ROLE_KEY` = the new project's **legacy service_role** key from the same project. Mark **Sensitive**, available to server-side runtime only.
   - `NEXT_PUBLIC_APP_URL=https://checkray.app` (and `NEXT_PUBLIC_SITE_URL` if present).
   - Never copy the original defunct project's keys or put service_role into any `NEXT_PUBLIC_*` variable.
   - **Connector constraint:** Vercel environment listing and create API operations returned HTTP 403; the owner must set these in the Vercel web dashboard or grant a Vercel connection with environment write access. Never paste secrets into chat.

4. Verify `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_MONTHLY_PRICE_ID=price_1Tb5XaJBYoU6w4SVsHW8Nf6v`, `STRIPE_PLUS_MONTHLY_PRICE_ID=price_1Tb5YcJBYoU6w4SVLorFGKRy` in Vercel. Reuse the existing Stripe prices; do not create duplicates. Check `/api/stripe/webhook` is the configured webhook route and subscriptions sync into **new** `user_billing` records. The owner reports no customer sign-ups; still confirm webhook processing before enabling Checkout.
5. Redeploy only with user approval: `NEXT_PUBLIC_*` vars are embedded during Next.js build. Run type-check, production build, analyzer evals, security/secret scan and tests before production launch.
6. Perform controlled end-to-end account registration, login, risk check, case save, usage quota, subscription trial/renewal, webhook, cancellation and customer portal tests.
7. Confirm production DNS no longer references the unavailable old Supabase project and inspect fresh Vercel runtime logs.

## Safety note

Creating the new Supabase project and applying schema migrations did **not** alter the old project, recover user data, update Vercel, deploy to production, or touch Stripe subscriptions. This document intentionally contains **no API keys or customer data**.
