# docs/CHANGE_REVIEW_CHECKLIST.md — Pre-Merge Review Checklist

Use this checklist before merging any change into the main branch. AI agents should run through every section when reviewing a diff.

---

## A. Scope

- [ ] What is this change supposed to do? _(Write it in one sentence.)_
- [ ] What files were changed? _(List them.)_
- [ ] Is the scope narrow and focused, or does it touch unrelated areas?
- [ ] Did this change touch any of the following high-risk areas?
  - [ ] Auth / session handling (`middleware.ts`, `auth.ts`, sign-in/sign-up routes)
  - [ ] Billing (`lib/billing/`, `/api/billing/`, `user_billing` table)
  - [ ] Database schema (`supabase/migrations/`)
  - [ ] Security boundaries (`lib/env.ts`, server-only files)
  - [ ] Analyzer (`app/api/analyze-case/`, `lib/checkmate.ts`)
  - [ ] Public/unauthenticated pages

---

## B. Critical flows — does anything break?

Work through [CRITICAL_FLOWS.md](CRITICAL_FLOWS.md). For each affected area:

- [ ] **Homepage** — does it still load without private env vars?
- [ ] **Sign-up** — does new user registration still work end-to-end?
- [ ] **Sign-in** — does existing user login still work?
- [ ] **Dashboard** — does it load for an authenticated user with cases?
- [ ] **New case → analyzer** — does submitting content return a full risk report?
- [ ] **Case detail / saved report** — does `/cases/[id]` render correctly?
- [ ] **Anonymous free check** — does unauthenticated `/try` still work once?
- [ ] **Shareable report** — does `/share/[id]` load without auth?
- [ ] **Admin gating** — are admin routes still blocked for non-admin users?
- [ ] **Stripe webhook** — if billing code changed, is the webhook handler still correct?

---

## C. Security review

- [ ] Were any new environment variables added?
  - [ ] If yes: are server-only secrets kept out of client code?
  - [ ] If yes: are they documented in `AGENTS.md` env table?
- [ ] Is `SUPABASE_SERVICE_ROLE_KEY` used anywhere it wasn't before?
  - [ ] If yes: is it behind a proper admin auth check?
- [ ] Does any new code reference a private env var in a Client Component or public page?
- [ ] Were any new Supabase tables added?
  - [ ] If yes: do they have RLS enabled with correct policies?
- [ ] Are there any new server logs that could capture PII or sensitive report content?
- [ ] Does the diff expose any new attack surfaces (unvalidated input, open redirects, SSRF)?
- [ ] Does `gitleaks detect` pass cleanly on the current branch?

---

## D. Schema and contract review

- [ ] Did the `/api/analyze-case` response shape change?
  - [ ] If yes: is every field in [SCHEMA_CONTRACTS.md](SCHEMA_CONTRACTS.md) still present?
  - [ ] If yes: were k6 assertions updated?
  - [ ] If yes: was the Chrome extension updated?
- [ ] Did any Supabase table schema change?
  - [ ] If yes: is there a migration file for it?
  - [ ] If yes: is the migration safe to run on a live database (no data loss)?
- [ ] Did any TypeScript type change in `lib/types.ts` or `lib/db_types.ts`?
  - [ ] If yes: does `pnpm type-check` still pass?
- [ ] Was the `disclaimer` field removed or made optional anywhere? _(It must always be present.)_

---

## E. Scale and cost review

- [ ] Does this change make more OpenAI API calls than before?
  - [ ] If yes: is the per-user rate limit still in place?
- [ ] Does this change bypass usage limits for any tier?
- [ ] Are there any new database queries that could be unbounded (no LIMIT, no user_id filter)?
- [ ] Does this change add any new background jobs, cron jobs, or scheduled tasks?
  - [ ] If yes: what is the cost/call frequency at 1,000 users? 10,000 users?
- [ ] Are there any new real-money operations (Stripe charges, SMS, email sends) that aren't rate-limited?

---

## F. Test coverage

Run all of these before merging:

```bash
pnpm type-check
pnpm build
gitleaks detect
k6 run tests/load/public-routes.js
k6 run tests/load/analyze-fallback.js
pnpm exec playwright test
```

- [ ] `pnpm type-check` — passes with zero errors
- [ ] `pnpm build` — clean build, no warnings that weren't there before
- [ ] Gitleaks — no secrets detected
- [ ] k6 public routes — all checks pass
- [ ] k6 analyzer fallback — all checks pass
- [ ] Playwright smoke — all specs pass
- [ ] Manual check: load `/` in browser, confirm homepage renders
- [ ] Manual check: load `/sign-in`, confirm form renders
- [ ] Manual check: submit a test case through the analyzer, confirm result renders

---

## G. Final gate

- [ ] Has another person (or AI reviewer using the prompt in [AI_REVIEW_WORKFLOW.md](AI_REVIEW_WORKFLOW.md)) reviewed this change?
- [ ] Are there any TODOs or commented-out code left in the diff that shouldn't be there?
- [ ] Is the commit message clear and accurate?
- [ ] Is this safe to deploy to production right now? _(If not, list what's missing.)_
