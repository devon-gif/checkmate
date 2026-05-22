# docs/CRITICAL_FLOWS.md — Flows That Must Never Break

Any change to the codebase must be manually verified against this list before deploy. AI agents must flag any change that could affect these flows.

---

## A. Public / unauthenticated flows

### A1. Homepage loads
- Route: `GET /`
- Must load without any private env vars present
- "Start free trial" → navigates to `/sign-up`
- "Sign in" → navigates to `/sign-in`
- "Try Ray free" / "See how Ray works" → scrolls to demo section

### A2. Pricing page loads
- Route: `GET /pricing`
- Must show all plan tiers
- "Start free trial" → `/sign-up`
- No auth required

### A3. Legal pages load
- Routes: `GET /privacy`, `GET /terms`
- Must load without auth
- Must include current legal version references

### A4. Anonymous free check
- Route: `POST /api/analyze-case` (unauthenticated)
- Allowed once per fingerprint (`anonymous_checks` table)
- Returns full report including `risk_score`, `risk_level`, `red_flags`, `recommended_actions`, `safe_reply`
- Second attempt returns 429 or upgrade prompt

### A5. Public shareable report
- Route: `GET /share/[id]`
- Must load without auth
- Must show correct risk report for the given case ID
- Must not expose other users' cases

---

## B. Auth flows

### B1. Sign-up
- Route: `GET /sign-up` → email/password form → `POST /auth/sign-up`
- On success: email confirmation (or immediate session if confirmation disabled)
- On success with session: redirect to `/dashboard`
- Legal acceptance must be recorded in `user_legal_acceptances`
- Trial billing record must be created in `user_billing`

### B2. Sign-in
- Route: `GET /sign-in` → email/password form → `POST /auth/sign-in`
- On success: redirect to `/dashboard` (or intended destination)
- On failure: clear error message, no session stored

### B3. Supabase auth callback
- Route: `GET /api/auth/callback`
- Handles OAuth/magic link redirects from Supabase
- Exchanges code for session, redirects to `/dashboard`

### B4. Session-protected routes
- Routes: `/dashboard`, `/cases`, `/cases/new`, `/cases/[id]`
- Unauthenticated users must be redirected to `/sign-in`
- Middleware must not throw on Supabase errors

---

## C. Core product flows

### C1. Submit new case
- Route: `GET /cases/new` → form → `POST /api/analyze-case`
- Must accept: text, URL, or pasted content
- Must show loading state during analysis
- On success: redirect to case detail page with risk report
- On rate-limit exceeded: show upgrade prompt, not raw error

### C2. Analyzer returns correct schema
- Response must always include: `risk_score`, `risk_level`, `disclaimer`, `red_flags[]`, `recommended_actions[]`, `safe_reply`, `category`, `confidence`
- Must work with OpenAI unavailable (deterministic fallback)
- See [SCHEMA_CONTRACTS.md](SCHEMA_CONTRACTS.md) for full shape

### C3. Case detail / saved report
- Route: `GET /cases/[id]`
- Must show the saved risk report for authenticated owner
- Must reject other users (RLS enforced)
- Risk badge, red flags, recommended actions, safe reply all must render

### C4. Dashboard: recent checks
- Route: `GET /dashboard`
- Must show the authenticated user's recent cases
- Must show usage meter (checks used this period)
- Must show plan tier + trial status if applicable

### C5. Follow-up chat
- Route: `GET /chat/[id]`
- Must load case context and allow follow-up questions
- Must attribute messages to the authenticated user only

---

## D. Admin/Support flows

### D1. Support ticket submit
- User can submit a support request from the app
- Ticket recorded in `support_tickets` table (RLS: user can insert, admin can read)

### D2. Admin blocked for non-admin
- Routes under `/admin/` must return 403/redirect for any user not in `ADMIN_EMAILS`
- This must be enforced at the route/middleware level, not just UI

### D3. Admin sees support tickets
- Route: `GET /admin/support`
- Shows all open tickets (admin role only)
- Can update ticket status

---

## E. Billing flows

### E1. Pricing page → checkout
- "Upgrade" button → creates Stripe Checkout Session → redirects to Stripe
- On success: Stripe webhook fires → `user_billing` updated → user sees correct plan

### E2. Billing portal
- Authenticated user → `/billing/portal` → Stripe Customer Portal
- Can cancel, change plan, update payment method

### E3. Stripe webhook updates plan
- `POST /api/billing/webhook`
- Must handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Must update `user_billing` + `subscriptions` tables
- Must be idempotent (replay safe)

### E4. Trial expiry
- After 7 days: user with no active subscription sees upgrade prompt
- Analyzer must return 402/upgrade prompt, not 500

---

## F. Developer flows (must not break in CI)

| Flow | Command | Must pass |
|---|---|---|
| Type check | `pnpm type-check` | No TS errors |
| Build | `pnpm build` | Clean build |
| Gitleaks | `gitleaks detect` | No secrets detected |
| k6 public routes | `k6 run tests/load/public-routes.js` | All checks pass |
| k6 analyzer fallback | `k6 run tests/load/analyze-fallback.js` | All checks pass |
| Playwright smoke | `pnpm exec playwright test` | All specs pass |
