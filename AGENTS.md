# AGENTS.md — CheckRay AI Coding Agent Guide

Last updated: May 2026

This document tells AI coding agents (Codex, Claude Opus/Code, Cursor, OpenCode, etc.) how this codebase is structured, what the rules are, and what to watch out for.

---

## Project overview

CheckRay is a Next.js 13 App Router application that uses AI (OpenAI) to analyze suspicious messages, links, jobs, and bills for risk signals. The app is deployed on Vercel with Supabase as the database and auth provider.

Key tech: **Next.js 13 App Router · TypeScript · Tailwind CSS · Supabase · OpenAI · Stripe · pnpm**

---

## Repo layout

```
checkmate/
├── app/                   # Next.js App Router — pages, layouts, API routes
│   ├── api/               # Server-only API routes
│   ├── cases/             # Case submission + list
│   ├── dashboard/         # Authenticated user dashboard
│   ├── sign-in / sign-up/ # Auth pages
│   └── ...
├── components/            # Shared React components
│   ├── checkmate/         # Product UI (demos, forms, report views)
│   ├── site/              # Marketing pages (homepage sections)
│   └── ui/                # Base primitives (shadcn/ui)
├── lib/                   # Server + shared utilities
│   ├── checkmate.ts       # Core AI analyzer (server-only)
│   ├── env.ts             # Soft env validation — never throws
│   ├── legalCopy.ts       # Legal / consent copy strings
│   ├── checkray-core/     # Shared logic (safe wording, scoring)
│   ├── call-ray/          # Voice/Call Ray feature
│   ├── ghost-jobs/        # Ghost job detection
│   └── billing/           # Stripe + access control
├── supabase/
│   ├── migrations/        # SQL migrations (apply in order)
│   └── seed.sql           # Dev seed data
├── tests/
│   ├── load/              # k6 load test scripts
│   └── e2e/               # Playwright specs (see MVP_TEST_PLAN.md)
├── chrome-extension/      # Plasmo-based Chrome extension (popup.tsx)
└── .github/workflows/     # CI/CD GitHub Actions
```

---

## Non-negotiable rules

### 1. Never throw in `lib/env.ts`
`lib/env.ts` must only warn, never throw. Marketing pages must keep rendering even if env vars are absent.

### 2. `lib/checkmate.ts` is server-only
It has `import 'server-only'` at the top. Never import it from a client component or from `lib/` files that might be bundled client-side.

### 3. Supabase service role key — server only
`SUPABASE_SERVICE_ROLE_KEY` must never reach the client bundle. Use `createRouteHandlerClient` or `createServerComponentClient` only inside `app/api/` and Server Components.

### 4. RLS is the security boundary
Every Supabase table has Row Level Security enabled. API routes rely on RLS — do not add `service_role` bypasses for user-facing data queries.

### 5. Type-check before committing
Run `pnpm type-check` before any commit that touches TypeScript. The build must be green.

### 6. No disclaimer text in product UI
The "Ray can be wrong" legal disclaimer lives only in `components/footer.tsx`. Do not add it to individual UI components, form submit rows, or API responses.

### 7. Rate limits must stay in place
The 25 checks/24 h limit for authenticated users in `app/api/analyze-case/route.ts` must not be removed or bypassed. Guest rate limiting (IP-based) should be added before production launch (see SECURITY_CHECKLIST.md).

---

## Environment variables

| Variable | Required | Where used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client + server Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client + server Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Admin / service-role operations |
| `OPENAI_API_KEY` | Yes (server) | AI analyzer |
| `CHECKMATE_ANALYZER_MODEL` | No | Defaults to `gpt-4o-mini` |
| `NEXT_PUBLIC_AUTH_GITHUB` | No | `"true"` enables GitHub OAuth button |
| `AUTH_GITHUB_ID` | If GitHub OAuth | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | If GitHub OAuth | GitHub OAuth app client secret |
| `STRIPE_SECRET_KEY` | Billing | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` | Billing | Pro plan price ID |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical URL for redirects |
| `ADMIN_EMAILS` | Optional | Comma-separated admin email list |

All `NEXT_PUBLIC_*` vars are baked in at **build time**. Changing them on Vercel requires a new deploy.

---

## Common commands

```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm type-check       # TypeScript check (no emit)
pnpm lint             # ESLint
pnpm test:analyzer    # Run analyzer eval tests
pnpm load:smoke       # k6 smoke test (requires k6 installed)
```

---

## AI coding guidelines

- **Prefer small, targeted edits** — do not refactor files that aren't directly related to the task.
- **Match existing style** — Tailwind utility classes, `cn()` for conditional classes, `GlassCard`/`GradientButton` for UI primitives.
- **Check for existing abstractions** before creating new ones — `lib/legalCopy.ts`, `lib/checkray-core/safe-wording.ts`, `components/checkmate/LegalDisclaimer.tsx` etc.
- **Server vs client** — Server Components are the default. Add `'use client'` only when you need browser APIs, state, or event handlers.
- **Supabase types** — `lib/db_types.ts` contains generated types. Use `Database` from there for typed queries.
- **Never commit secrets** — `.env.local` is gitignored. Use the Vercel dashboard for production secrets.
- **Do not create summary markdown files** unless explicitly asked.

---

## Key files to read before touching auth or billing

- `auth.ts` — session helper wrapping `@supabase/auth-helpers-nextjs`
- `middleware.ts` — protects `/dashboard`, `/cases`, `/settings`, `/account`, `/billing`
- `lib/billing/access.ts` — access tier resolution
- `lib/env.ts` — capability flags (`hasSupabasePublicEnv()`, `hasOpenAIEnv()`, etc.)
