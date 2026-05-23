# docs/ARCHITECTURE.md — CheckRay System Architecture

Last updated: May 2026

This document describes the current and planned architecture of CheckRay. AI agents must read this before making structural changes.

---

## Overview

CheckRay is a scam and risk detection assistant. Users submit suspicious content — texts, emails, links, bills, job posts, recruiter messages, suspicious pages — and Ray returns a plain-English risk report with a score, red flags, recommended actions, and a safe reply draft.

The product runs as a Next.js web app, with a Chrome extension, future voice/text/email channels, and an admin/support CRM layer.

---

## Current stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 13.4 — App Router, React Server Components |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (`@supabase/auth-helpers-nextjs`) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| AI analyzer | OpenAI (`gpt-4o-mini` default, configurable via `CHECKMATE_ANALYZER_MODEL`) |
| Fallback analyzer | Deterministic keyword/pattern-based (runs when `OPENAI_API_KEY` absent) |
| Billing | Stripe (subscriptions + webhooks) |
| Chrome extension | Plasmo (`chrome-extension/popup.tsx`) |
| Deployment | Vercel (preview on push, production manual only) |
| Observability | Sentry (errors), Vercel Runtime Logs, Supabase Logs, Stripe Dashboard |
| Load testing | k6 (`tests/load/`) |
| E2E testing | Playwright (`tests/e2e/`) |
| Secret scanning | Gitleaks (pre-commit + `.github/workflows/gitleaks.yml`) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Dependency updates | Dependabot (`.github/dependabot.yml`) |
| Package manager | pnpm (workspace: `pnpm-workspace.yaml`) |

---

## Directory layout

```
checkmate/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── analyze-case/       # POST — main AI analyzer endpoint
│   │   ├── auth/callback/      # Supabase auth redirect handler
│   │   ├── billing/            # Stripe checkout + webhook routes
│   │   ├── cases/[id]/         # Case-scoped APIs (follow-up, share)
│   │   └── admin/              # Admin-only APIs (gated by ADMIN_EMAILS)
│   ├── cases/                  # Case submission + list
│   ├── dashboard/              # Authenticated user dashboard
│   ├── share/[id]/             # Public shareable report link
│   ├── sign-in / sign-up/      # Auth pages
│   ├── try/                    # Anonymous free check
│   └── (legal, pricing, etc.)  # Public marketing/legal pages
│
├── components/
│   ├── checkmate/              # Product UI (demos, forms, report views)
│   ├── site/HomePage/          # Homepage section components
│   ├── site/                   # Other site-wide components
│   └── ui/                     # Base primitives (shadcn/ui)
│
├── lib/
│   ├── checkmate.ts            # Core AI analyzer — SERVER ONLY
│   ├── env.ts                  # Soft env validation — never throws
│   ├── legalCopy.ts            # Legal/consent copy strings
│   ├── db_types.ts             # Supabase generated types
│   ├── billing/access.ts       # Access tier resolution
│   ├── checkray-core/          # Shared scoring + wording logic
│   ├── call-ray/               # Call Ray (voice) prompts + logic
│   ├── ghost-jobs/             # Ghost job detection scoring
│   └── notifications/          # Email templates (Resend)
│
├── supabase/
│   ├── migrations/             # SQL migrations — apply in order
│   └── seed.sql                # Dev seed data
│
├── tests/
│   ├── load/                   # k6 load test scripts
│   └── e2e/                    # Playwright specs
│
├── chrome-extension/           # Plasmo Chrome extension
├── scripts/                    # CLI tools (scam intel, analyzer eval)
└── .github/workflows/          # CI/CD
```

---

## Analyzer pipeline

```
User submits text/URL
        │
        ▼
POST /api/analyze-case
        │
        ├─ Auth check (session optional — anon allowed)
        ├─ Rate limit check (25/day auth, 1 anon via anonymous_checks table)
        ├─ Input validation (Zod schema)
        │
        ▼
hasOpenAIEnv()?
  YES → OpenAI gpt-4o-mini (structured output)
  NO  → Deterministic fallback analyzer (lib/checkmate.ts)
        │
        ▼
Response: { report: { risk_score, risk_level, red_flags, recommended_actions,
                       safe_reply, category, confidence, disclaimer, ... } }
        │
        ├─ If auth: save case + risk_report to Supabase (RLS-protected)
        └─ Always: return result to client
```

See [SCHEMA_CONTRACTS.md](SCHEMA_CONTRACTS.md) for the stable response shape.

---

## Database tables (Supabase)

| Table | Purpose | RLS |
|---|---|---|
| `users` | Auth users (Supabase-managed) | ✅ |
| `profiles` | User profile data | ✅ |
| `cases` | Submitted check cases | ✅ |
| `risk_reports` | Analyzer results per case | ✅ |
| `case_messages` | Follow-up chat messages | ✅ |
| `usage_events` | Per-user usage tracking (rate limits) | ✅ |
| `anonymous_checks` | Anonymous check fingerprints (1 free) | ✅ |
| `subscriptions` | Stripe subscription records | ✅ |
| `user_billing` | Billing status per user (plan, trial dates) | ✅ |
| `legal_versions` | Legal doc versions | Public read |
| `user_legal_acceptances` | Per-user legal acceptance records | ✅ |
| `notification_preferences` | ScamWatch email preferences | ✅ |

---

## Access tiers

| Tier | Checks | Notes |
|---|---|---|
| Anonymous | 1 free check | Tracked by fingerprint in `anonymous_checks` |
| Trial | Unlimited | 7-day window from signup (see `user_billing`) |
| Basic | 10/month | Enforced via `usage_events` count |
| Plus | 50/month | Hard cap via `usage_events` count |
| Expired | Blocked | Redirected to upgrade prompt |

---

## Planned / in-progress features

| Feature | Status | Key files |
|---|---|---|
| Admin/Support CRM | In progress | `app/admin/`, `docs/ADMIN_CRM_TODO.md` |
| Stripe billing (live) | In progress | `lib/billing/`, `docs/BILLING_SETUP.md` |
| Chrome extension | MVP built | `chrome-extension/`, `docs/CHROME_EXTENSION_MVP.md` |
| Call Ray (voice) | Planned | `lib/call-ray/`, `docs/CALL_RAY_ROADMAP.md` |
| Weekly scam alerts | Planned | `lib/notifications/`, `docs/NOTIFICATIONS_TODO.md` |
| SMS/text channel | Planned | `docs/MULTICHANNEL_ROADMAP.md` |
| Email channel | Planned | `docs/MULTICHANNEL_ROADMAP.md` |
| Global/country guidance | Planned | `lib/checkray-core/`, `docs/GLOBAL_READINESS.md` |
| Localization | Planned | `docs/LOCALIZATION_TODO.md` |
| IP-based guest rate limiting | Needed before launch | `docs/RATE_LIMITING_TODO.md` |
| Supabase security advisor | Ongoing | `docs/SECURITY_CHECKLIST.md` |

---

## Key architectural constraints

1. **No env var should crash the homepage.** `lib/env.ts` warns, never throws.
2. **`lib/checkmate.ts` is server-only.** `import 'server-only'` is at the top.
3. **Middleware only runs on protected routes.** It is wrapped in try/catch.
4. **Fallback analyzer is always available.** OpenAI being down must not break the product.
5. **RLS is not optional.** Every user-data table must have it enabled.
6. **Production deploys are manual.** Vercel auto-deploys to preview; production requires deliberate action.
7. **`NEXT_PUBLIC_*` vars are build-time.** Changing them on Vercel requires a new build.
