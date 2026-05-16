# CheckRay Backend Tests

Manual curl/HTTPie test examples for `POST /api/analyze-case`.

**Base URL:** `http://localhost:3000` (or `3001` if 3000 is taken)

---

## Bruno API Collection (recommended)

A Bruno collection lives at `.bruno/checkray-api/`.
Open it with [Bruno](https://usebruno.com) (free, open-source, no cloud sync required):

1. Open Bruno → **Open Collection** → select `checkmate/.bruno/checkray-api`
2. Select the **local** environment (sets `{{baseUrl}}` = `http://localhost:3000`)
3. Run any request — responses render in-app with full JSON formatting

Collection files:
| File | Test case |
|------|-----------|
| `A_job_scam.bru` | Job scam with check + wire-back |
| `B_phishing_link.bru` | Phishing URL with urgency text |
| `C_bill_fee.bru` | Bill/fee dispute with category hint |
| `D_low_risk.bru` | Low-risk legitimate request |
| `E_url_only.bru` | Suspicious `.xyz` URL, no text |
| `F_email_category.bru` | Phishing email with `email` category hint |
| `G_empty_body.bru` | Validation — empty body → 400 |
| `H_too_long.bru` | Validation — oversized input → 422 |
| `I_rental_scam.bru` | Military overseas rental scam |

---

## A. Job scam — expect HIGH / VERY_HIGH risk, `job_scam_or_ghost_job` category

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "You'\''re hired for a remote data entry role. We'\''ll send a check for equipment. Deposit it and wire the difference back."
  }' | jq .
```

**Expected:**
- `category`: `"job_scam_or_ghost_job"`
- `risk_score`: 92–98
- `risk_level`: `"very_high"`
- `red_flags`: must include "Fake check or equipment check request", "Wire money back request", "Money movement before verified employment"
- `saved`: `false` (not logged in)
- `save_reason`: `"not_authenticated"`
- `disclaimer`: present

---

## B. Phishing link — expect HIGH risk, `phishing_url` category

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "Final notice: pay your toll balance now at track-package-fast-help.com or your registration may be suspended.",
    "input_url": "http://track-package-fast-help.com/pay"
  }' | jq .
```

**Expected:**
- `category`: `"phishing_url"`
- `risk_score`: 85–92
- `risk_level`: `"very_high"`
- `red_flags`: suspicious URL, urgency language, suspension threat
- `recommended_actions`: includes "visit official website directly"
- `save_reason`: `"not_authenticated"`

---

## C. Bill / fee dispute — expect MEDIUM risk, `bill_or_fee` category

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "My landlord charged me $1,248.97 for carpet replacement after move-out. They say it was prorated over 60 months. What should I ask for before paying?",
    "category_hint": "bill_or_fee"
  }' | jq .
```

**Expected:**
- `category`: `"bill_or_fee"`
- `risk_score`: 35–70
- `recommended_actions`: includes requesting itemized bill, written policy, verifying through official channels
- Language: cautious ("possible", "may be", not "definitely a scam")

---

## D. Low risk — expect LOW risk, `unknown` or appropriate category

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "Can you send me the official job posting and company email before we continue?"
  }' | jq .
```

**Expected:**
- `risk_score`: < 35
- `risk_level`: `"low"`
- `red_flags`: empty or minimal
- Summary: notes low signals, still suggests verifying

---

## E. URL only (no text)

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_url": "https://amazon-security-alert-verify.xyz/account"
  }' | jq .
```

**Expected:**
- `category`: `"phishing_url"`
- High risk score (suspicious TLD, mimics legitimate brand)

---

## F. Email category — expect HIGH risk, `email` category

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{
    "input_text": "From: hr-payroll@company-payroll-updates.net\nSubject: ACTION REQUIRED: Verify direct deposit\n\nDear Employee, please re-enter your bank routing and account number within 24 hours to avoid a missed payment.",
    "category_hint": "email"
  }' | jq .
```

**Expected:**
- `category`: `"email"`
- `risk_score`: ≥ 65 (bank details request + urgency)
- `recommended_actions`: includes "verify sender" and "do not click links"

---

## G. Validation error — empty body

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

**Expected:** `400` with `"error": "Provide pasted text, a URL, or both."`

---

## H. Validation error — body too large

```bash
curl -s -X POST http://localhost:3000/api/analyze-case \
  -H "Content-Type: application/json" \
  -d "{\"input_text\": \"$(python3 -c "print('x' * 20001)")\"}" | jq .
```

**Expected:** `422` with Zod validation error details

---

## I. Rate limit (expect 429 — authenticated users only)

After 25 `check_created` events in a rolling 24-hour window, authenticated users receive:

