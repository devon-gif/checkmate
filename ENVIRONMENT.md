# ENVIRONMENT.md — CheckRay Environment Variables

> **Fail-safe contract (production).**
> Public marketing pages (`/`, `/pricing`, `/sign-in`, `/sign-up`, legal
> pages) must render even if **every** variable below is missing. Missing
> Supabase publics simply disable auth + dashboard. Missing
> `OPENAI_API_KEY` triggers the deterministic fallback analyzer. Missing
> Stripe disables billing. The app must never show "Application error:
> a server-side exception" on the homepage because of a missing env var.
>
> Implementation: `lib/env.ts` only warns, never throws. `auth.ts`
> returns `null` instead of throwing when Supabase publics are absent.
> Middleware allows all public routes through with no Supabase calls.

Server-only variables must **never** appear in any `NEXT_PUBLIC_` key name.

## Required for full product (auth + dashboard + saved cases)

| Variable | Client-safe? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL. Missing → auth/dashboard disabled, public pages still render. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon key (public, RLS enforced). Missing → same as above. |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Server only | Supabase service role (bypasses RLS for server writes). Never log or expose. Missing → billing/usage writes disabled. |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Canonical app URL without trailing slash (e.g. `https://checkray.app`). Used in Stripe redirect URLs. |

## Strongly recommended (AI quality)

| Variable | Client-safe? | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | ❌ Server only | OpenAI API key for AI risk analysis. Missing → `/api/analyze-case` transparently uses the deterministic fallback analyzer. |

## Recommended

| Variable | Client-safe? | Purpose |
|---|---|---|
| `CHECKMATE_ANALYZER_MODEL` | ❌ Server only | OpenAI model to use (default: `gpt-4o-mini`) |

## Optional — OAuth

| Variable | Client-safe? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_AUTH_GITHUB` | ✅ Yes | Set `false` to disable GitHub OAuth button |
| `AUTH_GITHUB_ID` | ❌ Server only | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | ❌ Server only | GitHub OAuth app client secret |

## Optional — Stripe billing (not required for MVP launch)

See [BILLING_TODO.md](./BILLING_TODO.md) for full setup steps.

| Variable | Client-safe? | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | ❌ Server only | Stripe secret key. Never expose. |
| `STRIPE_WEBHOOK_SECRET` | ❌ Server only | Stripe webhook signing secret for `/api/billing/webhook` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | ✅ Yes | Legacy price ID used in current checkout route |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC` | ✅ Yes | Basic monthly plan price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC_YEARLY` | ✅ Yes | Basic yearly plan price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS` | ✅ Yes | Plus monthly plan price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PLUS_YEARLY` | ✅ Yes | Plus yearly plan price ID |

## Optional — Media

| Variable | Client-safe? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL` | ✅ Yes | Production hero phone video hosted on Vercel Blob |

Production hero phone video is hosted on Vercel Blob through `NEXT_PUBLIC_CHECKRAY_PHONE_VIDEO_URL`.
Local MP4 files in `public/videos` are fallback/testing only and should not be committed.

## Security rules

1. `SUPABASE_SERVICE_ROLE_KEY` is used only in:
   - `lib/billing/access.ts` (service client for billing/usage reads and writes)
   - Any other server-side route that needs to bypass RLS for admin writes
2. `OPENAI_API_KEY` is used only in `lib/checkmate.ts` (server-only, protected by `import 'server-only'`)
3. `STRIPE_SECRET_KEY` is used only in `lib/billing/stripe.ts` (server-only)
4. No secrets are logged anywhere (confirmed by code audit May 2026)
5. `.env.local` is in `.gitignore` — never commit real values

## Vercel deployment

Set all required + optional vars in Vercel → Settings → Environment Variables.
For `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `STRIPE_SECRET_KEY`: set as **Sensitive** so they are never visible in build logs.
