# SIMULATED_BETA_TESTING.md — Repeatable pre-invite beta testing process

Use this guide to run CheckRay end-to-end as a real user would — before
inviting the next cohort of beta testers. Run through this after any
significant change to the analyzer, email flow, billing, or UI.

---

## Prerequisites

1. Local dev server running: `pnpm dev`
2. Supabase running locally **or** pointed at your staging project.
3. `.env.local` populated (see `docs/VERCEL_ENV_SETUP.md`).
4. `FEEDBACK_SIGNING_SECRET` set (for feedback link tests).
5. `RESEND_API_KEY` set (for email tests — use Resend test mode or a real
   address you control).
6. `ENABLE_ADMIN_TOOLS=true` + `ADMIN_EMAILS=<your email>` set.
7. At least one beta-approved test account and one non-approved account.

---

## Pass / Fail definition

| Result | Meaning |
|---|---|
| **PASS** | Behavior matches the "Expected" column in the checklist exactly |
| **PARTIAL** | Mostly correct but minor cosmetic/copy issue that doesn't block the user |
| **FAIL** | Wrong risk level, silent error, broken redirect, missing UI element, or data not saved |

Record every result. A single FAIL in a critical-path flow (email analysis,
feedback recording, beta gate, usage limit) blocks the release.

---

## 1. Beta request flow

**Goal:** Confirm anyone can request beta access and the admin sees it.

| Step | Action | Expected | Result |
|---|---|---|---|
| 1.1 | Visit `/beta` (not logged in) | Form renders, no auth required | |
| 1.2 | Submit form with a new email, name, use_case | `200 { ok: true }` — success message shown | |
| 1.3 | Submit same email again | Upserts (no duplicate), success message shown | |
| 1.4 | Visit `/admin` → pending requests panel | New request appears | |
| 1.5 | Approve the request via admin panel | `beta_access` row created, request status → `approved` | |
| 1.6 | Re-submit beta form with same email | Request updates without flipping status back to `pending` | |

---

## 2. Signup with beta-approved email

**Goal:** Confirm that after admin approval, the user can sign up and access the app.

| Step | Action | Expected | Result |
|---|---|---|---|
| 2.1 | Sign up at `/sign-up` using the approved email | Account created, redirect to dashboard | |
| 2.2 | Visit `/dashboard` | Loads without error, plan shown as beta | |
| 2.3 | Check `/admin/customers` | User appears, plan correct | |

---

## 3. Email Ray (inbound email analysis)

**Goal:** Confirm Ray receives, analyzes, saves, and replies to a forwarded email.

Use the address `ray@inbound.checkray.app` (or your local equivalent from `INBOUND_EMAIL_ADDRESS`).

| Step | Action | Expected | Result |
|---|---|---|---|
| 3.1 | Forward/send a realistic scam message to the inbound address | Webhook fires, Ray analyzes | |
| 3.2 | Check server logs | `[inbound/email] analysis complete` log line, no errors | |
| 3.3 | Check inbox | Reply email arrives within ~15 seconds | |
| 3.4 | Reply shows risk level + summary | Correct level for the message type | |
| 3.5 | Reply shows top red flags (up to 5) | Relevant to the message | |
| 3.6 | Reply shows safer next step | Clear, specific, actionable | |
| 3.7 | Reply includes "👍 Accurate / 👎 Not right" links | Both links present (if `FEEDBACK_SIGNING_SECRET` set) | |
| 3.8 | Reply includes "Open the full report" button | Button present, correct URL | |
| 3.9 | Case appears in Supabase `cases` table | `source='email'`, correct `risk_level` | |
| 3.10 | Visit `/cases/<id>` in dashboard | Full report loads | |

> If `FEEDBACK_SIGNING_SECRET` is not set: steps 3.7 should show no feedback
> section — that is correct behavior, not a bug.

---

## 4. Dashboard case flow

**Goal:** Confirm the web form analysis saves and displays correctly.

| Step | Action | Expected | Result |
|---|---|---|---|
| 4.1 | Log in, navigate to `/cases/new` | Form renders | |
| 4.2 | Paste a scam message, submit | Analysis runs, redirect to case detail | |
| 4.3 | Case detail shows risk badge, summary, red flags | All populated | |
| 4.4 | Case appears in `/cases` list | Sorted newest-first | |
| 4.5 | Open case → "Open full report" | Report page loads with all fields | |
| 4.6 | Share link (if available) | `/share/<id>` renders without auth | |

---

## 5. Feedback buttons

**Goal:** Confirm thumbs-up and thumbs-down links from email replies work.