```jsonc
{
  "error": "Daily limit reached.",
  "detail": "Free accounts are limited to 25 checks per 24 hours. Try again later.",
  "retry_after": "PT24H"
}
```
HTTP status: `429 Too Many Requests`

Guests are never rate-limited — they always run the deterministic fallback (no AI call, no token cost).

Inspect usage count in Supabase SQL Editor (or Beekeeper Studio / DBeaver):
```sql
select count(*) from usage_events
where user_id = '<your-user-id>'
  and event_type = 'check_created'
  and created_at > now() - interval '24 hours';
```

---

## Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for AI) | OpenAI API key. Without it, the deterministic fallback runs automatically. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin ops | Never expose client-side |
| `CHECKMATE_ANALYZER_MODEL` | No | AI model name. Defaults to `gpt-4o-mini`. |

---

## Testing Without OpenAI Key

If `OPENAI_API_KEY` is not set, `analyzeCase()` catches the error and runs the
**deterministic fallback** instead. Results will be based on keyword matching
rather than AI — useful for testing the full save/retrieve flow without API costs.

To force fallback testing, temporarily set an invalid key:
```bash
OPENAI_API_KEY=invalid pnpm dev
```

---

## Database Setup

Run the migrations in order in the Supabase SQL Editor:

1. `supabase/migrations/20230707053030_init.sql`
2. `supabase/migrations/20260515120000_add_core_app_tables.sql`
3. `supabase/migrations/20260515130000_add_legal_tables.sql`
4. `supabase/migrations/20260516120000_extend_core_tables.sql`

---

## Full Save Flow (Authenticated)

1. Visit `http://localhost:3000/try`
2. Paste any of the test inputs above
3. Click **Analyze case**
4. If logged in: result shows "✓ Saved to your account — view case page" → `/cases/[id]`
5. If guest: shows `SaveResultPrompt` with sign-up CTA
6. Check dashboard at `/dashboard` for the saved case

---

## Canonical curl test cases

Set `BASE=http://localhost:3000` before running.

### J1. Fake-check job scam (expect: very_high, score 92–98)

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"You are hired for a remote data entry role. We will send a check for equipment. Deposit it and wire the difference back."}' \
  | jq '{risk_level:.report.risk_level,risk_score:.report.risk_score,category:.report.category}'
```
Expected: `risk_level: "very_high"`, `risk_score: 92–98`, `category: "job_scam_or_ghost_job"`
Red flags must include "Fake check or equipment check request" and "Wire money back request".
`safe_reply` must mention "do not deposit" and "company email domain".

### J2. Toll phishing (expect: very_high, score 85–92)

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"Final notice: pay your toll balance now at track-package-fast-help.com or your registration may be suspended."}' \
  | jq '{risk_level:.report.risk_level,risk_score:.report.risk_score,category:.report.category}'
```
Expected: `risk_level: "very_high"`, `risk_score: 85–92`, `category: "phishing_url"`

### J3. Bill/fee dispute (expect: medium, score 30–55, no "scam" in summary)

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"My landlord charged me $1,248.97 for carpet replacement after move-out. They say it was prorated over 60 months. What should I ask for before paying?"}' \
  | jq '{risk_level:.report.risk_level,risk_score:.report.risk_score,category:.report.category,summary:.report.summary}'
```
Expected: `risk_level: "medium"`, `risk_score: 30–55`, `category: "bill_or_fee"`
`summary` must NOT contain the word "scam". Must suggest requesting itemization or receipts.

### J4. Low-risk verification (expect: low, score 0–29)

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"Can you send me the official job posting and contact me from your company email domain before we continue?"}' \
  | jq '{risk_level:.report.risk_level,risk_score:.report.risk_score}'
```
Expected: `risk_level: "low"`, `risk_score: 0–29`

### J5. Empty input (expect: 400)

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" -d '{}'
```
Expected: `400`

### J6. Too-short input (expect: 400 validation_error)

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" \
  -d '{"input_text":"hi"}' | jq .error
```
Expected: `"validation_error"`

### J7. No stack trace in errors

```bash
curl -s -X POST $BASE/api/analyze-case \
  -H "Content-Type: application/json" -d '{}' | jq .
```
Response must NOT contain `stack`, `at Object.`, `node_modules`, or file paths.

---

```jsonc
{
  "saved": true,            // false for guests or on DB error
  "case_id": "uuid",        // null if not saved
  "report_id": "uuid",      // null if not saved
  "category": "job_scam_or_ghost_job",
  "risk_score": 87,
  "risk_level": "very_high",
  "summary": "This submission shows...",
  "red_flags": ["...", "..."],
  "recommended_actions": ["...", "..."],
  "safe_reply": "Thank you for reaching out...",
  "disclaimer": "Ray can be wrong. Results are informational only..."
}
```
