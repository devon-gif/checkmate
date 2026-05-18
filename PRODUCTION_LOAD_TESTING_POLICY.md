# Production Load Testing Policy

## Core Rule

**Never run load tests against production without an approved plan.**

Load testing production without preparation can:
- Exhaust OpenAI API quota (costs real money)
- Lock real user accounts via Supabase auth rate limits
- Trigger Vercel abuse detection and suspend the project
- Create thousands of junk rows in the production database
- Overwhelm Supabase connection limits and cause downtime for real users

---

## Approved Environments

| Environment | Load Testing Allowed | Notes |
|---|---|---|
| Local (`localhost:3000`) | ✅ Yes | Always preferred |
| Vercel Preview (branch deploy) | ✅ Yes | Use staging Supabase project |
| Vercel Production | ⚠️ Smoke only | ≤5 VU, ≤60s, public routes only |
| Supabase production (auth flows) | ❌ Never in load tests | |

---

## Required Safeguards Before Any Test

1. **Use `CHECKRAY_FORCE_FALLBACK=true`** for any test involving `/api/analyze-case`
   — this bypasses OpenAI entirely and returns a deterministic response
   — eliminates all AI cost risk during load testing

2. **Use synthetic fixture data only**
   — never paste real user data, real case details, or real PII into load test fixtures
   — test payloads must be clearly fictional (e.g., "Test Scammer", "fake@example.com")

3. **Target public routes first**
   — homepage, `/sign-in`, `/sign-up`, `/cases` (unauthenticated redirect) are safe
   — auth-required routes need a dedicated test Supabase user with a long-lived token

4. **No automated sign-up / sign-in flows in load tests**
   — Supabase auth has aggressive rate limits on auth endpoints
   — testing with real signup flows will lock the IP and trigger abuse detection

5. **Set a VU ceiling**
   — staging: max 50 VU
   — production smoke: max 5 VU
   — never run spike or soak tests against production

---

## Load Test Run Authorization

| Test type | Who can trigger | Target |
|---|---|---|
| Smoke (1 VU, 30s) | Any developer | Any non-prod env, production OK |
| Load (5–20 VU, 60s) | Developer + notify team | Non-prod only |
| Spike (50 VU ramp) | Team lead approval | Non-prod only |
| Soak (5–10 VU, 10min) | Team lead approval | Non-prod only |

---

## Pre-Test Checklist

- [ ] `CHECKRAY_FORCE_FALLBACK=true` set in test environment
- [ ] Target is non-production OR test is smoke-only
- [ ] Supabase project is staging/test (not prod project)
- [ ] Test fixtures contain only synthetic data
- [ ] Team notified if test duration > 5 minutes
- [ ] Vercel function limits reviewed (default 10s timeout on hobby, 60s on Pro)
- [ ] Test will be stopped immediately if error rate exceeds 5%

---

## Post-Test Cleanup

After any test against a Supabase-connected environment:
1. Delete any test rows created in `cases`, `risk_reports`, `usage_events`
2. Delete any test user accounts created during the test
3. Review Supabase → Logs → Auth for unexpected auth events
4. Review Supabase → Logs → API for RLS errors introduced by test traffic

---

## GitHub Actions Smoke Workflow

The `.github/workflows/load-smoke.yml` workflow is **manual-trigger only** (`workflow_dispatch`).
It is intentionally not wired to `push` or `pull_request` to prevent accidental load test runs.

Default target: `http://localhost:3000` (requires self-hosted runner or prior app startup step).
To test a preview URL, override `base_url` input when triggering manually.
