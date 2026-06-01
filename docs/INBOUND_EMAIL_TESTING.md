# Inbound Email — Dashboard Save Testing

How to verify that an inbound-email check from an approved user **saves to the
dashboard**, and how to diagnose a save failure quickly and safely.

## The flow (what should happen)

1. An approved sender (active `beta_access` **or** active/trialing
   `user_billing`) forwards an email to Ray.
2. The route resolves the sender to an auth user
   (`findUserByEmail`, backfilling `public.users` if needed).
3. `analyzeCase` runs.
4. `saveCase` inserts a `cases` row (`source = 'inbound_email'`), then
   `saveReport` inserts the `risk_reports` row, then `logUsageEvent` records a
   `check_created` event.
5. The reply email includes **"Open the full report"** *only* when a case was
   saved (`caseId` present **and** `saveFailed` is false).
6. The check appears in the user's dashboard.

If saving fails, the reply keeps the existing message:
> "Ray checked this, but we couldn't save it to your dashboard this time…"
and the "full report" link is suppressed.

## Client & access facts (so you can rule things out)

- The inbound route uses the **service-role** Supabase client
  (`SUPABASE_SERVICE_ROLE_KEY`). **RLS is bypassed** — RLS is *not* a cause of
  inbound save failures.
- `cases.user_id` / `risk_reports.user_id` reference `public.users(id)`. The
  backfill upsert writes the **auth.users id**, so the dashboard (which queries
  by auth uid) shows the saved row — no id mismatch.
- Non-approved senders are blocked *before* analysis, so blocked senders never
  consume OpenAI quota or a `check_created` usage event.

## Root cause of the "couldn't save" symptom

The application code path is correct and internally consistent with the
committed migrations. When a live save fails while analysis succeeds, the cause
is almost always **production database schema drift** — the production Supabase
project is missing one or more migrations that the insert depends on:

- `20260516120000_extend_core_tables.sql` — adds `cases.source`,
  `cases.input_text/input_url/input_type`, the `'email'` category, and
  `risk_reports.user_id/category/model_used`. If unapplied, **every** inbound
  save fails (missing column → PostgREST `PGRST204` / Postgres `42703`).
- `20260528130000_allow_needs_more_info_risk_level.sql` — allows
  `needs_more_info`. If unapplied, any analysis with that level fails the
  `cases_risk_level_check` / `risk_reports_risk_level_check` constraint
  (Postgres `23514`).

### Remediation
Apply pending migrations to the production database:

```bash
supabase db push          # or run the missing migration files in order
```

Then forward a test email again and confirm the dashboard shows the check.

## Diagnosing from logs (PII-safe)

The route emits a masked, body-free summary line for every allowed email:

```
[inbound/email] save summary sender=jo***@e***.com userFound=true \
  userIdPresent=true saveAttempt=true saveSuccess=false \
  caseId=none error=cases:42703 column "source" does not exist
```

and the helpers log the precise failure:

```
[db/save-case]   cases insert failed code=42703 message=...
[db/save-report] risk_reports insert failed code=... message=...
```

**Only** the Postgres error `code` + `message` are logged — never the email
body, the full sender address, the case title/subject, secrets, or
`error.details`/`error.hint` (which can echo failing row values). Map the code:

| code              | meaning                          | fix |
|-------------------|----------------------------------|-----|
| `42703`/`PGRST204`| missing column                   | apply `20260516120000` |
| `23514`           | check-constraint violation       | apply the migration that widens the constraint (category/risk_level) |
| `23503`           | FK violation (`user_id`)         | `public.users` backfill failed — check `findUserByEmail` log |
| `23505`           | unique violation                 | duplicate/replay — usually safe to ignore |

## Manual live-test checklist

1. Pick an **approved** tester email (active beta or paid).
2. Forward a real scam-ish email to the Ray inbound address.
3. Confirm the reply email arrives with a risk readout **and** an
   **"Open the full report"** link.
4. Open the dashboard as that user → the check is listed with the right
   risk level/score.
5. In server logs, confirm `save summary … saveSuccess=true caseId=<uuid>`.
6. Negative: forward from a **non-approved** address → reply is the blocked
   message, **no** dashboard entry, **no** `check_created` usage event,
   **no** OpenAI call.
7. Drift check: if `saveSuccess=false`, read the `error=` code in the summary
   line and apply the matching migration above.
