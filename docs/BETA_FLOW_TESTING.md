# Beta signup & onboarding flow — how it works & how to test

End-to-end map of the beta program plus a test plan for every link in the
chain. The happy path is:

> Visitor requests beta → request saves → admin sees it → admin approves →
> approval email sends → user signs up with the **same email** → user reaches
> the dashboard → user emails Ray → Ray replies → the case saves to the
> dashboard → feedback links work.

## Root cause of the recent `/beta` failure (fixed)

The `/beta` form returned _"We couldn't save your request. Please email
support@checkray.app."_ because the request route used
`.upsert(..., { onConflict: 'email' })`. An `ON CONFLICT` clause requires a
matching `UNIQUE` constraint on `beta_requests.email`. That constraint ships
in migration `20260529170000_beta_requests_email_unique.sql`, which was added
in the **same change** as the upsert. Supabase migrations are applied
independently of the Vercel deploy, so when the new code went live before the
migration was applied, every upsert failed with Postgres **42P10**
(_"no unique or exclusion constraint matching the ON CONFLICT specification"_)
and the route returned the friendly storage error.

**Fix:** the route no longer depends on `ON CONFLICT`. It now does an explicit
**look-up-by-email, then update or insert** (the same pattern the admin
grant/approve routes use for `beta_access`), with a `23505` unique-violation
fallback for the concurrent-submit race. This works identically whether or not
the unique constraint has been applied, so the form is resilient to migration
ordering. The unique migration is kept as defense-in-depth and for dedupe.

## Flow overview & owning files

1. **Public form** — `app/beta/page.tsx` posts to `POST /api/beta/request`.
2. **Persist first** — `app/api/beta/request/route.ts` validates, normalizes
   the email (trim + lowercase), then writes to `public.beta_requests`
   **before** sending any email. Persistence is the durable source of truth.
3. **Notify (best-effort)** — after the save, the route emails the admin via
   Resend. If that email fails, the route logs a warning and **still returns
   success**. A submission is never lost because of an email problem.
4. **Admin review** — `/admin` renders `PendingBetaRequestsPanel` from
   `listBetaRequests()`. Approve → `POST /api/admin/beta-requests/approve`,
   which writes/updates `public.beta_access` **first**, sends the approval
   email, then marks the request `approved`. No manual SQL required.
5. **Approval email** — `lib/billing/beta-approval-email.ts`. Includes the
   sign-up link, the same-email instruction, the Ray inbound address, what to
   test, and the "Ray can be wrong" disclaimer.
6. **Sign up** — `app/sign-up/page.tsx`. Identity is the email; `beta_access`,
   `auth.users`, and the inbound gate all key off the same normalized email.
7. **Email Ray** — `POST /api/inbound/email` verifies the webhook signature,
   gates the sender, and only calls the analyzer for approved/paid senders.
8. **Reply + save** — on the allowed path it saves `cases` + `risk_reports`,
   logs a `usage_events('check_created')`, and replies via
   `lib/billing/inbound-reply-email.ts`.

## Tables & allowed values

- `public.beta_requests` — pending queue / audit trail. Columns:
  `id, name, email (citext), use_case, note, status, reviewed_at,
  reviewed_by, created_at, updated_at`. Migrations:
  `20260528120000_add_beta_requests.sql` +
  `20260529170000_beta_requests_email_unique.sql`.
  - `status` ∈ `pending | approved | rejected` (check constraint).
- `public.beta_access` — the grant that unlocks beta plan limits. Migration
  `20260527120000_add_beta_access.sql`.
  - **`plan`** ∈ `beta_basic | beta_plus | beta_family` (check constraint).
  - **`status`** ∈ `active | revoked` (check constraint).
  - `email` has `unique(beta_access_email_key)`.
  - The route code only ever writes these allowed values (`isBetaPlan`
    validates `plan`; `status` is hard-coded to `active` / `revoked`).

## Duplicate handling

`email` is a `citext` column (case-insensitive). The request route looks up an
existing row by email, then:

- **First-time** submission → inserts a new `pending` row.
- **Repeat** submission (any casing) → **updates** the existing row's
  `name / use_case / note`. It deliberately does **not** write `status`, so
  re-submitting after approval/rejection never flips a row back to `pending`.
- **Concurrent race** (two submits, constraint present) → the second insert
  hits `23505` and falls back to updating the existing row instead of erroring.

## Error handling (no raw DB errors to users)

- Validation failure → `422 { error: 'validation_failed', message: <specific> }`.
- Service-role env missing → `503 … "We couldn't save your request. Please
  email support@checkray.app."`
- DB write failure → `500 … "We couldn't save your request. Please email
  support@checkray.app."`
- The client renders `message`, never the machine `error` code.
- Server logs are PII-safe: `request_id` and `use_case` only — never the
  applicant's name, email, note, or any message body.

---

# Test plan

## 1. Beta request test (happy path)

Submit `/beta` with a fresh name + email + use case + the "I understand"
checkbox. Expect the success state with the numbered next-steps, and a
`200 { ok: true, request_id, email_sent }` in the network tab. Confirm a row:

```sql
select id, email, use_case, status from public.beta_requests
  order by created_at desc limit 5;   -- one new 'pending' row
```

## 2. Duplicate request test

Submit again with the **same email in a different casing** (`User@x.com` vs
`user@x.com`). Expect success again and **no second row** — the existing row's
fields update. To prove the migration-independence fix, this must also pass on
a database where `beta_requests_email_key` does **not** exist.

## 3. Admin approval test

