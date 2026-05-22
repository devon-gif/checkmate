# INCIDENT_RESPONSE.md — CheckRay Incident Response Playbook

Last updated: May 2026

---

## Severity levels

| Level | Definition | Response time |
|---|---|---|
| **P0 — Critical** | Production down, data breach, secret exposed, billing compromise | Immediate |
| **P1 — High** | Auth broken, all API routes failing, Stripe webhook failing | < 1 hour |
| **P2 — Medium** | Feature degraded (AI fallback engaged, dashboard errors) | < 4 hours |
| **P3 — Low** | Minor UI bug, slow page, non-critical warning | Next business day |

---

## P0 — Exposed secret / credential leak

**Symptoms:** Gitleaks alert, unexpected API usage spike, Stripe fraud alert.

**Immediate steps:**
1. **Rotate the key immediately** — do not wait to investigate.
   - OpenAI: https://platform.openai.com/account/api-keys
   - Supabase service role: Supabase Dashboard → Settings → API → Regenerate
   - Stripe: Stripe Dashboard → Developers → API Keys → Roll key
2. Update the rotated key in Vercel → Settings → Environment Variables.
3. Trigger a new Vercel production deploy to pick up the new key.
4. Check Vercel Runtime Logs and Supabase logs for any unauthorized use in the past 24 h.
5. If the `SUPABASE_SERVICE_ROLE_KEY` was exposed, audit the `cases`, `risk_reports`, and `user_billing` tables for unexpected rows.
6. File a postmortem (see postmortem template below).

---

## P0 — Data breach / unauthorized data access

**Symptoms:** Unexpected Supabase query volume, user reports of seeing other users' data.

**Immediate steps:**
1. In Supabase Dashboard → Database → RLS, temporarily enable "Block all access" on affected tables if needed.
2. Check Supabase Logs → API for queries bypassing RLS (service role requests from unexpected origins).
3. Run the RLS test suite (SUPABASE_RLS_TESTS.md) to confirm current policy state.
4. Rotate `SUPABASE_SERVICE_ROLE_KEY` (see P0 — exposed secret above).
5. If user PII was exposed, notify affected users within 72 hours (GDPR/CCPA requirement).
6. Preserve logs — do not delete anything before investigation is complete.

---

## P1 — Production is down

**Symptoms:** Vercel deployment failed, all routes returning 500.

**Diagnosis:**
```
1. Vercel Dashboard → Deployments → check latest deployment status and build logs.
2. Vercel Dashboard → Logs → Runtime → filter by error level.
3. Check for recent commits that may have broken the build.
```

**Recovery:**
```bash
# Roll back to the last known-good deployment via Vercel Dashboard
# → Deployments → find last green deploy → "..." → Promote to Production

# Or revert the bad commit locally and redeploy
git revert HEAD
git push origin main
# Then manually promote on Vercel
```

---

## P1 — Auth is broken (users cannot sign in / sign up)

**Symptoms:** Sign-in returns an error, `hasSupabasePublicEnv()` returns false in production.

**Diagnosis:**
1. Check Vercel → Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set for **Production**.
2. Check Supabase Dashboard → Authentication → confirm Email/Password provider is enabled.
3. Check Supabase → Auth → Logs for failed sign-in attempts.
4. Check the Vercel build logs — `NEXT_PUBLIC_*` vars are baked at build time. If they were added after the last build, a new deploy is required.

**Fix:**
- If env vars were missing: add them in Vercel, then trigger a new production deploy.
- If Supabase is down: check https://status.supabase.com/

---

## P1 — Stripe webhook failing

**Symptoms:** Subscription upgrades not reflected in `user_billing`, Stripe Dashboard showing webhook failures.

**Diagnosis:**
1. Stripe Dashboard → Developers → Webhooks → select endpoint → Events tab.
2. Check the response code returned by `/api/billing/webhook`.
3. Check Vercel Runtime Logs for the webhook route.

**Fix:**
- If signature verification failing: confirm `STRIPE_WEBHOOK_SECRET` in Vercel matches the webhook's signing secret in Stripe Dashboard.
- If the route itself is erroring: check logs, fix the bug, redeploy.
- Replay failed events from Stripe Dashboard after the fix.

---

## P2 — AI analyzer degraded (fallback engaged)

**Symptoms:** Users see lower-confidence results, `CHECKMATE_FORCE_FALLBACK` style behavior.

**Diagnosis:**
1. Check Vercel Runtime Logs for `[analyze-case]` errors.
2. Verify `OPENAI_API_KEY` is valid: https://platform.openai.com/account/usage
3. Check OpenAI status: https://status.openai.com/

**Behavior during degradation:** The deterministic fallback analyzer runs automatically. Users get results but they are lower fidelity. No user-facing error is shown unless the fallback also fails.

**Recovery:** Once OpenAI is healthy and the key is valid, the primary analyzer resumes automatically — no deploy needed.

---

## Observability quick links

| Tool | URL |
|---|---|
| Vercel Runtime Logs | https://vercel.com/dashboard → project → Logs |
| Supabase API Logs | https://supabase.com/dashboard → project → Logs → API |
| Supabase DB Logs | https://supabase.com/dashboard → project → Logs → Postgres |
| Sentry | https://sentry.io → checkray project |
| OpenAI usage | https://platform.openai.com/account/usage |
| Stripe events | https://dashboard.stripe.com/events |
| Stripe webhooks | https://dashboard.stripe.com/webhooks |

---

## Postmortem template

```
## Incident Postmortem

Date:
Severity:
Duration:
Author:

### What happened
(Brief timeline of events)

### Root cause
(What was the underlying cause)

### Impact
(Users affected, data at risk, revenue impact)

### Detection
(How was it discovered — alert, user report, manual check)

### Response
(Steps taken to mitigate and resolve)

### What went well

### What went wrong

### Action items
| Item | Owner | Due |
|---|---|---|
|  |  |  |
```
