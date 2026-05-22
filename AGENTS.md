# AGENTS.md — CheckRay AI Coding Agent Guide

Last updated: May 2026

**Every AI coding agent working on CheckRay must read this file first and follow it completely.**

This is the master instruction file for AI coding agents (Codex, Claude Opus/Code, Cursor, OpenCode, GitHub Copilot, etc.). It covers rules, architecture, scope guardrails, and the review workflow.

Related docs (read before touching the area):
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — full system map
- [docs/CRITICAL_FLOWS.md](docs/CRITICAL_FLOWS.md) — flows that must never break
- [docs/SECURITY_BOUNDARIES.md](docs/SECURITY_BOUNDARIES.md) — hard security rules
- [docs/SCHEMA_CONTRACTS.md](docs/SCHEMA_CONTRACTS.md) — stable API response shapes
- [docs/CHANGE_REVIEW_CHECKLIST.md](docs/CHANGE_REVIEW_CHECKLIST.md) — checklist for every change
- [docs/AI_REVIEW_WORKFLOW.md](docs/AI_REVIEW_WORKFLOW.md) — builder/reviewer process
- [docs/PRE_DEPLOY_CHECKLIST.md](docs/PRE_DEPLOY_CHECKLIST.md) — before any production deploy

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

### DEPLOY / DESTRUCTIVE COMMANDS
- **Never deploy to Vercel** unless the user explicitly says "deploy to Vercel" or "run vercel --prod".
- **Never run `vercel`, `vercel --prod`, or `vercel deploy`** unless explicitly authorized.
- **Never run destructive commands** (`DROP TABLE`, `DELETE FROM` without WHERE, `rm -rf` on source files, `git push --force`).
- **Never push to `main`** unless the user explicitly says "push to main".
- If pushing is needed, push to a feature/dev branch only.

### SECRETS
- **Never hardcode secrets** in any source file — no OpenAI, Stripe, Supabase, Sentry, Resend, Twilio, or Vercel keys.
- **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** It must never appear in client components, `NEXT_PUBLIC_*` vars, Chrome extension code, or any file that could be bundled client-side.
- **Only `NEXT_PUBLIC_*` vars are client-safe.** Any variable without this prefix is server-only.
- If you need a stub value in CI, use a clearly non-secret string (`placeholder-build-stub`) and add `# gitleaks:allow` on the same line.

### AUTH / BILLING / DATABASE / SECURITY
- **Do not casually modify** `auth.ts`, `middleware.ts`, `lib/billing/access.ts`, or any Supabase migration without a clear reason and explicit user approval.
- **RLS is the security boundary.** Every user-data table must have Row Level Security enabled. Do not add `service_role` bypasses for user-facing queries.
- **Rate limits must stay in place.** The 25 checks/24 h limit in `app/api/analyze-case/route.ts` must not be removed or bypassed.

### PUBLIC MARKETING PAGES
- **Never break the homepage (`/`), pricing (`/pricing`), or legal pages.** These must render even when all env vars are absent.
- `lib/env.ts` must only warn — **never throw**.
- `auth.ts` must return `null` on error — **never throw**.
- `middleware.ts` must only run on protected routes and be wrapped in try/catch.

### ANALYZER RESPONSE SHAPE
- **Do not change the shape of `/api/analyze-case` responses** without updating `docs/SCHEMA_CONTRACTS.md` and all tests.
- The fields `risk_score`, `risk_level`, `disclaimer`, `red_flags`, `recommended_actions`, `safe_reply`, `category`, `confidence` must always be present.
- The disclaimer lives only in `components/footer.tsx`. Do not re-add it to API responses or UI components.

### LANGUAGE / TONE
- Results are **informational only** — not legal, financial, medical, or professional advice.
- Use cautious language: "may", "appears to", "possible", "worth verifying".
- Never say something is "definitely safe" or "definitely a scam".
- Never add "Ray can be wrong" text to UI components or API responses. The footer already has it.

### AFTER EVERY CHANGE
- Run `pnpm type-check` — must pass with 0 errors.
- Run `pnpm build` — must complete without errors.
- Run `gitleaks detect --source .` — must return "no leaks found".
- If routes changed: run `pnpm load:smoke`.
- If analyzer changed: run `pnpm load:analyze:fallback`.
- Summarize: exact files changed, what each change does, risk level of each change.

### SCOPE
- Prefer **small, targeted edits**. Do not refactor unrelated files.
- If you touch a file, explain why. If the explanation is weak, don't touch it.
- Always verify that a change fits the larger end-to-end product before committing.

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

---

## Reviewer prompt (use this after every AI-generated change)

Copy this prompt and run it as a second AI pass before committing:

> "Review the latest CheckRay changes as a senior engineer. Do not make new feature changes. Check whether the diff preserves the architecture, critical flows, auth, billing, analyzer schema, Supabase RLS/security, env handling, cost controls, and production readiness. Identify blockers, risks, missing tests, and exact files that need fixes. Reference docs/CHANGE_REVIEW_CHECKLIST.md."

