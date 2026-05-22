# docs/SCHEMA_CONTRACTS.md — Stable API and Data Shapes

These shapes are **contracts**. Client code, tests, and the Chrome extension depend on them. Do not change field names, types, or remove fields without updating all consumers and tests first.

---

## 1. `POST /api/analyze-case`

### Request body
```ts
{
  content: string           // The user's submitted text/URL (required)
  context?: string          // Optional extra context
  country?: string          // ISO 3166-1 alpha-2 (e.g. "AU", "US")
  language?: string         // BCP 47 (e.g. "en", "es")
  anonymous_id?: string     // Fingerprint for anonymous checks
}
```

### Response body (success 200)
```ts
{
  report: {
    risk_score: number                    // 0–100
    risk_level: "low" | "medium" | "high" | "very_high"
    disclaimer: string                    // Always present — legal requirement
    red_flags: string[]                   // List of identified risk signals
    recommended_actions: string[]         // What the user should do
    safe_reply: string                    // Suggested safe response text
    category: string                      // e.g. "phishing", "job_scam", "romance_scam"
    confidence: number                    // 0–1 confidence score

    // Optional — present when country provided
    localized_verification_steps?: string[]
    reporting_options?: {
      name: string
      url?: string
      phone?: string
    }[]
  }
  case_id?: string                        // Present if user is authenticated and case saved
  used_fallback?: boolean                 // true if deterministic fallback was used
}
```

### Error responses
| Status | When |
|---|---|
| 400 | Invalid request body (Zod validation failed) |
| 401 | Route requires auth and no session found |
| 402 | User's plan does not allow more checks (upgrade required) |
| 429 | Rate limit exceeded (25/day for basic, 1 for anon) |
| 500 | Unexpected server error |

### Invariants (must always hold)
- `report.disclaimer` is always a non-empty string
- `report.risk_level` is always one of the four enum values
- `report.risk_score` is always an integer 0–100
- `report.red_flags` is always an array (may be empty)
- `report.recommended_actions` is always an array (may be empty)
- `report.safe_reply` is always a non-empty string
- Response is the same shape whether OpenAI is used or deterministic fallback runs

---

## 2. Case object (Supabase `cases` table)

```ts
{
  id: string                  // UUID
  user_id: string             // UUID — auth.uid()
  content: string             // Original submitted text
  context?: string
  country?: string
  language?: string
  created_at: string          // ISO 8601
  updated_at: string
}
```

---

## 3. Risk report object (Supabase `risk_reports` table)

```ts
{
  id: string
  case_id: string             // FK → cases.id
  user_id: string             // Denormalized for RLS
  risk_score: number
  risk_level: string
  disclaimer: string
  red_flags: string[]         // JSON array column
  recommended_actions: string[] // JSON array column
  safe_reply: string
  category: string
  confidence: number
  used_fallback: boolean
  localized_verification_steps?: string[]
  reporting_options?: object[]
  model_used?: string         // e.g. "gpt-4o-mini" or "deterministic"
  created_at: string
}
```

---

## 4. User billing object (Supabase `user_billing` table)

```ts
{
  id: string
  user_id: string
  plan: "trial" | "basic" | "plus" | "none"
  trial_ends_at?: string      // ISO 8601
  stripe_customer_id?: string
  stripe_subscription_id?: string
  subscription_status?: string
  current_period_end?: string
  updated_at: string
}
```

Access tier resolution logic lives in `lib/billing/access.ts`. Do not duplicate it.

---

## 5. Chrome extension message schema (popup → background → content)

```ts
// Popup sends to background:
{
  type: "ANALYZE"
  content: string
  tabUrl?: string
}

// Background responds to popup:
{
  type: "ANALYZE_RESULT"
  report: RiskReport          // Same shape as /api/analyze-case response.report
  error?: string
}
```

---

## Rules for changing these contracts

1. **Never rename a field** without a migration plan for all consumers
2. **Never change a field's type** (e.g. `string[]` → `object[]`) without versioning
3. **Never remove a field** that's present in the deterministic fallback output
4. **After any schema change:** update Zod schemas, TypeScript types, k6 assertions, Playwright checks
5. **`disclaimer` can never be removed** — it is a legal requirement in all responses
