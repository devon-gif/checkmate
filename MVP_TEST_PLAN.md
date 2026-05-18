# MVP_TEST_PLAN.md — CheckRay MVP Manual Test Plan

Last updated: May 2026

A short, high-signal manual smoke test for the CheckRay MVP. Run before
every investor / friend demo and after every Vercel deploy.

Prerequisites:
- Local dev server: `npm run dev` (typically `http://localhost:3000`).
- Or production URL after Vercel deploy.
- Optional: a fresh incognito window for anonymous flows.

---

## Canonical test input (used in tests E and F)

Paste this into `/cases/new` or `/try`:

> "You're hired for a remote data entry role. We'll send a check for
> equipment. Deposit it and wire the difference back."

**Expected Ray output:**
- `risk_level`: `very_high`
- `risk_score`: 92–98
- `red_flags` includes: "Fake check or equipment check request",
  "Wire money back request", "Money movement before verified employment".
- `recommended_actions` includes: do not deposit the check, do not send
  money, verify through official careers page.
- `safe_reply`: a non-accusatory message asking for the official posting
  and company-domain email.
- `disclaimer`: present and informational-only language.

---

## Tests

### A. Homepage loads
1. Open `/`.
2. Hero is visible: eyebrow, headline ("A second look before you click,
   pay, or reply."), subheadline, **Start free trial** button, **See how
   Ray works** button, supporting note, phone mockup, orb.
3. Scroll: How it works, Features, Chrome extension, Ways to use, Pricing,
   Start sections all render.
4. **Pass criteria:** no console errors, no 500, no missing hero blocks.

### B. "Start free trial" → signup
1. On `/`, click **Start free trial**.
2. **Pass criteria:** lands on `/sign-up` (not `/cases/new`).

### C. Signup → dashboard
1. On `/sign-up`, create a fresh account (use a real or +tag email).
2. Confirm email if Supabase is configured to require it.
3. Sign in.
4. **Pass criteria:** lands on `/dashboard`. The legal-acceptance modal,
   if shown, can be accepted once and does NOT re-appear after refresh.

### D. Dashboard → New case
1. On `/dashboard`, click **New check** in the header card.
2. **Pass criteria:** lands on `/cases/new` with the form rendered.

### E. Run the canonical fake-check scam test
1. On `/cases/new`, paste the canonical test input above.
2. Optional category hint: "Job post / recruiter message".
3. Click **Ask Ray**.
4. Loading state shows ("Ray is checking for common red flags…").
5. **Pass criteria:** result panel renders with `very_high` risk, the
   red flags listed above, a safer reply, and the informational
   disclaimer.

### F. Result displays
1. With the result from E on screen, confirm:
   - Risk badge color reflects `very_high`.
   - Red flags list, recommended actions, verification steps, safe reply
     all visible.
   - "✓ Saved to your account" with a `view full case page` link (only
     for logged-in users).

### G. Saved report appears on dashboard
1. Click **Dashboard** from the result card (or navigate to
   `/dashboard`).
2. **Pass criteria:** the case appears in **Recent checks** with title,
   risk badge, score, category, and date.

### H. Report detail opens
1. From `/dashboard`, click the case title or **Open**.
2. **Pass criteria:** `/cases/[id]` loads with full report, "Show
   submitted content" expander, follow-up box, and Back/Check another
   buttons.

### I. Free / check-limit gating
1. **Anonymous:** open `/try` in incognito → run a check → run a second
   check. Pass criteria: second submission shows the **You've used your
   free check** gate with "Create free account" / "Sign in" CTAs.
2. **Trial user:** `user_billing.status = 'trialing'`, trial active —
   unlimited during the 7-day window. Pass criteria: no gate.
3. **Basic user (manual DB):** set `user_billing.plan = 'basic'`,
   `status = 'active'`, then insert 25 `usage_events` rows for the
   current month. Next `/cases/new` submission must be blocked with a
   monthly-limit message.
4. **Plus user:** unlimited fair-use, no monthly hard cap.

### J. Pricing page loads
1. Open `/pricing`.
2. **Pass criteria:** Free / Basic ($9.99) / Plus ($19.99) cards render.
   Monthly/Yearly toggle works. CTAs route to `/sign-up` (or Stripe
   checkout if `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO` is configured).

### K. Logout / login round-trip
1. Click avatar → **Sign out** (or visit `/api/auth/...` route used by
   UserMenu).
2. **Pass criteria:** redirected to `/` or `/sign-in`. The header now
   shows logged-out CTAs ("Sign in" + "Try a free check").
3. Sign back in. **Pass criteria:** lands on `/dashboard` with prior
   cases still visible.

---

## Failure handling

If any step fails:
1. Capture the URL, the visible UI, and the browser console + network
   tab error.
2. Check the Vercel function logs for the offending route (most likely
   `/api/analyze-case` or `/dashboard`).
3. The MVP hardening means a missing env should NOT 500 the homepage —
   if it does, that is a regression (see DEPLOY_CHECKLIST.md → "How the
   app degrades when envs are missing").

---

## Out of scope for this test plan

- Stripe checkout end-to-end (covered in `BILLING_TESTS.md`).
- Weekly Scam Watch email delivery (no emails sent yet —
  `NOTIFICATIONS_TODO.md`).
- Chrome extension (positioning copy only at this stage).
- Admin / CRM (none built — `ADMIN_CRM_TODO.md`).