| Step | Action | Expected | Result |
|---|---|---|---|
| 5.1 | Click 👍 link from a Ray reply email | Redirect to `/feedback/email?r=ok` | |
| 5.2 | Page shows "Thanks — feedback received." | Branded, no errors | |
| 5.3 | Check Supabase `case_feedback` | Row with `rating='accurate'`, `source='email'` | |
| 5.4 | Click 👎 link from a Ray reply email | Redirect to `/feedback/email?r=form&…` | |
| 5.5 | Form shows 6 reason options + optional note | All options render | |
| 5.6 | Select a reason + enter note, submit | Redirect to `/feedback/email?r=done` | |
| 5.7 | Page shows "Got it — thanks for the detail." | |
| 5.8 | Check Supabase `case_feedback` | Row updated with `reason`, `note` | |
| 5.9 | Click 👍 after already clicking 👎 | Row updated: `rating='accurate'` | |
| 5.10 | Tamper with token in URL | Redirect to `/feedback/email?r=invalid` | |
| 5.11 | Admin visits `/admin/reviews` | Feedback row visible with case context | |
| 5.12 | Admin sets `admin_status=reviewed` | Saved, row updated | |

---

## 6. Blocked non-beta user

**Goal:** Confirm that emails from addresses without beta access or a paid plan
are blocked, not silently dropped.

| Step | Action | Expected | Result |
|---|---|---|---|
| 6.1 | Send email to Ray from an address NOT in `beta_access` and not subscribed | Webhook receives, user lookup finds no access | |
| 6.2 | Check inbox for the blocked address | Receives "Finish setting up CheckRay" reply | |
| 6.3 | No case saved in `cases` table | Correct — blocked users must not consume quota | |
| 6.4 | `inbound_email_log` row shows `outcome='unknown_sender'` or `'beta_expired'` | |

---

## 7. Usage limit behavior

**Goal:** Confirm that a user who has hit their monthly check limit gets a clean "over limit" reply, not a crash.

| Step | Action | Expected | Result |
|---|---|---|---|
| 7.1 | Manually insert `usage_events` rows so the test account has used its full month quota | DB updated | |
| 7.2 | Send another email to Ray from that account | Webhook receives | |
| 7.3 | Check inbox | "CheckRay limit reached" reply received | |
| 7.4 | `inbound_email_log` row shows `outcome='over_limit'` | |
| 7.5 | No new case created | |

---

## 8. Empty / too-short email body

**Goal:** Confirm Ray handles empty or attachment-only emails gracefully.

| Step | Action | Expected | Result |
|---|---|---|---|
| 8.1 | Send email with no body text to Ray | "Ray could not check that email" reply received | |
| 8.2 | `inbound_email_log` shows `outcome='analyzer_error'` or `'reply_failed'` with reason | |
| 8.3 | No crash, no 500 logged | |

---

## 9. Paid user (future — when Stripe is live)

> Skip until Stripe billing is fully wired.

| Step | Action | Expected |
|---|---|---|
| 9.1 | Create paid subscription via Stripe test mode | `user_billing.plan='pro'`, `status='active'` |
| 9.2 | Email Ray from paid address | Analysis runs, reply sent |
| 9.3 | Check usage limit uses `pro` limits | Correct quota applied |

---

## What to record after each full run

Create a simple log entry (paste into a note, Notion, or a dated text file):

```
Date: YYYY-MM-DD
Branch/commit: <git log --oneline -1>
Tester: <name>
Environment: local / staging

Results:
  Beta request flow:        PASS / PARTIAL / FAIL
  Signup with beta email:   PASS / PARTIAL / FAIL
  Email Ray:                PASS / PARTIAL / FAIL
  Dashboard case flow:      PASS / PARTIAL / FAIL
  Feedback buttons:         PASS / PARTIAL / FAIL
  Blocked non-beta user:    PASS / PARTIAL / FAIL
  Usage limit:              PASS / PARTIAL / FAIL
  Empty email body:         PASS / PARTIAL / FAIL

Failures/notes:
  <describe any failures, unexpected behavior, or UX friction>

Blocked on:
  <anything that needs fixing before next invite cohort>
```

---

## Frequency

Run this full checklist:
- Before inviting a new cohort of beta testers.
- After any change to: inbound email route, feedback endpoint, billing gates,
  beta access logic, or analyzer risk floors.
- After any migration that touches `cases`, `case_feedback`, `beta_access`,
  `usage_events`, or `inbound_email_log`.

Spot-check (sections 3–5 only) after smaller changes like copy/UI edits.

---

## Tips for realistic email testing

- Forward actual phishing/spam from your own inbox (already in your possession).
- Use the test cases in `docs/SIMULATED_BETA_CASES.md` — paste them as email
  body text and forward to the inbound address.
- Vary subject lines; Ray should analyze the body, not just the subject.
- Test with and without the `FEEDBACK_SIGNING_SECRET` env var to confirm both
  paths (links present / links omitted) work.
