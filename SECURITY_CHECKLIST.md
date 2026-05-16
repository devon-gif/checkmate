# CheckRay Security Checklist

Review this list before any production deployment. Items are grouped by layer.
Legend: ✅ Done in current codebase  |  ⬜ Not yet implemented  |  ⚠️ Partial / review needed

---

## 1. API Route — `/api/analyze-case`

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Request body validated with Zod before any processing | ✅ | `requestSchema` in route.ts — rejects on invalid JSON, unknown fields, oversized strings |
| 1.2 | `input_text` capped at 20 000 chars | ✅ | `z.string().max(20_000)` |
| 1.3 | `input_url` capped at 2 000 chars | ✅ | `z.string().max(2_000)` |
| 1.4 | `category_hint` restricted to known enum values | ✅ | `z.enum([...caseCategories])` |
| 1.5 | Empty-body request returns 400, not 500 | ✅ | Explicit check after Zod parse |
| 1.6 | Session check before AI call (rate limit gates compute) | ✅ | `auth()` called before `analyzeCase()` |
| 1.7 | Authenticated users rate-limited to 25 checks / 24 h | ✅ | `usage_events` COUNT query; returns 429 |
| 1.8 | Guests always get a result (no crash for anonymous users) | ✅ | Deterministic fallback runs for all paths |
| 1.9 | DB failures do not swallow the analysis result | ✅ | `try/catch` around all Supabase writes; falls back to `saved: false` |
| 1.10 | No stack traces or internal error details sent to client | ✅ | Only `{ error, detail }` returned; full error logged to server console |
| 1.11 | `server-only` import guard on AI analyzer module | ✅ | `import 'server-only'` at top of `lib/checkmate.ts` |
| 1.12 | CORS headers restricted (not wildcard) | ⬜ | Next.js defaults; add explicit `Access-Control-Allow-Origin` header for production if exposing the API to third parties |
| 1.13 | Content-Type enforcement on POST | ⬜ | Currently relies on `req.json()` throwing on bad content — consider adding explicit `Content-Type: application/json` check |
| 1.14 | Guest rate limiting (IP-based) | ⬜ | Guests bypass the 25/day counter. Add Upstash Ratelimit on IP for production to prevent AI-cost abuse |

---

## 2. Authentication

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Supabase Auth used for all user sessions | ✅ | `@supabase/auth-helpers-nextjs` + `auth()` helper |
| 2.2 | Middleware redirects unauthenticated users on protected routes | ✅ | `PROTECTED_PREFIXES` list in `middleware.ts` |
| 2.3 | `/try` and `/` are always public | ✅ | Not in `PROTECTED_PREFIXES` |
| 2.4 | Session cookie is `HttpOnly` | ✅ | Set by Supabase Auth library — not accessible from JS |
| 2.5 | `SUPABASE_SERVICE_ROLE_KEY` never exposed client-side | ✅ | Only used in server-side routes; not in any `NEXT_PUBLIC_` env var |
| 2.6 | Email/password auth uses Supabase's built-in secure hashing | ✅ | Passwords never stored in application code |
| 2.7 | Password reset flow tested | ⬜ | Not yet verified end-to-end |
| 2.8 | OAuth providers configured with correct redirect URIs | ⬜ | Verify in Supabase dashboard before launch |

---

## 3. Database (Supabase / Postgres)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Row Level Security (RLS) enabled on all tables | ✅ | Set in migrations; users can only read/write their own rows |
| 3.2 | Users can only read their own `cases` | ✅ | RLS policy `cases_user_id = auth.uid()` |
| 3.3 | Users can only read their own `risk_reports` | ✅ | RLS policy via `case_id → cases.user_id` |
| 3.4 | Users can only read their own `usage_events` | ✅ | RLS policy `usage_events_user_id = auth.uid()` |
| 3.5 | `case_messages` restricted to case owner | ✅ | Via RLS on `case_messages.user_id` |
| 3.6 | Anon key cannot access admin-level tables | ✅ | Service role key never used in client-facing routes |
| 3.7 | `input_text` in `cases` table has no index (PII in DB) | ⚠️ | Submitted text is stored verbatim. Consider encryption-at-rest policy or a separate encrypted column for PII-heavy content. |
| 3.8 | Database backups enabled | ⬜ | Verify in Supabase dashboard → Settings → Backups |
| 3.9 | Connection pooler (PgBouncer) configured for production load | ⬜ | Default Supabase pooler is on — verify `SESSION` vs `TRANSACTION` mode for your usage pattern |

---

