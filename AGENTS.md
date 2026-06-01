# AGENTS.md — CheckRay AI Coding Agent Guide

Last updated: June 2026

**Every AI coding agent working on CheckRay must read this file first and follow it completely.**

This is the master instruction file for AI coding agents (Claude Opus/Code, Codex, Cursor, OpenCode, GitHub Copilot, etc.). It covers the product mission, risk-scoring philosophy, scope guardrails, safe-logging rules, kill switches, and the test/deploy workflow. When this file conflicts with a casual user request, surface the conflict and ask before proceeding.

Related docs (read before touching the area):

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — full system map
- [docs/CRITICAL_FLOWS.md](docs/CRITICAL_FLOWS.md) — flows that must never break
- [docs/SECURITY_BOUNDARIES.md](docs/SECURITY_BOUNDARIES.md) — hard security rules
- [docs/SCHEMA_CONTRACTS.md](docs/SCHEMA_CONTRACTS.md) — stable API response shapes
- [docs/ANALYZER_EVALS.md](docs/ANALYZER_EVALS.md) — analyzer eval harness
- [docs/ANALYZER_GUIDELINES.md](docs/ANALYZER_GUIDELINES.md) — scoring rubric
- [docs/ANALYZER_JOB_ACCURACY_NOTES.md](docs/ANALYZER_JOB_ACCURACY_NOTES.md) — job/ghost-job calibration notes
- [docs/INBOUND_EMAIL_SETUP.md](docs/INBOUND_EMAIL_SETUP.md) · [docs/INBOUND_EMAIL_TESTING.md](docs/INBOUND_EMAIL_TESTING.md) — email receive/reply/save flow
- [docs/CHANGE_REVIEW_CHECKLIST.md](docs/CHANGE_REVIEW_CHECKLIST.md) — checklist for every change
- [docs/PRE_DEPLOY_CHECKLIST.md](docs/PRE_DEPLOY_CHECKLIST.md) — before any production deploy

---

## 1. Product mission

CheckRay is an email and job-scam risk analyzer. It helps users detect **job scams, phishing, fake recruiters, fake checks/invoices, credential theft, suspicious payments, ghost jobs, and dangerous links** before they act on them. Users forward a suspicious email or paste a message/job/link; "Ray" returns a calibrated risk readout with red flags, recommended actions, and a safe reply.

Tech: **Next.js 13 App Router · TypeScript · Tailwind · Supabase (DB + auth) · OpenAI (Vercel AI SDK) · Stripe · Resend (inbound/outbound email) · pnpm · Vercel**.

### Highest priority: calibrated risk scoring

Protect user trust through **evidence-based** classification.

- **False HIGH/Critical results destroy confidence** — users stop trusting Ray and ignore real warnings.
- **False LOW results can cause real harm** — a missed scam costs someone money or credentials.
- **Do not optimize for scary output. Optimize for evidence.** Never inflate a score to "be safe." Never suppress a real danger signal to "look calm."

---

## 2. Risk classification principles

Risk levels and score bands (keep in sync with `lib/analyzer/risk-floors.ts` and `lib/analyzer/types`):

| Level | Score band | Meaning |
|---|---|---|
| `low` | 0–24 | No concrete danger evidence |
| `medium` | 25–59 | Some concern / unverified / ghost-job signals |
| `high` | 60–84 | Strong scam indicators |
| `very_high` (Critical) | 85–100 | Active, concrete scam in progress |
| `needs_more_info` | n/a | Not enough text to classify; ask for more |

**Evidence, not vibes.** A classification must be defensible from concrete content in the message. If you cannot point at the exact phrase that justifies the level, the level is wrong.

### Analyzer pipeline (know this before editing scoring)

```
analyzeCase()                      lib/checkmate.ts  (AI path, server-only)
  └─ finalizeWithFloors()
       ├─ applyRedFlagFloors()     deterministic floors — can only RAISE a score
       ├─ applyOfficialListingCap()the ONLY mechanism that can LOWER an AI over-score
       └─ finalizeAnalysis()
buildFallbackAnalysis()            deterministic pipeline used when AI is unavailable
```

