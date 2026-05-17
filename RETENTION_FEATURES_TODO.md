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

## 8. Chrome Extension

**Feature name:** CheckRay Browser Extension
**Availability:** Basic plan and Plus plan only
**Marketing line:** “Chrome extension coming soon: check suspicious job posts, emails, links, and pages while you browse.”

### V1 scope

1. **Popup text checker** — user pastes suspicious text (email, message, job post) into the extension popup and sends it to Ray
2. **Current page URL checker** — one-click check of the active tab URL for common phishing/scam risk signals
3. **Highlight to check** — user highlights text on any page, right-clicks, selects “Check with Ray” — result opens in popup
4. **Save results to dashboard** — each extension check creates a case and saves to the user’s CheckRay dashboard (same as web app flow)
5. **Open full report** — “See full report” button in popup opens `/cases/[id]` in a new tab

### V1 implementation notes

- Reuses `POST /api/analyze-case` — no new backend route needed
- Auth: user must be signed in on `checkray.app`; extension reads the shared session token
- Extension checks count toward the user’s existing monthly limit (Basic: 25, Plus: unlimited)
- Build as a Manifest V3 Chrome extension
- No new dependencies in the main Next.js app

### Later / post-V1

1. **Gmail/Outlook helper** — detect email content in-page and offer to check it with Ray
2. **LinkedIn/Indeed job post helper** — auto-extract job description text from the current page
3. **Company website context check** — check a company URL for basic legitimacy signals
4. **Trusted contact sharing** — share a result directly from the extension popup
5. **Browser warning overlay** — show a subtle warning bar on pages that score very_high on a quick URL check

### Do not build yet

- Do not create any extension files until V1 scope is locked and the web MVP is stable
- Do not add `webextension-polyfill`, `crxjs`, or any browser-extension build tooling to the main Next.js project
- Keep extension in a separate repo or monorepo workspace when ready

---

## Priority order

1. Share report (quick win, drives organic growth)
2. Ask Ray follow-up (deepens engagement per session)
3. Trusted contact / family sharing (strongest retention hook)
4. Weekly email sender (retention via Resend)
5. Cancellation survey (improves churn data)
6. Chrome extension V1 (major paid-tier differentiator)
7. Report a scam (community signal, long-term)
8. Customer support chat (defer until scale)
