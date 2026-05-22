# SECURITY_SETUP.md — CheckRay Security Setup Guide

Last updated: May 2026

Practical setup instructions for each security layer. For the per-feature checklist, see `SECURITY_CHECKLIST.md`.

---

## 1. Gitleaks — secret scanning

Gitleaks runs automatically on every push and PR via `.github/workflows/gitleaks.yml`.

### Local setup
```bash
# macOS
brew install gitleaks

# Scan the full repo history
gitleaks detect --source . --verbose

# Scan only staged changes (pre-commit hook)
gitleaks protect --staged
```

### Pre-commit hook (recommended)
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
gitleaks protect --staged --redact
```

### What it catches
- OpenAI API keys (`sk-...`)
- Supabase service role JWTs
- Stripe secret keys (`sk_live_...`, `sk_test_...`)
- Any string matching common secret patterns

### False positives
Add a `.gitleaks.toml` at the repo root to allowlist specific patterns.

---

## 2. Dependabot — dependency security updates

Dependabot is configured via `.github/dependabot.yml`. It automatically opens PRs for:
- npm dependency security patches (weekly)
- GitHub Actions version updates (weekly)

Review and merge Dependabot PRs promptly, especially for `critical` and `high` severity CVEs.

### Manual audit
```bash
pnpm audit
pnpm audit --fix   # apply non-breaking patches
```

---

## 3. Supabase RLS — Row Level Security

Every user-facing table has RLS enabled. The service role key bypasses RLS — it must never be used client-side.

### Verify RLS is on
In Supabase Dashboard → Table Editor, confirm the shield icon is green for every table. Or in SQL Editor:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
All user-data tables should show `rowsecurity = true`.

### Run RLS test suite
See `SUPABASE_RLS_TESTS.md` for the full test plan. Quick check:
```sql
-- Should return 0 rows when run as anon role
SET ROLE anon;
SELECT * FROM cases;
SELECT * FROM risk_reports;
SELECT * FROM usage_events;
```

### Supabase Security Advisor
Supabase Dashboard → Database → Security Advisor — run before every production deploy. Address any `critical` findings.

### No service role client-side
The `SUPABASE_SERVICE_ROLE_KEY` is **never** used in:
- Client components (`'use client'`)
- `NEXT_PUBLIC_*` env vars
- The Chrome extension

Search to verify:
```bash
grep -r "SUPABASE_SERVICE_ROLE_KEY\|service_role" \
  app/ components/ lib/ chrome-extension/ \
  --include="*.tsx" --include="*.ts" -n
```
All hits should be inside `app/api/` or server-only `lib/` files.

---

## 4. Rate limiting

### Current implementation
- **Authenticated users:** 25 checks / 24 h enforced in `app/api/analyze-case/route.ts` via `usage_events` COUNT query. Returns HTTP 429.
- **Anonymous guests:** 1 free check (tracked via `anonymous_checks` table by fingerprint). Blocked on second check with upgrade prompt.

### Planned: IP-based rate limiting for guests
Add Upstash Ratelimit before production launch to prevent AI-cost abuse from unauthenticated requests. See `RATE_LIMITING_TODO.md`.

### Test rate limits manually
```bash
# Trigger the 429 for an authenticated user (insert 25 usage_events first)
INSERT INTO usage_events (user_id, event_type, created_at)
SELECT '<user-id>', 'analyze', now() - (generate_series(1,25) * interval '1 hour')
FROM generate_series(1,25);

# Then POST to /api/analyze-case — should return 429
```

---

## 5. Environment variable security

| Variable | Where it lives | Who can read it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env + `.env.local` | Public (baked into bundle) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env + `.env.local` | Public (baked into bundle) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (Sensitive) | Server only |
| `OPENAI_API_KEY` | Vercel env (Sensitive) | Server only |
| `STRIPE_SECRET_KEY` | Vercel env (Sensitive) | Server only |
| `STRIPE_WEBHOOK_SECRET` | Vercel env (Sensitive) | Server only |

Rules:
- Mark all non-`NEXT_PUBLIC_` secrets as **Sensitive** in Vercel.
- Never log secret values — `lib/env.ts` only logs key names.
- Rotate any key that appears in a Gitleaks alert immediately (see INCIDENT_RESPONSE.md).

---

## 6. GitHub Actions security

- Workflows use `actions/checkout@v4`, `pnpm/action-setup@v3`, `actions/setup-node@v4` — all pinned to major versions.
- Secrets are accessed via `${{ secrets.NAME }}` — never hardcoded.
- The `GITHUB_TOKEN` has minimal permissions (read for Gitleaks, write only where needed).
- Production deploys are **manual only** — no workflow auto-deploys to production.

---

## 7. Vercel security headers

Add to `next.config.js` before production launch:
```js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
},
```

---

## 8. Sentry setup

```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Set `SENTRY_DSN` in Vercel. Sentry will capture unhandled exceptions in API routes and server components. Do **not** log full error objects that may contain user data — use `Sentry.captureException(err)` without extra user context unless explicitly reviewed.
