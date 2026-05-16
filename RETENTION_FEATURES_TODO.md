# Retention Features TODO

Future features to improve engagement and user retention.
Keep scope tight — do not build these until core MVP is stable.

---

## 1. Share a report

Allow users to generate a shareable read-only link for a specific check result.

- Public URL: `/share/[token]` (already has a route stub)
- Add `share_token uuid` and `shared_at timestamptz` to `cases` table
- `POST /api/cases/[id]/share` generates a token
- Share page renders a read-only version of `RiskReport`
- Add "Share this check" button to case detail page

---

## 2. Trusted contact / family sharing

Let a user add a trusted contact (e.g. a family member) who can receive a copy of their checks.

- `trusted_contacts` table: `id`, `owner_user_id`, `contact_email`, `confirmed_at`, `created_at`
- Contact receives an email invitation and must confirm
- Confirmed contacts receive a copy of each new check summary
- Toggle per-contact: "Send them my weekly summary" vs "Send them every check"
- UI: `/settings/contacts`

---

## 3. Report a scam

After running a check, let users flag it as a confirmed scam to help others.

- `scam_reports` table: `case_id`, `user_id`, `confirmed_scam`, `report_text`, `created_at`
- "Report this as a confirmed scam" button on case detail
- Aggregated scam signals can inform future model prompts
- Later: public scam signal feed (opt-in)

---

## 4. Weekly email sender via Resend

See `NOTIFICATIONS_TODO.md` for full spec.

- Weekly cron job sends `Ray's Weekly Scam Watch` to opted-in users
- Respects `weekly_email_enabled` and `unsubscribed_at`
- Logs to `sent_emails` table

---

## 5. Cancellation survey

See `PRICING_MODEL.md` → Cancellation survey section.
See `BILLING_TODO.md` → Cancellation flow UI.

- Survey: 8-option single-select + optional free text
- Stores responses in `user_billing.cancellation_reason` / `cancellation_feedback`
- Show after subscription cancellation is confirmed

---

## 6. Ask Ray follow-up

On the case detail page (`/cases/[id]`), let users ask Ray a contextual follow-up.

- Follow-up box UI is already present on case detail (disabled / "Coming soon")
- API route: `POST /api/cases/[id]/follow-up`
  - Accepts `{ question: string }`
  - Builds prompt with original case context + user question
  - Returns a plain-text response from Ray
  - Saves to `case_messages` table
- Keep responses legal-safe: prepend a brief disclaimer
- Rate-limit: 5 follow-ups per case per user

---

## 7. Customer support chat

Low-priority. Explore options:
- Crisp, Intercom, or plain email form
- Keep it outside the app until needed
- Do not add Twilio or SMS

---

## Priority order

1. Share report (quick win, drives organic growth)
2. Ask Ray follow-up (deepens engagement per session)
3. Trusted contact / family sharing (strongest retention hook)
4. Weekly email sender (retention via Resend)
5. Cancellation survey (improves churn data)
6. Report a scam (community signal, long-term)
7. Customer support chat (defer until scale)