Open `/admin`, find the pending request, click a plan (Basic/Plus/Family).
Expect the row to flip to `approved` (no manual SQL). Confirm the grant:

```sql
select email, plan, status, expires_at from public.beta_access
  where email = lower('<applicant-email>');   -- one 'active' row, allowed plan
select status from public.beta_requests where email = lower('<applicant-email>');
  -- 'approved'
```

Also test **reject** (row → `rejected`, no `beta_access` row) and **revoke**
(`/api/admin/beta-testers/revoke` → `beta_access.status='revoked'`, historical
row preserved, not deleted).

## 4. Approval email test

After approval, confirm the email arrives and contains: the **sign-up link**,
the **same-email** instruction, the **Ray inbound address**
(`ray@inbound.checkray.app` via `INBOUND_EMAIL_ADDRESS`), what to test, and the
"Ray can be wrong" disclaimer. If Resend is down, the approve response shows
`email_sent: false` / `email_error`; re-send via
`POST /api/admin/beta-testers/resend-approval`.

## 5. Same-email signup test

Sign up at `/sign-up` using the **exact approved email**. Expect to land on
`/dashboard`. (Signing up with a different email = no beta access — by design.)

## 6. Ray email test (approved sender)

From the approved address, email the inbound address with a suspicious sample.
Expect a "Ray checked your email" reply with risk level, summary, red flags,
and a safer next step. `inbound_email_log.outcome` = `analyzed`.

## 7. Dashboard save test

After the Ray email check, confirm the case is on the dashboard:

```sql
select id, title, risk_level, source from public.cases
  where source = 'inbound_email' order by created_at desc limit 5;
select count(*) from public.risk_reports r
  join public.cases c on c.id = r.case_id where c.source = 'inbound_email';
```

The reply's **"Open the full report"** button links to `/cases/<id>` only when
the case saved. If the save chain fails, the reply instead says _"Ray checked
this, but we couldn't save it to your dashboard this time"_, links to
`/dashboard` (label "Open your dashboard"), and omits feedback links.

## 8. Feedback link test

In the allowed reply (with a saved case + `FEEDBACK_SIGNING_SECRET` set), click
👍 Accurate and 👎 Not right. Each opens
`/api/feedback/email?caseId=…&rating=…&token=…` and records the rating. Tokens
are HMAC-signed; a tampered token is rejected.

## 9. Blocked unknown sender test (cost protection)

Email the inbound address from an address with **no** `beta_access` and **no**
active subscription. Expect:

- A "Finish setting up CheckRay to email Ray" reply.
- `inbound_email_log.outcome` = `unknown_sender` (or `past_due`).
- **The analyzer / OpenAI is never called** — confirm no `usage_events` row and
  no analyzer log line for that message.

Also test **approved-but-not-signed-up**: an address with active `beta_access`
but no `auth.users` row. Expect `outcome = no_user_record` and the new
"You're approved — finish setting up CheckRay" reply (sign-up nudge), **not**
the generic blocked/"not approved" message.

## 10. Production smoke-test checklist

Run after deploying / applying migrations.

1. **Migrations applied** (the original failure mode):
   ```sql
   select to_regclass('public.beta_requests');   -- not null
   select to_regclass('public.beta_access');     -- not null
   select conname from pg_constraint
     where conrelid = 'public.beta_requests'::regclass and contype = 'u';
   ```
   The route now works even if `beta_requests_email_key` is missing, but the
   constraint should still be present in production.
2. **Env present:** `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
   `RESEND_API_KEY`, `RESEND_INBOUND_WEBHOOK_SECRET`,
   `INBOUND_EMAIL_ADDRESS=ray@inbound.checkray.app`, `NEXT_PUBLIC_APP_URL`.
3. Run tests **1–9** above against production with a throwaway email.
4. **Loop guard:** an email "from" the inbound address itself is rejected
   (`rejected_spam`) and never analyzed.
5. **Idempotency:** the same `provider_msg_id` delivered twice produces one
   case, not two (`duplicate` outcome on the retry).

## Rollback / recovery notes

- Notification email failure loses nothing: the request is in `beta_requests`
  and visible in `/admin`.
- If approval writes `beta_access` but fails to flip `beta_requests.status`,
  the user already has access; the response carries `request_mark_warning` and
  the admin can ignore/retry without double-granting.
- Revoke sets `status='revoked'` (keeps the historical row); it never deletes.

---

# Browser QA plan (Sonnet / Chrome)

A non-destructive click-through for after code changes. **Do not** approve or
revoke real users, and use throwaway test emails only.

1. Load `/beta`. Confirm copy: "Beta access is manually approved", the
   same-email note, and the `ray@inbound.checkray.app` line.
2. Submit with an obviously invalid email → expect an inline friendly error,
   no crash.
3. Submit a valid throwaway request → expect the success card with the 4 numbered
   next-steps.
4. Resubmit the same email → still success (no duplicate; verify in `/admin`).
5. Sign in to `/admin`, confirm the test request shows under pending.
6. (Optional, staging only) Approve the **test** request, confirm the row flips
   and the grant appears under beta testers.
7. Visit `/sign-up`; confirm the form loads and references the same email
   identity.
8. Confirm `/dashboard` redirects unauthenticated users to `/sign-in`.
9. Do **not** trigger inbound email from the browser; use the `curl` payloads in
   `docs/INBOUND_EMAIL_SETUP.md` / `docs/SIMULATED_BETA_TESTING.md` instead.

Document anything surprising and ask before changing production data.