- **Floors only raise; the official-listing cap only lowers.** Adding a floor can never reduce a false HIGH — only the cap (or fixing the floor's trigger) can.
- Negation handling lives in `buildNegationStrippedText` (`lib/analyzer/risk-floors.ts`). Multi-line/bulleted "we will never ask for…" disclaimers must be flattened before negation stripping, or legit listings get force-flagged. This is a known historical false-positive source — see `docs/ANALYZER_JOB_ACCURACY_NOTES.md`.

---

## 3. HIGH / Critical evidence requirements

Only assign **HIGH** or **Critical** when the message contains concrete danger evidence, such as:

- credential theft / login-link mismatch / fake verification page
- a payment request (wire, ACH, Zelle, CashApp, Venmo, gift card, crypto/USDT)
- a bank-detail change request ("update our payee/account")
- a fake invoice or fake check / overpayment scheme
- an equipment/onboarding "deposit" or upfront-fee request
- a suspicious attachment or executable
- impersonation of a real company/person with an actionable ask
- an urgent threat **combined with** a requested action
- moving the conversation to WhatsApp/Telegram/Signal **to then request money/info**

Critical (`very_high`, ≥85) is for an **active** scam request in the message — a concrete demand for money, credentials, or sensitive PII.

---

## 4. False-positive prevention rules

**Do NOT** mark a message HIGH/Critical for any of these alone:

- the sender is unknown
- the email contains links
- the message is urgent
- it mentions a job or recruiting
- it uses HTML / rich formatting
- it asks for a reply
- it is sales / recruiting / marketing
- it merely *mentions* scam terms inside a **negated safety disclaimer** ("we will never ask for gift cards, crypto, or your SSN") — negated mentions are not requests
- it is an official listing (verified careers domain / known ATS like Greenhouse, Lever, Ashby) with no active request

Specific guardrails already in code — do not regress them:

- **Negation guard:** negated scam terms must be stripped before floors fire. A bulleted/multi-line "does not ask for: …" list must not produce "requests SSN / Zelle / gift card" red flags.
- **Official-listing safe harbor:** an official listing with **no active scam request** caps to `low` and clears invented red flags (`isOfficialListingSafe` / `applyOfficialListingCap`). It must **not** cap when a genuine active request is present (e.g., "posted on our official site — now send a $300 Zelle deposit").
- **Ghost-job lane:** vague/reposted listings with no active money/info request cap at **medium** ("worth verifying"), never HIGH/Critical.

Any change to these paths **requires** a regression eval that encodes the exact case (see §8).

---

## 5. Files that are dangerous to edit (stop and get a clear reason)

Treat edits to these as high-risk; make the smallest change, explain why, and prefer to ask first:

- `lib/checkmate.ts` — core AI analyzer (server-only; imports `server-only`)
- `lib/analyzer/risk-floors.ts` — deterministic floors, negation stripping, official-listing cap
- `lib/analyzer/*` / `lib/checkray-core/*` — scoring, safe wording, fallback
- `lib/ai/ray-guidelines.ts` (AI prompt) — never rely on prompt-only fixes when deterministic post-processing is needed
- `auth.ts`, `middleware.ts` — must never throw; return `null` / pass-through on error
- `lib/billing/*`, Stripe webhook + checkout routes — billing/entitlement
- `app/api/inbound/email/route.ts` + `lib/billing/inbound-reply-email.ts` — email receive/reply/save
- `lib/db/save-case.ts`, `lib/db/save-report.ts`, `lib/db/log-usage-event.ts`, `lib/db/user-lookup.ts` — persistence
- `supabase/migrations/*` — schema (see §7)
- `lib/db_types.ts` — generated Supabase types; regenerate from schema, don't hand-edit to mask drift

### Service-role is intentional in some paths

`app/api/inbound/email/route.ts` legitimately uses the **service-role** Supabase client because inbound email has **no user session**. This is correct and must be preserved — do **not** "harden" it by removing service-role or routing it through RLS; that breaks dashboard saves. The blanket "no service_role bypass" rule in §6 applies to **user-facing, session-backed** queries, not to server-only webhooks/cron.

---

## 6. Security & secrets

- **Never hardcode secrets.** No OpenAI, Stripe, Supabase, Sentry, Resend, Twilio, or Vercel keys in source. Use Vercel env vars; `.env.local` is gitignored. For CI stubs use an obvious placeholder (`placeholder-build-stub`) with `# gitleaks:allow`.
- **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** It must never appear in client components, `NEXT_PUBLIC_*` vars, the Chrome extension, or anything bundled client-side.
- **RLS is the security boundary for user-facing data.** Every user-data table has Row Level Security. Do not add service-role bypasses for session-backed user queries. (Server-only webhooks like inbound email are the documented exception — see §5.)
- **Public marketing pages must always render** even with no env vars: `lib/env.ts` only warns (never throws); `auth.ts` returns `null` on error; `middleware.ts` is try/catch-wrapped and only runs on protected routes.
- **Rate/usage limits stay in place** — the web `analyze-case` rate limit and the inbound monthly usage gate (`canCreateCheck` / `usage_events`) must not be removed or bypassed. Blocked senders must be rejected **before** any OpenAI call (no quota burn).

---

## 7. Supabase / Vercel / Stripe cautions

### Supabase

- **Schema changes require a migration** in `supabase/migrations/` (timestamped, applied in order). Never alter the live schema out of band.
- **Apply migrations to production before/with the deploy that needs them.** Schema drift is the #1 cause of "analysis works but couldn't save to dashboard": the inbound insert references a column/constraint the live DB lacks (e.g., `cases.source`, the `'email'` category, or the `needs_more_info` risk level). Run `supabase db push` against prod and verify. See `docs/INBOUND_EMAIL_TESTING.md`.
- After a schema change, regenerate `lib/db_types.ts` so types match reality.

### Vercel

- All `NEXT_PUBLIC_*` vars are baked in at **build time** — changing them requires a new deploy.
- A green Vercel deploy does **not** imply the DB is migrated. Verify migrations separately.

### Stripe

- Do not change Stripe keys, price IDs, webhook secrets, checkout, or entitlement logic unless the task is explicitly about billing and the user approves. Billing changes can silently revoke or grant paid access.

---

## 8. Analyzer eval requirements

Before changing analyzer behavior:

1. Read the analyzer flow (§2) and identify every forced-HIGH path.
2. **Add a regression eval that fails on the current bug** in `scripts/run-analyzer-evals.ts` (section J holds the job/email regressions). Encode the **exact** real-world text and format — multi-line and bulleted, not a single clean line — because most false positives only reproduce on realistic formatting.
3. Each eval case should assert `allowedLevels` / `forbiddenLevels`, `min/maxScore`, and `forbiddenPhrases` (e.g., a legit listing must never produce "requests SSN", "Zelle/payment app request", "recruiter moved conversation to messaging app").
4. Preserve true scam detection — keep adversarial cases (official-listing claim + real Zelle/SSN demand → Critical) so a fix can't over-correct.
5. Run the full suite and require **0 failures**:

   ```bash
   pnpm run analyzer:eval
   ```

   (`scripts/run-analyzer-evals.ts` via `tsx`. Note: `tsx` is a native binary and will not run in some sandboxed Linux CI shells; in that case compile `lib/**` + the script with `tsc` and run the emitted JS. Do not weaken a test just to make it run.)

Never ship an analyzer change without a green eval run that includes a case for the specific behavior you changed.

---

## 9. Safe logging rules

CheckRay handles forwarded scam emails — treat all message content as sensitive.

**Never log:**

- full email bodies or pasted message text (or substrings of scam content)
- full sender/recipient email addresses (mask them — `jo***@e***.com`)
- the case **title/subject** (it is derived from the email subject)
- secrets, tokens, signing keys, or API keys
- a Postgres/PostgREST error's `details` or `hint` — on a constraint violation these echo the **failing row's values** (which include the title/subject). Log only `error.code` and `error.message`.

**Safe to log:** booleans and counts (`userFound`, `userIdPresent`, `saveAttempt`, `saveSuccess`, `red_flag_count`), lengths (`body_len`, `combined_len`), category/score/level, the case UUID, masked sender, and the safe error `code: message`. Follow the existing patterns in `app/api/inbound/email/route.ts` (the `[inbound/email] save summary …` line) and the `lib/db/save-*` helpers' `onDbError` sink.

---

## 10. Required test commands (after every change)

```bash
pnpm run type-check                 # tsc --noEmit — must be 0 errors
pnpm run build                      # next build — must complete cleanly
gitleaks detect --source .          # must report no leaks
pnpm run analyzer:eval              # required if anything in the analyzer path changed
```

If routes changed: `pnpm run load:smoke`. If the analyzer/fallback changed: `pnpm run load:analyze:fallback`.

Then summarize: exact files changed, what each change does, the risk level of each change, and the test results.

---

## 11. Deployment rules

- **Never deploy to Vercel** unless the user explicitly says "deploy to Vercel" / "run vercel --prod".
- **Never run `vercel`, `vercel --prod`, or `vercel deploy`** without explicit authorization.
- **Never push to `main`** unless the user explicitly says "push to main". Otherwise work locally or on a feature branch; do not push at all unless asked.
- **Never run destructive commands** (`DROP TABLE`, `DELETE … ` without `WHERE`, `rm -rf` on source, `git push --force`).
- When a change needs a migration, the deploy plan must include applying it to prod (§7).

---

## 12. Kill switches — STOP and ask before:

- weakening or globally disabling scam detection (lowering floors, removing red-flag triggers, broadening the official-listing/ghost-job caps)
- changing billing, Stripe, auth, Supabase auth, beta-access, or entitlement logic
- changing the Supabase schema without a migration
- removing or bypassing rate/usage limits
- logging full email bodies, full email addresses, tokens, or secrets (§9)
- sending real emails/texts to real users (test against a controlled address)
- changing the `/api/analyze-case` response shape or removing a required field
- broad refactors of analyzer, billing, auth, or inbound-email code

If a request implies any of the above, name the kill switch, explain the risk, and get explicit confirmation first.

---

## 13. Beta launch priorities

In priority order for the current beta:

1. **Calibrated accuracy** — no false Critical on legit official listings; no missed active scams. Every analyzer change carries a regression eval.
2. **Inbound email reliability** — approved senders' checks analyze **and** save to the dashboard; the reply shows "Open the full report" only when a case actually saved; the save-failed message is preserved when it doesn't. Keep prod migrations applied.
3. **Trust & tone** — informational language only ("may", "appears to", "worth verifying"); never "definitely safe" / "definitely a scam"; the disclaimer lives only in `components/footer.tsx`.
4. **Access correctness** — approved = active `beta_access` OR active/trialing `user_billing`; non-approved senders are blocked before analysis; quota is never consumed by blocked senders.
5. **Safety & privacy** — masked logging everywhere; no secrets; service-role confined to server-only paths.
6. **Stability of public pages** — homepage/pricing/legal render with zero env vars.

Smallest safe change that satisfies the priority wins. Prefer deterministic post-processing over prompt-only fixes when correctness matters.

---

## 14. Reviewer prompt (run as a second pass before committing)

> "Review the latest CheckRay changes as a senior engineer. Do not make new feature changes. Check whether the diff preserves the architecture, critical flows, auth, billing, analyzer schema, Supabase RLS/security, env handling, safe-logging rules, cost/usage controls, and production readiness. Confirm any analyzer change ships with a regression eval and that scam detection is not weakened. Identify blockers, risks, missing tests, and the exact files that need fixes. Reference docs/CHANGE_REVIEW_CHECKLIST.md and AGENTS.md."
