# Notifications TODO

Steps required before sending real weekly scam watch emails.

---

## 1. Set up Resend

- [ ] Create a [Resend](https://resend.com) account
- [ ] Verify your sending domain (e.g. `ray@checkray.app`)
- [ ] Add env vars:
  ```
  RESEND_API_KEY=re_xxx
  FROM_EMAIL=Ray at CheckRay <ray@checkray.app>
  APP_URL=https://checkray.app
  ```
- [ ] Install Resend SDK:
  ```bash
  pnpm add resend
  ```
- [ ] Create `lib/notifications/resend.ts`:
  ```ts
  import { Resend } from 'resend'
  export const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null
  ```

---

## 2. Unsubscribe tokens

- [ ] Add `unsubscribe_token uuid default gen_random_uuid()` column to `notification_preferences`
- [ ] Create `GET /api/notifications/unsubscribe?token=<token>` route:
  - Finds row by token
  - Sets `weekly_email_enabled=false`, `unsubscribed_at=now()`
  - Returns a plain "You've been unsubscribed" page
- [ ] Include unsubscribe URL in every email:
  ```
  ${APP_URL}/api/notifications/unsubscribe?token=${row.unsubscribe_token}
  ```

---

## 3. Weekly email sender

- [ ] Create `app/api/cron/weekly-scam-watch/route.ts` (or use Vercel Cron):
  ```ts
  // Runs every Monday at 9am UTC
  // 1. SELECT * FROM notification_preferences WHERE weekly_email_enabled = true
  // 2. For each user: fetch email from auth.users
  // 3. Build template with buildWeeklyScamWatchTemplate(unsubscribeUrl, checkUrl)
  // 4. Send via resend.emails.send(...)
  // 5. Log to sent_emails table
  ```
- [ ] Add `vercel.json` cron config:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/weekly-scam-watch",
        "schedule": "0 9 * * 1"
      }
    ]
  }
  ```
- [ ] Protect cron route with `CRON_SECRET` header check

---

## 4. Sent email log (optional but recommended)

```sql
create table if not exists public.sent_emails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  email_type text not null,
  sent_at    timestamptz not null default now(),
  resend_id  text null
);
```

- Log every sent email with `resend_id` for debugging
- Check log before sending to avoid duplicate sends on retry

---

## 5. Never email unsubscribed users

- Always filter: `WHERE weekly_email_enabled = true`
- Double-check `unsubscribed_at IS NULL` as a safety guard
- Honour Resend's suppression list as well

---

## 6. Weekly content management (future)

- [ ] Store weekly tips in a `weekly_scam_tips` table so content can be updated without code changes
- [ ] Admin UI to draft and preview editions
- [ ] Preview endpoint: `GET /api/notifications/preview-weekly` — renders email for current user

---

## Current status

| Feature | Status |
|---|---|
| `notification_preferences` table | ✅ Migration created |
| Dashboard toggle UI | ✅ `ScamWatchCard` component |
| API route to update prefs | ✅ `POST /api/notifications/preferences` |
| Email template (HTML + text) | ✅ `lib/notifications/templates.ts` |
| Resend SDK | ❌ Not installed |
| Unsubscribe token | ❌ Not implemented |
| Weekly cron sender | ❌ Not implemented |
| Sent email log | ❌ Not implemented |
