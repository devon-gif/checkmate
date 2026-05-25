# USAGE_LIMITS.md — CheckRay plan limits and the access gate

This is the single source of truth for which users get how many checks and
when OpenAI is called. The implementation lives in:

- `lib/billing/plans.ts` — plan IDs and monthly limits
- `lib/billing/access.ts` — the `checkAccess()` gate
- `app/api/analyze-case/route.ts` — calls the gate **before** invoking OpenAI

If you change a number here, update `lib/billing/plans.ts` in the same PR.

## Plan matrix

| Plan       | Monthly checks                  | Notes                                                    |
|------------|---------------------------------|----------------------------------------------------------|
| Anonymous  | 1 check total (lifetime, by cookie) | Tracked in `anonymous_checks` by `checkray_anonymous_id` cookie |
| Free       | **1 / month**                   | Default for any signed-in user without an active sub or open trial |
| Trial      | Unlimited during the 7-day window | Auto-created on first signed-in `/api/analyze-case` call |
| Basic      | **10 / month**                  | `$4.99 / mo` (`$3.99` billed yearly)                     |
| Plus       | **50 / month**                  | `$9.99 / mo` (`$7.99` billed yearly)                     |
| Family     | **Unlimited fair-use**          | `$19.99 / mo` (`$15.99` billed yearly). No hard cap; abuse policy applies |

Per-month counters reset on the **1st of each calendar month** (UTC) and are
driven by counting `usage_events` rows where `event_type = 'check_created'`.

## Status transitions

```
anonymous ─┬─► sign up ──► trialing (7 days, unlimited)
           │
           └─► over 1 check ──► anonymous_used  (must sign up)

trialing ──► trial closes ──► free (1 / month)
free     ──► over 1 / month ──► expired (soft — still on Free, prompts upgrade)
free     ──► subscribes ──► active (limit by plan)
active   ──► canceled / past_due ──► free (1 / month, reset to Free plan)
```

**Important:** *expired* is a soft state. The user is still on the Free plan;
they just used up their 1 check this month. They will get another check on
the 1st of next month with no further action. The dashboard copy reflects
this: "Your trial ended. You're now on Free."

## When OpenAI is called

`POST /api/analyze-case`:

1. Parse + validate body.
2. **Call `checkAccess()`** — returns `canAnalyze: false` for any over-limit
   state.
3. If `!canAnalyze` → return `HTTP 402 { error: 'usage_limit_reached', message, access }`.
   **OpenAI is never called.**
4. Otherwise call `analyzeCase()`, which calls OpenAI (with deterministic
   fallback if `OPENAI_API_KEY` is missing or the model errors).

The order matters: the gate is the first expensive thing the route does, so
over-limit users never trigger a model call and never incur cost.

### Non-production test bypass

A header `X-CheckRay-Test-Mode: fallback` (or env `CHECKRAY_FORCE_FALLBACK=true`)
short-circuits the OpenAI call and uses the deterministic analyzer. **This is
honoured ONLY when `NODE_ENV !== 'production'`.** It also skips the billing
gate so load tests have zero side effects. In production both checks ignore
the header/env entirely.

## Over-limit response

```json
{
  "error": "usage_limit_reached",
  "message": "You've used your free check for this month. Upgrade to Basic, Plus, or Family for more.",
  "access": {
    "canAnalyze": false,
    "accessStatus": "expired",
    "plan": "free",
    "checksUsed": 1,
    "checksLimit": 1
  }
}
```

The client (`app/cases/new/new-case-form.tsx`) catches HTTP 402 and renders
the inline `blockedReason` panel using `payload.message`. The dashboard's
`BillingStatusCard` reads the same numbers and shows the upgrade CTA.

## Analyzer response shape (do not change)

```ts
response.report.risk_score          // number 0-100
response.report.risk_level          // 'low' | 'medium' | 'high' | 'very_high'
response.report.disclaimer          // non-empty informational text
response.report.red_flags           // string[]
response.report.recommended_actions // string[]
response.report.safe_reply          // string
```

Additional fields (`category`, `confidence_level`, `summary`,
`evidence_found`, `missing_information`, `verification_steps`,
`country_context`) are returned alongside these but are not part of the
stable contract. If you need to evolve them, update
`lib/checkray-core/schema.ts` and the analyzer eval at the same time.

## Manual test steps

Set `ADMIN_EMAILS` to your own email in `.env.local` if you need to clear
your own `user_billing` and `usage_events` rows between runs.

1. **Anonymous over limit.** Open `/try` in a fresh incognito window. Run a
   check. Run a second. The second submission should render the
   "You've used your free check" gate.
2. **Trial open.** Sign up. Run a check. `BillingStatusCard` shows
   "Free trial — N days left". Several checks in a row should all succeed.
3. **Trial closed → Free.** In Supabase, set
   `user_billing.trial_ends_at` to a past timestamp for your user. Reload
   `/dashboard`. Card now reads "Free plan / 0 / 1 checks this month".
   First check succeeds, second returns the soft over-limit panel.
4. **Basic over limit.** Set `user_billing.plan = 'basic'`,
   `status = 'active'`. Insert 10 `usage_events` rows with
   `event_type = 'check_created'` for the current month. Next submission
   should be blocked with the Basic over-limit message.
5. **Plus over limit.** Same as Basic but with `plan = 'plus'` and 50
   events. Card should read "Plus plan / 50 / 50 checks this month".
6. **Family unlimited.** Set `plan = 'family'`, `status = 'active'`.
   Insert 100 events. Submission still succeeds; card reads
   "Family plan / Unlimited fair-use checks".

## Related docs

- `docs/BILLING_PRE_STRIPE_TODO.md` — what still needs wiring up for Stripe.
- `docs/SCHEMA_CONTRACTS.md` — analyzer response shape governance.
- `docs/SECURITY_BOUNDARIES.md` — service-role usage rules.
- `MVP_TEST_PLAN.md` (repo root) — full end-to-end smoke test.
