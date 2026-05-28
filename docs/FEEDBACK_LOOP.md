# Feedback Loop: How User Feedback Becomes Better Eval Cases and Rule Updates

## Overview

CheckRay collects structured feedback from beta users on Ray's analysis results. This document describes the full pipeline from a user clicking "Not right" through to a new eval case or a rule change landing in production.

---

## 1. Feedback Collection

### User-facing widget

The `FeedbackWidget` component appears at the bottom of every case result page (`ReportDetail`). It presents two options:

- **Accurate** — One-click, no friction. Submits immediately.
- **Not right** — Expands to show reason chips and an optional free-text note.

**Reason chips (when "Not right"):**

| Value | Meaning |
|---|---|
| `too_risky` | Ray scored this higher than warranted |
| `not_risky_enough` | Ray missed or underweighted a threat |
| `missed_red_flag` | A specific signal was overlooked |
| `wrong_category` | Wrong scam/threat category |
| `confusing_explanation` | Summary or flags were hard to understand |
| `other` | Catch-all |

The optional **"What should Ray have noticed?"** note field is where users describe the missed signal in their own words. This is high-value signal for eval authoring.

### API

`POST /api/feedback`

- Auth required. Users can only submit feedback for their own cases.
- Upserts: re-submitting updates the existing row (one row per user per case).
- Returns `{ ok: true }` on success.

---

## 2. Supabase Table

```sql
public.case_feedback
  id            uuid pk
  case_id       uuid → cases.id (cascade delete)
  user_id       uuid → auth.users.id (cascade delete)
  rating        text  ('accurate' | 'not_right')
  reason        text? (one of 6 values, null when accurate)
  note          text? (user's free-text, trimmed)
  admin_status  text? (reviewed | false_positive | false_negative |
                       needs_rule_update | needs_prompt_update)
  admin_notes   text? (internal notes)
  created_at    timestamptz
  updated_at    timestamptz
```

**RLS policy:**

- Users can insert/read/update only their own rows.
- Admin reads/writes go through the Supabase **service role** only (bypasses RLS). Never exposed to public.

---

## 3. Admin Review Queue

Navigate to `/admin/reviews` (requires `ENABLE_ADMIN_TOOLS=true` + your email in `ADMIN_EMAILS`).

### What you see per row:

- Rating + reason chip + current admin status
- Case title, category, risk level, score
- Original input text (collapsed by default)
- Ray's summary
- Red flags Ray flagged (up to 5, then "+N more")
- User's free-text note
- Admin status dropdown + admin notes field + Save button

### Admin status values:

| Status | When to use |
|---|---|
| `reviewed` | Looked at it, no action needed |
| `false_positive` | Ray flagged as risky when it wasn't (user said "too risky") |
| `false_negative` | Ray missed a real threat (user said "not risky enough" or "missed red flag") |
| `needs_rule_update` | Deterministic floor/signal in `lib/analyzer/risk-floors.ts` or `lib/analysis/fallback.ts` needs changing |
| `needs_prompt_update` | AI system prompt in `lib/checkmate.ts` needs updated guidance |

---

## 4. From Feedback to Eval Case

### Step 1: Identify a `false_negative` with reason `not_risky_enough` or `missed_red_flag`

Use the filter `Rating: Not right` + `Status: false_negative` in the reviews queue.

### Step 2: Copy the original input text

The input is shown on the review row (toggle "Show original input"). Copy it exactly.

### Step 3: Add an eval case to `scripts/run-analyzer-evals.ts`

```typescript
{
  id: 'L',  // next letter in sequence
  label: 'Brief description matching the pattern',
  input: `<paste exact input text here>`,
  // What we expect:
  minScore: 88,                          // floor the case should trigger
  expectedRatings: ['high', 'very_high'] // or ['needs_more_info'] for noise
}
```

Run `pnpm run analyzer:eval` to verify it fails before the fix (red), then passes after.

### Step 4: Fix the rule

- **Floor/signal issue** → edit `lib/analyzer/risk-floors.ts` or `lib/analysis/fallback.ts`
- **AI prompt issue** → edit the system prompt section in `lib/checkmate.ts`
- **Both** → fix the floor first (deterministic, always runs), then refine the prompt

Re-run `pnpm run analyzer:eval` to confirm all cases still pass (including the new one).

### Step 5: Re-run full verification

```bash
npx tsc --noEmit
npx next build
gitleaks detect --source .
npx tsx --tsconfig tsconfig.json scripts/run-analyzer-evals.ts
```

### Step 6: Mark the feedback row `reviewed` in the admin queue

Update admin notes with the commit SHA or a brief description of the fix applied.

---

## 5. From Feedback to Prompt Update

When `admin_status = needs_prompt_update`:

1. Read the user's note and the original input together.
2. Identify what category of scam the prompt is not handling well.
3. Locate the relevant section in the AI system prompt in `lib/checkmate.ts`.
4. Add an explicit instruction or example to the `RISK_ANALYSIS_PROMPT` constant.
5. Add a new eval case for the pattern (see Step 3 above) — even if it's AI-only, the fallback eval confirms the deterministic baseline is still correct.

---

## 6. False Positive Handling

When `admin_status = false_positive` (user said "too risky"):

1. Read the input. Is it genuinely low-risk?
2. If yes, check whether a floor pattern in `lib/analyzer/risk-floors.ts` is over-triggering.
3. Narrow the pattern regex or raise the minimum token count required to trigger the floor.
4. Add a "benign control" eval case (like case K in the eval suite) to prevent regression.

---

## 7. Frequency Guidance

| Trigger | Action |
|---|---|
| ≥ 3 `false_negative` rows with same reason | Write a new eval case + fix the floor |
| ≥ 5 `needs_rule_update` rows in a week | Schedule a floor audit |
| Any `false_positive` on a benign input | Investigate immediately — false positives erode trust faster than false negatives |
| Any `missed_red_flag` note mentioning a new payment method or platform | Add a keyword to the relevant signal pattern |

---

## 8. Files Modified by This Loop

| File | Role |
|---|---|
| `scripts/run-analyzer-evals.ts` | Eval suite — add new cases here |
| `lib/analyzer/risk-floors.ts` | Deterministic floor/signal patterns |
| `lib/analysis/fallback.ts` | Rule-based fallback engine |
| `lib/checkmate.ts` | AI prompt + `finalizeWithFloors()` orchestration |
| `supabase/migrations/` | Any schema changes to support new fields |

---

## 9. What NOT to do from feedback alone

- Do **not** loosen floors based on a single "too risky" rating without manual review of the input.
- Do **not** tighten floors so much that the benign case K eval starts failing.
- Do **not** use user note text verbatim in prompt instructions — sanitize and generalize first.
- Do **not** change Stripe/billing/auth code in response to analyzer feedback.

---

*Last updated: May 2026*
