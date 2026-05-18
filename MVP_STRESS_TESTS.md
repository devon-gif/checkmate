# CheckRay MVP Stress Tests

Run offline: `npm run test:analyzer`
Run full check: `npm run type-check && npm run build`

---

## Manual test checklist

### Core flows

| # | Flow | Expected | Status |
|---|------|----------|--------|
| 1 | Homepage loads | Hero, sections, footer visible | ✓ |
| 2 | "Start free trial" → signup | Routes to /sign-up | ✓ |
| 3 | Signup completes | Redirects to /dashboard | ✓ |
| 4 | Legal acceptance | Terms modal saves once, does not loop | ✓ |
| 5 | Dashboard loads empty | Friendly empty state, no crash | ✓ |
| 6 | New case page loads | Form visible with all fields | ✓ |
| 7 | Submit suspicious text | Spinner → result visible | ✓ |
| 8 | Result shows risk score + red flags + actions + safe reply + disclaimer | All fields rendered | ✓ |
| 9 | Logged-in result saves | "Saved to your account" + case ID | ✓ |
| 10 | Dashboard updates after save | Recent checks shows new entry | ✓ |
| 11 | Report detail page (/cases/[id]) | Full report rendered | ✓ |
| 12 | Logged-out submit | Result shows, no save, guest prompt shown | ✓ |
| 13 | Missing OpenAI key | Fallback analyzer runs, used_fallback: true | ✓ |
| 14 | DB save failure | Result still displayed, save_reason in response | ✓ |

---

## Stress test inputs

### A — Fake-check job scam
**Input:**
> "You're hired for a remote data entry role. We'll send a check for equipment. Deposit it and wire the difference back."

**Expected:**
- risk_level: `very_high`
- risk_score: ≥ 90
- red_flags include: fake check / equipment check request, wire money back
- recommended_actions: do not deposit check, do not send money

**Combo floor:** Triggered. Score clamped to 92 minimum.

---

### B — Toll phishing
**Input:**
> "Final notice: pay your toll balance now or your registration will be suspended. Click http://pay-toll-fast-help.com"

**Expected:**
- risk_level: `very_high` or `high`
- risk_score: ≥ 80
- red_flags include: final notice, suspension threat, lookalike domain

**Combo floor:** Final notice + suspension + URL → score ≥ 85.

---

### C — Landlord fee dispute
**Input:**
> "My landlord charged me $1,248.97 for carpet replacement after move-out and says it was prorated over 60 months. What should I ask for before paying?"

**Expected:**
- risk_level: `low` or `medium`
- risk_score: ≤ 55
- NOT called a scam automatically
- recommended_actions: request itemized bill, verify via official contact

**Note:** No payment-method red flags. Conservative scoring by design.

---

### D — Empty/short input ("hi")
**Input:** `hi`

**Expected:**
- API returns 400 with friendly message: "Input is too short to analyse. Please provide more context."
- Form shows toast with the full message (not error code "validation_error")
- No crash

**Fix applied:** `new-case-form.tsx` now uses `payload.message ?? payload.error`.

---

### E — Huge input (10,000+ characters)
**Input:** 10,001+ characters

**Expected:**
- Form: blocked at `maxLength={10000}` — textarea hard-stops at 10k chars
- API: schema validates max 20,000 chars — returns 422 if bypassed
- No crash, no hang

**Fix applied:** `maxLength={10000}` added to textarea. Character counter appears at 8,000+ chars.

---

### F — Link-only input
**Input text:** (empty)
**URL:** `https://example.com/pay-now`

**Expected:**
- `example.com` has no high-risk signals — low/medium risk
- API accepts URL-only input (submittedUrl path)
- Result shows "verify through official channels" guidance

---

### G — Safe verification message
**Input:**
> "Please send the official job posting and contact me from your company email domain before we continue."

**Expected:**
- risk_level: `low` or `medium`
- risk_score: ≤ 40
- No scam flags triggered (this IS the safe reply pattern)

---

## API reliability audit

| Check | Status |
|-------|--------|
| Input min length validated (< 10 chars → 400) | ✓ |
| Input max length validated (> 20,000 → 422 via Zod) | ✓ |
| category_hint validated against enum | ✓ |
| Score clamped 0–100 (`clampRiskScore`) | ✓ |
| risk_level normalized from score (`normalizeRiskLevel`) | ✓ |
| Disclaimer always included (`ensureDisclaimer`) | ✓ |
| No stack traces in responses (top-level try/catch) | ✓ |
| No env var leakage (no process.env in response) | ✓ |
| AI failure → deterministic fallback (`buildFallbackAnalysis`) | ✓ |
| DB save failure → result still returned | ✓ |

---

## Dashboard reliability audit

| Check | Status |
|-------|--------|
| No session → friendly sign-in card, no crash | ✓ |
| No cases → empty state with CTA | ✓ |
| `cases` query failure → logs error, renders empty list | ✓ |
| `usage_events` table missing → `checksUsedToday` falls back to 0 | ✓ |
| `subscriptions` table missing → billingStatus defaults to 'trialing' | ✓ |
| `notification_preferences` missing → wrapped in try/catch | ✓ |

---

## Auth/legal reliability audit

| Check | Status |
|-------|--------|
| Protected routes redirect cleanly | ✓ |
| Public routes (/, /sign-in, /sign-up) never require login | ✓ |
| Legal/terms modal saves once, does not loop | ✓ |
| Signup redirects to /dashboard | ✓ |

---

## Known issues / remaining blockers

| Issue | Severity | Status |
|-------|----------|--------|
| AI model API key required for full analysis | Low — fallback covers it | Open |
| Stripe not wired — billing cards are informational only | Low | Open |
| SMS/email Ray not built | Low — marketed as "coming soon" | Open |
| Chrome extension not built | Low — marketed as "coming soon" | Open |
| Trusted Circle: copy-only, no actual sharing | Low — by design for MVP | Open |
| Weekly Scam Watch: toggle saves preference but no email sent yet | Medium | Open |

---

## Running the offline test

```bash
npm run test:analyzer
```

Tests 7 cases against the deterministic fallback engine with zero dependencies.
Each case shows: score, risk_level, category, flags, and PASS/WARN/FAIL.
