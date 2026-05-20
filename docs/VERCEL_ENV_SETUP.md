# CheckRay — Vercel Environment Setup

This document explains how to configure environment variables for CheckRay
on Vercel. **`.env.local` does NOT roll out to Vercel** — every variable
that needs to exist in production must be set explicitly in the Vercel
dashboard for **all three** environments (Production, Preview, Development)
where you want it.

## TL;DR

1. Add each variable below to Vercel **→ Project → Settings → Environment
   Variables**.
2. For each one, check **all three** environment scopes that should see
   it: Production, Preview, Development.
3. After adding or changing any variable, **redeploy with build cache
   disabled** (Vercel → Deployments → ⋯ → Redeploy → uncheck "Use existing
   Build Cache"). Next.js inlines `NEXT_PUBLIC_*` values at build time,
   so a cached build will still have the old (or missing) values baked in.

## Required for the full product

Without these, sign-in/sign-up shows the "accounts not available yet"
notice, dashboard redirects to sign-in, and `/api/analyze-case` uses the
deterministic fallback analyzer. Public marketing pages still render.

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key. RLS-protected. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sensitive** | Server-only. Bypasses RLS. Never log. |
| `OPENAI_API_KEY` | **Sensitive** | Server-only. Falls back to deterministic analyzer if missing. |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical URL, no trailing slash. Used by Stripe redirects. |
| `NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL` | Public | Hero phone video CDN URL. Falls back to `/videos/checkray-mobile-video.mp4`. |

## Optional / future

| Variable | Scope | Notes |
|---|---|---|
| `CHECKMATE_ANALYZER_MODEL` | Server | Defaults to `gpt-4o-mini`. |
| `STRIPE_SECRET_KEY` | **Sensitive** | Billing — not yet live. |
| `STRIPE_WEBHOOK_SECRET` | **Sensitive** | Billing webhook signing. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_*` | Public | Per-plan price IDs. |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Sentry DSN. Missing → Sentry is a no-op. See `SENTRY_SETUP.md`. |
| `SENTRY_AUTH_TOKEN` | **Sensitive** | Sentry source map upload during build. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Server | Required only if `SENTRY_AUTH_TOKEN` is set. |

## Important: `.env.local` is not enough

Vercel **does not read** `.env.local`. That file is loaded only by
`next dev` and is gitignored. Every variable you want in production must
be set in Vercel directly.

If `.env.example` lists a variable, treat that as the spec — Vercel must
match it.

## After changing env vars — redeploy with cache disabled

Next.js inlines all `NEXT_PUBLIC_*` variables into the client bundle at
**build time**. If you change a `NEXT_PUBLIC_*` value and trigger a
deploy with the build cache enabled, the cached bundle still contains
the old value.

To pick up changes:

1. Vercel dashboard → **Deployments**.
2. Find the most recent deploy → click the ⋯ menu → **Redeploy**.
3. In the dialog, **uncheck "Use existing Build Cache"**.
4. Confirm.

For server-only variables (no `NEXT_PUBLIC_` prefix), a normal redeploy is
enough — they are read at runtime.

## Sanity checklist before going live

- [ ] All "Required for the full product" variables are set for **Production**.
- [ ] All "Required for the full product" variables are set for **Preview**
      (so PR previews actually work).
- [ ] No secret variable is checked into `Public` scope (i.e. no
      `OPENAI_API_KEY` value visible in the client bundle).
- [ ] Re-deployed with build cache disabled after the last env change.
- [ ] Hit the production URL `/` — homepage renders, no "Application error".
- [ ] Hit `/sign-in` — either shows the real form (envs configured) OR the
      friendly "accounts not available yet" notice (envs missing). Either
      is acceptable; a 500 is not.

## Fail-safe contract

CheckRay is designed so that **no missing env var crashes the
homepage**. If you ever see "Application error: a server-side exception"
on `/` in production, it is a bug — file an issue. The relevant guards:

- `auth.ts` returns `null` instead of throwing when Supabase publics are
  missing.
- `lib/env.ts` warns but never throws.
- `middleware.ts` only runs for protected routes and is wrapped in
  try/catch.
- `/api/analyze-case` falls back to the deterministic analyzer when
  `OPENAI_API_KEY` is absent.
