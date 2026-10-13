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

## Previous production backend and open questions

- Vercel production runtime tried `yrqvjnmeedauwqtuuamh.supabase.co` and logged `ENOTFOUND`.
- Exact old Supabase project is not accessible through current connector; JobGhost Inc dashboard does not show CheckRay among its prior projects.
- Before redirecting production, determine whether an old backup/export exists and whether the user wishes to restore past CheckRay accounts/reports. **Do not imply the new DB contains those records.**
- Vercel environment-variable listing returned HTTP 403 to the connector; DO NOT assume the values were updated or connected.

## Safe cutover checklist (not yet completed)

1. Recover existing beta/user data from an authorized backup if needed, or obtain explicit approval to start with a clean database.
2. Configure Supabase Auth: `https://checkray.app` as Site URL and correct redirect URLs (at least `https://checkray.app/auth/callback`, `https://www.checkray.app/auth/callback`). Confirm email provider and production SMTP.
3. In Vercel project `checkmate`, configure **production** `NEXT_PUBLIC_SUPABASE_URL` to the new API URL, `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the **new project's** active legacy anon key (existing `@supabase/auth-helpers-nextjs` compatibility), and `SUPABASE_SERVICE_ROLE_KEY` to **that same project's** secret server-side service-role key. NEVER publish these keys or put the service-role key in a `NEXT_PUBLIC_*` var.
4. Verify Stripe `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and monthly Basic/Plus price IDs in Vercel. Check `/api/stripe/webhook` is the configured webhook route and subscriptions sync into **new** `user_billing` records. Existing customer subscriptions must NOT be double charged.
5. Redeploy only with user approval: `NEXT_PUBLIC_*` vars are embedded during Next.js build. Run type-check, production build, analyzer evals, security/secret scan and tests before production launch.
6. Perform controlled end-to-end account registration, login, risk check, case save, usage quota, subscription trial/renewal, webhook, cancellation and customer portal tests.
7. Confirm production DNS no longer references the unavailable old Supabase project and inspect fresh Vercel runtime logs.

## Safety note

Creating the new Supabase project and applying schema migrations did **not** alter the old project, recover user data, update Vercel, deploy to production, or touch Stripe subscriptions. This document intentionally contains **no API keys or customer data**.
