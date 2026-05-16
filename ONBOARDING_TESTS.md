# CheckRay Onboarding & MVP Flow Tests

Use this doc to manually verify the full user journey before launch.
Run through every section in order with a fresh browser (no session).

---

## Prerequisites

1. `pnpm dev` running on http://localhost:3000
2. A real Supabase project with the schema from `supabase/setup_checkray_on_audia.sql` applied
3. Email confirmation **disabled** in Supabase Auth settings (Auth > Providers > Email > "Confirm email" toggle OFF) for fast MVP testing
4. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local`
5. `OPENAI_API_KEY` set in `.env.local`

---

## 1. Anonymous User — Run a Check

**Goal:** Guest can run a check and see results without an account.

Steps:
1. Open http://localhost:3000 in an incognito/private window
2. Click "Try a free check" in the hero
3. Confirm you land on `/try`
4. Paste this job scam text in the textarea:
   ```
   Congratulations! You have been selected for a remote data entry position at $55/hr.
   No experience needed. We will send you a check to purchase your home office equipment.
   Reply with your full name, address, and bank details to get started.
   ```
5. Leave URL blank, category set to "Not sure"
6. Click **Ask Ray**

Expected:
- [ ] Button shows "Ray is checking for common red flags…" during analysis
- [ ] Result appears with risk score 85–98 and risk level "Very High" or "High"
- [ ] Summary, red flags, recommended actions, and disclaimer are all visible
- [ ] A green "Create a free account to save this result" card appears below the report
- [ ] NO crashes, no 500 errors, no blank screen

---

## 2. Anonymous User — Save CTA

**Goal:** Guest sees a save prompt and can navigate to sign-up.

Steps (continuing from Test 1):
1. Scroll to the save CTA card below the report
2. Confirm it reads "Create a free account to save this result"
3. Click **Create free account**

Expected:
- [ ] Redirected to `/sign-up?next=%2Fcases%2Fnew`
- [ ] Sign-up form is visible

---

## 3. Sign-Up Flow

**Goal:** New user can create an account.

Steps (continuing from Test 2):
1. Enter a test email (e.g. `test+ray1@yourdomain.com`) and a password (8+ chars)
2. Check the consent checkbox
3. Click **Sign Up**

Expected (if email confirmation is OFF):
- [ ] Redirected to `/cases/new` (the `?next=` param is respected)
- [ ] No error toast

Expected (if email confirmation is ON):
- [ ] Toast: "Check your inbox to confirm your email address!"
- [ ] Redirected to dashboard (unauthenticated view — sign in prompt shown)
- [ ] After clicking the email link, session is established

---

## 4. Logged-In User — Run a Check and Save

**Goal:** Authenticated user's check saves to Supabase and links to the dashboard.

Steps:
1. Sign in or continue from step 3 (you should be on `/cases/new`)
2. Paste this phishing text:
   ```
   Your EZPass account has been suspended due to an unpaid toll balance of $3.85.
   To avoid a $45 late fee, pay immediately: https://ezpass-tolls.com/pay
   ```
3. Select category "Suspicious link or URL"
4. Click **Ask Ray**

Expected:
- [ ] Report shows risk level "High" or "Very High"
- [ ] Small "✓ Saved to your account. view full case page" line appears below the report
- [ ] A **Dashboard** button appears in the header row of the report

---

## 5. Dashboard — Saved Check Appears

**Goal:** Saved checks appear in the dashboard list.

Steps:
1. Click **Dashboard** button or navigate to `/dashboard`

Expected:
- [ ] Page shows the check from Test 4 in the "Recent checks" list
- [ ] Row shows: case title (first ~72 chars of input), category badge, risk score, risk level badge, date, "Open" button
- [ ] Stats cards at the top show: total checks ≥ 1, high risk count, average score
- [ ] NO empty state ("No checks yet") — the check is visible

---

## 6. Case Detail Page

**Goal:** Saved case detail page renders the full report.

Steps:
1. Click **Open** on any row in the dashboard, or click the link from Test 4's "view full case page"

Expected:
- [ ] URL is `/cases/[uuid]`
- [ ] Case header shows: risk badge, category, status, title, risk score /100, date
- [ ] "Show submitted content" expander shows the original pasted text
- [ ] Full risk report (summary, red flags, recommended actions, safer reply, disclaimer) is shown below
- [ ] "Check another" and "Back to dashboard" buttons work

---

## 7. Sign-In Flow (Returning User)

**Goal:** Existing user can sign in and reach the dashboard.

Steps:
1. Open a new incognito window
2. Navigate to `/sign-in`
3. Enter the same credentials from Test 3

Expected:
- [ ] Redirected to `/dashboard`
- [ ] Previously saved checks are visible

---

## 8. Dashboard Empty State

**Goal:** New user with no checks sees the correct empty state.

Steps:
1. Sign in with a fresh account that has no checks

Expected:
- [ ] "No checks yet" heading is shown
- [ ] Body: "Paste a suspicious message, invoice, job offer, rental listing, or URL and ask Ray to check it for red flags."
- [ ] "Ask Ray for your first check" button navigates to `/cases/new`

---

## 9. Unauthenticated Dashboard Access

**Goal:** Unauthenticated user who navigates directly to `/dashboard` sees sign-in CTA.

Steps:
1. Open incognito window, go to `/dashboard`

Expected:
- [ ] GlassCard shown with "Ask Ray before you reply, click, pay, or share." headline
- [ ] "Sign in" and "Create account" buttons are present and functional

---

## 10. Unauthenticated Case Detail Access

**Goal:** Guest who visits a `/cases/[id]` URL is redirected to sign-in.

Steps:
1. Open incognito window, navigate to any `/cases/some-uuid`

Expected:
- [ ] Redirected to `/sign-in?next=/cases/some-uuid`
- [ ] After signing in, redirected back to the case

---

## 11. API Smoke Tests (curl)

Run from a terminal. Adjust `PORT` if needed.

### Anonymous — job scam (expect very_high)
```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"We will send you a check to buy equipment. Reply with your bank details."}' \
  | jq '{risk_level: .report.risk_level, risk_score: .report.risk_score, saved: .saved}'
