# CheckRay — Admin & Support CRM Tests

Manual smoke tests for the admin/support CRM. Run these locally before
each deploy that touches `app/admin/**`, `app/support/**`, or
`app/api/{admin,support}/**`.

## Prerequisites

1. Local Supabase project with all migrations applied, including:
   - `20260518120000_add_admin_crm_tables.sql`
   - `20260520120000_widen_support_ticket_enums.sql` (run this on prod
     before shipping the new statuses + categories).
2. `ADMIN_EMAILS=you@example.com,colleague@example.com` in `.env.local`.
3. At least one test user account that is **NOT** in `ADMIN_EMAILS` so
   you can verify the redirect.
4. `next dev` running on port 3000.

---

## A. Admin gating

| # | Steps | Expected |
|---|---|---|
| 1 | Sign in as a non-admin user, visit `/admin`. | Redirected to `/dashboard`. |
| 2 | Sign in as an admin, visit `/admin`. | Sees the admin overview with stat cards. |
| 3 | Visit `/admin/customers`, `/admin/tickets`. | Both render with the admin layout. |
| 4 | Sign out, visit `/admin`. | Redirected to `/dashboard` (or to `/sign-in` if middleware fires). |

`isAdminUser()` lives in `@/lib/admin/access`. The current rule: the
user's email must appear in `ADMIN_EMAILS` (comma-separated). The
`admin_users` table exists for future role-based access but is not
checked yet.

---

## B. Customer-facing /support submission

| # | Steps | Expected |
|---|---|---|
| 1 | Logged out, visit `/support`. Fill: email, subject, message, category=Billing. Submit. | Success card "Message received". |
| 2 | DB: `select * from support_tickets order by created_at desc limit 1;` | Row exists, `user_id IS NULL`, `email` matches, `category = 'billing'`. |
| 3 | Logged in, visit `/support`. Fill: subject, message (no email). Submit. | Success. |
| 4 | DB check. | Row exists, `user_id` matches the logged-in user, `email` matches the user's auth email. |
| 5 | Visit `/support?category=cancellation`. | Topic dropdown is preselected to "Cancellation request". |
| 6 | Visit `/support?category=refund_request`. | Topic dropdown is preselected to "Refund request". |
| 7 | Visit `/support?category=garbage`. | Topic falls back to "Other". |
| 8 | Submit with a category not in the canonical list (manually via curl). | Server downgrades it to `other` (see `safeCategory`). |

---

## C. Admin tickets queue

| # | Steps | Expected |
|---|---|---|
| 1 | Visit `/admin/tickets` as admin. | Table of tickets (default filter: `open`). |
| 2 | Click each status filter pill (`open`, `Waiting on customer`, `In review`, `Resolved`, `Closed`, `all`). | Query string updates and the query refilters. |
| 3 | Click each category chip (Cancellation request / Refund request / etc.). | Filter combines with status. |
| 4 | Click "all" status + "Cancellation request" category. | Shows only cancellation tickets across all statuses. |
| 5 | Change a ticket's status via the inline `<select>`. | Page persists the change (PATCH `/api/admin/tickets`). |
| 6 | Try to PATCH with an invalid status via curl. | Returns 400 `Invalid status`. |
| 7 | Try to PATCH as a non-admin user. | Returns 403 `Forbidden`. |
| 8 | Verify the ticket list does **not** show case `report` content. | Only `subject` + `message` (line-clamped) + `category` + `email` are shown. |

The status pill uses the canonical 5-status set
(`open` / `waiting_on_customer` / `in_review` / `resolved` / `closed`).
Legacy values (`in_progress`) are still accepted on read but the
admin UI never writes them.

---

## D. Customer detail page

| # | Steps | Expected |
|---|---|---|
| 1 | From `/admin/tickets`, click "View user →" on a ticket linked to a real user. | Navigates to `/admin/customers/[id]`. |
| 2 | Page shows: account info, billing, recent cases, support tickets, internal notes. | All sections render. |
| 3 | Add an internal note. | Note appears in the "Internal notes" list. |
| 4 | Confirm the page does not show raw `risk_reports` content (red flags / summary / next-steps prose). | Only case title + category + date are shown. |

`AddNoteForm` posts to `POST /api/admin/notes` with `user_id` + `note`.
Notes are stored in `support_notes` and never exposed to the customer.

---

## E. Cancellation / refund triage workflow

End-to-end check that the `?category=cancellation` link from the
billing card surfaces correctly to admins.

| # | Steps | Expected |
|---|---|---|
| 1 | As a logged-in user with an active subscription, click "Need help with billing or cancellation?" on the dashboard. | Lands on `/support?category=cancellation`. |
| 2 | Submit the form. | Ticket is created with `category = 'cancellation'`. |
| 3 | As admin, visit `/admin/tickets?category=cancellation`. | New ticket appears in the queue. |
| 4 | Repeat with refund: link to `/support?category=refund_request`, then admin filter `?category=refund_request`. | Same flow works. |

> **No destructive action.** Admins do not refund or cancel from the
> CheckRay UI. Cancellations and refunds are always processed via the
> Stripe Customer Portal (user-driven) or the Stripe Dashboard (admin,
> manual). The internal note + ticket status change is the only thing
> CheckRay records.

---

## F. Quick API smoke (curl)

```bash
# As anonymous: submit a ticket
curl -sS -X POST http://localhost:3000/api/support/submit \
  -H 'Content-Type: application/json' \
  -d '{"email":"anon@example.com","subject":"Test","message":"hello","category":"billing"}'
# expect: {"ok":true}

# Invalid category collapses to 'other'
curl -sS -X POST http://localhost:3000/api/support/submit \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.co","subject":"t","message":"m","category":"NOT_A_CATEGORY"}'
# expect: {"ok":true} ; DB row category = 'other'

# Admin tickets list (requires admin auth cookie)
curl -sS http://localhost:3000/api/admin/tickets -b "<admin-cookie>"
# expect: JSON array of tickets

# Admin patch ticket status
curl -sS -X PATCH http://localhost:3000/api/admin/tickets \
  -H 'Content-Type: application/json' \
  -b "<admin-cookie>" \
  -d '{"ticketId":"<ticket-uuid>","status":"in_review"}'
# expect: {"ok":true}
```