## 4. AI / OpenAI Integration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | `OPENAI_API_KEY` is a server-only environment variable | ✅ | Not prefixed `NEXT_PUBLIC_` |
| 4.2 | Deterministic fallback runs if OpenAI is unavailable | ✅ | `analyzeCase()` catches errors and calls `buildFallbackAnalysis()` |
| 4.3 | Model name is configurable via env var | ✅ | `CHECKMATE_ANALYZER_MODEL` — defaults to `gpt-4o-mini` |
| 4.4 | Prompt injection mitigated by structured output (`generateObject`) | ✅ | Zod schema enforced on AI output; freeform prose in structured fields only |
| 4.5 | AI output always has disclaimer overwritten to canonical string | ✅ | `disclaimer: ANALYSIS_DISCLAIMER` hardcoded after AI response |
| 4.6 | AI output validated against `riskAnalysisSchema` (Zod) | ✅ | `generateObject` + schema — malformed AI output throws, triggers fallback |
| 4.7 | Submitted user text is not logged to OpenAI beyond the API call | ✅ | No additional logging; check OpenAI dashboard for data retention policy |
| 4.8 | OpenAI usage limits / spend cap configured | ⬜ | Set a spend cap in the OpenAI dashboard to avoid runaway costs |
| 4.9 | Prompt confidential information policy reviewed | ⬜ | If users paste real SSNs, bank account numbers, etc. — those go to the OpenAI API. Add UI warning and consider redacting PII patterns before sending. |

---

## 5. Frontend / Client-Side

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | No API keys or service secrets in client bundle | ✅ | `server-only` guard on `lib/checkmate.ts`; all secrets are server env vars |
| 5.2 | User-provided content rendered as text, not raw HTML | ✅ | React renders strings as text nodes by default; no `dangerouslySetInnerHTML` with user data |
| 5.3 | Legal disclaimer displayed in UI on every risk report | ✅ | `LegalDisclaimer` component used on dashboard, case detail, and `/try` |
| 5.4 | ANALYSIS_DISCLAIMER always present in API response | ✅ | `reportPayload.disclaimer` is always set before returning |
| 5.5 | XSS via markdown rendering | ⬜ | `components/markdown.tsx` uses `react-markdown` — verify `rehypeRaw` is not enabled or that `sanitize: true` is set |
| 5.6 | CSP headers configured | ⬜ | Add `Content-Security-Policy` header in `next.config.js` for production |

---

## 6. Legal / Compliance

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Disclaimer copy uses safe language (may/possible/informational) | ✅ | `ANALYSIS_DISCLAIMER`, system prompt, and fallback summaries all use hedged language |
| 6.2 | Ray never claims certainty ("definitely a scam") | ✅ | System prompt has explicit NEVER rules; fallback uses `may`, `possible`, `common red flags` |
| 6.3 | Ray never claims to be a lawyer / financial / medical advisor | ✅ | System prompt rules + disclaimer |
| 6.4 | Acceptable Use Policy page exists | ✅ | `/acceptable-use` route |
| 6.5 | Privacy Policy page exists | ⬜ | Add before public launch — required for any app storing user-submitted content |
| 6.6 | Terms of Service page exists | ⬜ | Add before public launch |
| 6.7 | GDPR / CCPA data deletion flow | ⬜ | Users need a way to delete their account and all associated cases/reports |
| 6.8 | Cookie consent banner | ⬜ | Required for EU users if using analytics cookies |

---

## 7. Infrastructure / Deployment

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Environment variables set in Vercel dashboard | ⬜ | Confirm all vars in `.env.local` are added to Vercel project settings |
| 7.2 | `NEXT_PUBLIC_SITE_URL` set for correct redirect URIs | ⬜ | Required for Supabase OAuth redirect and email magic link |
| 7.3 | Vercel deployment protection (preview password) | ⬜ | Consider enabling for staging URLs |
| 7.4 | Error monitoring (Sentry or equivalent) | ⬜ | Add before launch — currently server errors only go to `console.error` |
| 7.5 | Logging strategy for production | ⬜ | `console.error` is fine for development; use a structured logger (Pino, etc.) for production |
| 7.6 | Secret scanning enabled on GitHub repo | ⬜ | Enable GitHub secret scanning and push protection on the repo |
| 7.7 | Dependency vulnerability scanning | ⬜ | Run `pnpm audit` regularly; consider Dependabot or Renovate |

---

## 8. Before First Public Launch — Mandatory

These items must be completed before accepting real user data:

- [ ] **Privacy Policy** live at `/privacy`
- [ ] **Terms of Service** live at `/terms`
- [ ] **GDPR data deletion** flow (account delete + cascade)
- [ ] **Guest IP rate limit** via Upstash Ratelimit (prevents AI cost abuse)
- [ ] **OpenAI spend cap** configured in OpenAI dashboard
- [ ] **Supabase backups** verified on
- [ ] **All env vars** confirmed in Vercel production environment
- [ ] **Error monitoring** (Sentry) configured
- [ ] **UI warning** before form: "Do not paste real SSNs, passwords, or bank account numbers."

---

## Running a Security Spot-Check

```bash
# 1. Type check
pnpm tsc --noEmit

# 2. Check for exposed secrets in env (never committed .env.local)
grep -r "OPENAI_API_KEY\|SERVICE_ROLE" app/ components/ lib/ --include="*.ts" --include="*.tsx"
# Expected output: none (secrets only in .env.local / server env vars, never in source)

# 3. Dependency audit
pnpm audit

# 4. Confirm server-only guard is in place
grep -r "server-only" lib/checkmate.ts
# Expected output: import 'server-only'

# 5. Check no dangerouslySetInnerHTML with user data
grep -r "dangerouslySetInnerHTML" components/ app/ --include="*.tsx"
# Review any matches — should not include user-submitted content
```
