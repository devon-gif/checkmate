# Beta request flow — how it works & how to test

This document describes the public beta-signup flow and a production smoke-test
checklist. It exists because a beta submission once returned a 500 in
production: the `public.beta_requests` table did not exist in that environment
(the migration had not been applied), so the service-role insert failed and the
request was lost.

## Flow overview

1. **Public form** — `app/beta/page.tsx` posts the form to `POST /api/beta/request`.
2. **Persist first** — `app/api/beta/request/route.ts` validates and saves the
   request to `public.beta_requests` **before** sending any email. Persistence
   is the durable source of truth; the admin panel reads from this table.
3. **Notify (best-effort)** — after the save, the route emails the admin via
   Resend. If that email fails, the route logs a warning and still returns
   success. A submission is never lost because of an email problem.
4. **Admin review** — `/admin` lists beta requests (`listBetaRequests` →
   `beta_requests`). An admin approves via `POST /api/admin/beta-requests/approve`,
   which writes/updates the user's grant in `public.beta_access` **first**, then
   marks the request `approved`. Access is driven by `beta_access`, not
   `beta_requests`.

## Tables & key constraints

- `public.beta_requests` — the pending queue and audit trail.
  Columns: `id, name, email (citext), use_case, note, status, reviewed_at,
  reviewed_by, created_at, updated_at`.
  - Migration: `20260528120000_add_beta_requests.sql` (table) +
    `20260529170000_beta_requests_email_unique.sql` (`unique(email)`).
  - `status` is one of `pending | approved | rejected`.
- `public.beta_access` — the actual grant that unlocks beta plan limits.
  Migration: `20260527120000_add_beta_access.sql`.

## Duplicate handling

`email` is a `citext` column with a `unique` constraint
(`beta_requests_email_key`). The request route uses
`upsert(..., { onConflict: 'email' })`, so:

- A first-time submission inserts a new `pending` row.
- A repeat submission from the same email (any casing) **updates** the existing
  row (name / use_case / note) instead of erroring or creating a duplicate.
- The upsert deliberately does **not** write `status`, so re-submitting after
  an admin has already approved or rejected the request does not flip it back
  to `pending`.

## Error handling (no raw DB errors to users)

- Validation failure → `422 { error: 'validation_failed', message: <specific> }`.
- Service-role env missing → `503 { error: 'storage_unavailable', message:
  "We couldn't save your request. Please email support@checkray.app." }`.
- DB write failure → `500 { error: 'storage_failed', message: "We couldn't save
  your request. Please email support@checkray.app." }`.
- The client (`app/beta/page.tsx`) renders `message`, never the machine `error`
  code, and falls back to a generic support line.
- Server logs are PII-safe: they record `request_id` and `use_case` only — never
  the applicant's name, email, or note.

## Production smoke-test checklist

Run these against production after deploying / applying migrations.

1. **Migrations applied.** Confirm `beta_requests` and its unique constraint
   exist:
   ```sql
   select to_regclass('public.beta_requests');                  -- not null
   select conname from pg_constraint
     where conrelid = 'public.beta_requests'::regclass
       and contype = 'u';                                        -- beta_requests_email_key
   select to_regclass('public.beta_access');                    -- not null
   ```
2. **Happy path.** Submit the `/beta` form with a fresh email. Expect the
   success state in the UI and a `200 { ok: true, request_id, email_sent }`
   from the network tab.
3. **Row saved.** Confirm a `pending` row exists:
   ```sql
   select id, email, use_case, status from public.beta_requests
     order by created_at desc limit 5;
   ```
4. **Admin notification.** Confirm the admin notification email arrived (or, if
   Resend is down, that the row is still saved and the response was still
   `200` with `email_sent: false`).
5. **Duplicate submission.** Submit again with the **same email** (try a
   different casing, e.g. `User@…` vs `user@…`). Expect success again and **no**
   second row — the existing row is updated.
6. **Validation.** Submit with a bad email / missing fields. Expect a `422` and
   a specific, friendly message in the UI (not a raw code).
7. **Admin sees it.** Open `/admin` and confirm the request appears in the beta
   list, newest first.
8. **Approval writes access.** Approve the request from `/admin`. Confirm:
   - `beta_access` has an `active` row for that email:
     ```sql
     select email, plan, status, expires_at from public.beta_access
       where email = lower('<applicant-email>');
     ```
   - `beta_requests.status` for that row is now `approved`.
   - The applicant receives the approval email (or `email_sent: false` is shown
     and the grant still landed — re-send via
     `/api/admin/beta-testers/resend-approval`).

## Rollback / recovery notes

- If a notification email fails, nothing is lost: the request is in
  `beta_requests` and visible in `/admin`.
- If approval marks `beta_access` but fails to flip `beta_requests.status`, the
  user already has access; the response includes `request_mark_warning` and the
  admin can safely ignore or retry without double-granting.