```
Expected: `risk_level: "very_high"`, `risk_score: 85–100`, `saved: false`

### Anonymous — phishing link (expect high/very_high)
```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_url":"https://ezpass-tolls.com/pay", "input_text":"Your EZPass has an unpaid toll. Pay now to avoid fees."}' \
  | jq '{risk_level: .report.risk_level, risk_score: .report.risk_score, saved: .saved}'
```
Expected: `risk_level: "high"` or `"very_high"`, `saved: false`

### Anonymous — low risk (expect low/medium)
```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"Hi, can we schedule a 30-minute call this Thursday to discuss the project?"}' \
  | jq '{risk_level: .report.risk_level, risk_score: .report.risk_score}'
```
Expected: `risk_level: "low"` or `"medium"`, score < 50

### Validation — empty body (expect 400)
```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.error'
```
Expected: `"Provide pasted text, a URL, or both."`

---

## Supabase SQL Required Before Launch

If the DB was set up from the initial migration only, run **`supabase/setup_checkray_on_audia.sql`** in the Supabase SQL Editor. This is safe to re-run.

Key things it ensures:
- `cases.input_text`, `cases.input_url`, `cases.input_type`, `cases.source` columns exist
- `cases` category constraint includes `'email'` (without this, email-category saves fail silently)
- `risk_reports.user_id`, `risk_reports.category`, `risk_reports.model_used` columns exist
- `usage_events.case_id`, `usage_events.anonymous_id` columns exist
- All RLS policies are in place
- `handle_new_auth_user` trigger exists so new sign-ups auto-create a `public.users` row

---

## Remaining Known Gaps (Post-MVP)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | After guest check + sign-up, user lands on blank `/cases/new` not their previous result | Minor UX friction | Store last result in localStorage and restore on mount |
| 2 | No password reset flow | Medium | Add `/forgot-password` page using Supabase `resetPasswordForEmail` |
| 3 | Email confirmation redirect shows dashboard unauthenticated briefly | Minor | Already shows sign-in prompt; acceptable for MVP |
| 4 | Hero phone video not loading | Visual only | Tracked separately; does not affect product flow |
