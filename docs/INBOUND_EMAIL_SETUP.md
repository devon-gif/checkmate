# INBOUND_EMAIL_SETUP.md — `ray@checkray.app` (Stage 3, gated MVP)

## Current state

**Stage 3 is implemented.** `/api/inbound/email` now:

1. Verifies the webhook signature (Resend / Svix HMAC).
2. Parses sender / recipient / subject / text / html from the payload —
   provider-agnostic, supports Resend's `data.*` nested envelope, the
   flat `{from,to,subject,text}` shape used by Mailgun and curl tests,
   and a few common synonyms.
3. Logs every delivery to `public.inbound_email_log` with a unique
   `(provider, provider_msg_id)` index. Provider retries short-circuit
   as `duplicate`.
4. Gates the sender:
   - active non-expired row in `beta_access` → allowed (mapped to the
     beta tier's monthly cap)
   - active or trialing `user_billing` → allowed (paid plan limits)
   - `past_due` subscription → blocked (payment-issue reply)
   - everything else → blocked (sign-up-or-request-beta reply)
   - over the monthly cap → over-limit reply
5. On the allowed path, calls the existing `analyzeCase()` (same one
   the web app uses), saves `cases` + `risk_reports`, logs a
   `usage_events('check_created')` row, and sends the "Ray checked
   your email" reply.

**The analyzer is never called for unknown / over-limit / blocked
senders.** That's the cost protection.

**What's not done yet:** automated DNS / inbound MX routing (see the
provider section below). IONOS still forwards `ray@checkray.app` →
your Gmail inbox, which is fine for you reading manually, but **that
forwarding alone does not call this webhook**.

## Webhook URL

```
https://www.checkray.app/api/inbound/email
```

(`https://checkray.app/api/inbound/email` works too — both resolve
to the same Vercel deployment.)

## Required Vercel env vars

| Variable | Scope | Required? | Notes |
|---|---|---|---|
| `RESEND_INBOUND_WEBHOOK_SECRET` | **Sensitive** | yes in prod | Resend's `whsec_…` signing secret. In dev (NODE_ENV !== production) it's optional so local curl tests work. |
| `RESEND_API_KEY` | **Sensitive** | for replies | Same key the rest of the app already uses to send email. Without it, gating still works but the reply email is skipped (logged as `reply_failed`). |
| `RESEND_FROM_EMAIL` | server | optional | Defaults to `CheckRay <noreply@checkray.app>`. |
| `INBOUND_EMAIL_ADDRESS` | server | optional | Defaults to `ray@checkray.app`. Used for the loop guard. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sensitive** | yes | Same key billing uses. Required to look up beta_access, user_billing, write cases. |
| `NEXT_PUBLIC_SUPABASE_URL` | public | yes | |
| `NEXT_PUBLIC_APP_URL` | public | yes | Used to build the dashboard link in the reply email. |

After changing any of these, redeploy with build cache disabled.

## Required SQL migrations (one-time)

Apply these in the Supabase SQL editor **before** rolling Stage 3 to
production. Both are idempotent.

| Migration | What it adds |
|---|---|
| `supabase/migrations/20260527120000_add_beta_access.sql` | The `beta_access` table the gate reads. |
| `supabase/migrations/20260528120000_add_beta_requests.sql` | The pending-request queue, used by `/admin`. |
| `supabase/migrations/20260529120000_add_inbound_email_log.sql` | **Required for Stage 3.** Idempotency + audit log. |

After applying, force a schema-cache reload: `notify pgrst, 'reload schema';`

## How the gate decides

```
┌──────────────────────────────────────────────────────────────┐
│ POST /api/inbound/email                                      │
│                                                              │
│ 1. signature check ───── (401 if invalid in prod)            │
│ 2. parse JSON ────────── (400 if invalid)                    │
│ 3. duplicate? ────────── (200, action: duplicate)            │
│ 4. spam guard ────────── (200, action: rejected_spam)        │
│         │                                                    │
│         ▼                                                    │
│ 5. beta_access active for sender?                            │
│         │ yes                       │ no                     │
│         ▼                           ▼                        │
│   plan = beta plan          billing.status active/trialing?  │
│   isAllowed = true                  │ yes        │ no        │
│                                     ▼            ▼           │
│                              plan = paid    past_due?        │
│                              isAllowed = true   │            │
│                                                 ▼            │
│                                          blocked reply       │
│         │                                       │            │
│         ▼                                       ▼            │
│ 6. count usage_events this month            (no analysis)    │
│ 7. canCreateCheck(plan, status, used)?                       │
│      │ allowed                       │ blocked               │
│      ▼                               ▼                       │
│ 8. analyzeCase() ─→ save        over-limit reply             │
│    case + report + usage         (no analysis)               │
│ 9. send "Ray checked your email"                             │
└──────────────────────────────────────────────────────────────┘
```

Every branch writes one row to `inbound_email_log` with a stable
`outcome` value (analyzed / unknown_sender / beta_expired / over_limit
/ past_due / no_user_record / duplicate / rejected_spam /
webhook_invalid / analyzer_error / save_failed / reply_failed).

## Local webhook testing (no DNS required)

The route accepts a simple flat JSON payload in dev mode. With
`RESEND_INBOUND_WEBHOOK_SECRET` unset locally, no signature is checked.

Start the dev server:

```bash
pnpm dev
```

### Test 1 — approved beta sender (allowed path)

First grant beta access in `/admin/billing-test` or via the
beta-testers admin form. Then:

```bash
curl -s -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{
    "from":    "your-beta-tester@example.com",
    "to":      "ray@checkray.app",
    "subject": "Recruiter asking for $200 equipment deposit",
    "text":    "Hi! You are hired for a remote data entry role at GlobalSoft. Please reply YES and send a $200 deposit for your equipment. We will send a check first."
  }' | jq
```

Expected response (HTTP 200):

```json
{
  "ok": true,
  "received": true,
  "action": "analyzed",
  "case_id": "…",
  "save_error": null,
  "reply_sent": true
}
```

Verify:
- a new row in `cases` for that user
- a new row in `risk_reports`
- a new row in `usage_events`
- a new `inbound_email_log` row with `outcome = analyzed`
- a "Ray checked your email" email in the tester's inbox

### Test 2 — unknown sender (blocked)

```bash
curl -s -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "stranger@nowhere.example",
    "to":   "ray@checkray.app",
    "subject": "hello",
    "text": "is this a real service"
  }' | jq
```

Expected: `action: "unknown_sender"`. No `cases` row. A "Finish setting
up CheckRay to email Ray" reply.

### Test 3 — expired or revoked beta

Set the tester's `beta_access.expires_at` to a past date (admin SQL
editor) or click **Revoke** in `/admin`. Repeat Test 1. Expected:
`action: "blocked"` and the same blocked reply as Test 2.

### Test 4 — paid user (allowed)

In `/admin/billing-test`, set your account to "Basic / active". From an
email that matches your account:

```bash
curl -s -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{
    "from":    "you@your-domain.com",
    "to":      "ray@checkray.app",
    "subject": "Suspicious bill from county clerk?",
    "text":    "I got a $45 bill from a county clerk office in Iowa asking for credit card payment by today or my driver license will be suspended."
  }' | jq
```

Expected: `action: "analyzed"`.

### Test 5 — over-limit

Same setup as Test 4, but first run 10 checks (Basic = 10 / month) via
`/cases/new` or by repeating the curl. The 11th call returns
`action: "over_limit"` and a "CheckRay limit reached" reply.

### Test 6 — idempotency

Repeat any successful call with the same `id` in the payload:

```bash
curl -s -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{ "id": "msg_test_001", "from": "...", "to": "...", "text": "..." }'
```

The second call returns `action: "duplicate"` and creates no new rows.

### Test 7 — spam/loop guard

Sending from `ray@checkray.app` itself, or with an `Auto-Submitted`
header, returns `action: "rejected_spam"` with no analysis:

```bash
curl -s -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -H 'Auto-Submitted: auto-replied' \
  -d '{ "from":"you@x.com", "to":"ray@checkray.app", "subject":"OOO", "text":"I am away." }'
```

## How real inbound email must be wired

Right now `ray@checkray.app` is a forwarding alias at IONOS pointing at
your Gmail. **That forwarding cannot trigger the webhook** — IONOS has
no concept of an HTTPS callback. You need to swap the MX route to a
provider that does inbound-to-webhook.

Four options, in rough order of "least effort to a working production
flow":

### A. Resend inbound (recommended)

Already what the signature verifier expects. Steps:

1. Resend dashboard → **Domains** → add `checkray.app` (or
   `inbound.checkray.app`) → add the DNS records Resend prints (MX,
   SPF, DKIM, optional DMARC).
2. Resend → **Inbound** → **+ Add inbound** → match `ray@checkray.app`,
   destination type **Webhook**, URL
   `https://www.checkray.app/api/inbound/email`.
3. Copy the `whsec_…` signing secret → Vercel `RESEND_INBOUND_WEBHOOK_SECRET`
   (Production scope).
4. Update IONOS DNS to point the new MX records at Resend's inbound
   servers (Resend's UI shows the exact target). Remove the IONOS-to-Gmail
   forwarding for `ray@…` so messages stop double-delivering.

### B. SendGrid Inbound Parse

Set an MX record pointing at `mx.sendgrid.net`, then in SendGrid
**Settings → Inbound Parse** add a hostname route → POST URL =
`https://www.checkray.app/api/inbound/email`. SendGrid sends
multipart/form-data, which our parser would need a small adapter for —
not zero-effort. Stick with Resend if possible.

### C. Mailgun Routes

Similar shape: MX → `mxa.mailgun.org`, in Mailgun create a route with
"store and notify" + your URL. Our parser already accepts the flat
Mailgun-style payload (`from`, `subject`, `body-plain`), but the
signature header format is `X-Mailgun-Signature-*` — the current
verifier expects Svix-style, so you'd need to swap signature logic.

### D. Cloudflare Email Routing + Worker

Cheapest. Cloudflare's Email Routing terminates the MX, a Worker
forwards a JSON envelope to the route. No native webhook signing — set
up your own HMAC or rely on a shared `X-Internal-Auth` header.

**Operational warning if you do A and want zero downtime:** the moment
the MX flip propagates, mail stops landing in your IONOS / Gmail
inbox. Make sure the webhook + DB migrations are live first, then flip
DNS during a quiet window.

## Provider/webhook formats supported

The parser deliberately tries multiple envelopes:

- `data.from / data.to / data.subject / data.text / data.html / data.id`
  (Resend, Svix-wrapped)
- `message.from / message.subject / …` (some Mailgun integrations)
- Top-level `from / to / subject / text / html / id` (curl tests,
  Cloudflare Worker, Mailgun "store and notify" parse)
- `attachments[]` array OR `attachment-count` numeric header — both
  flag as `has_attachments` (currently unsupported; logged for the
  operator and the email still gets analyzed via text/html body)

Each `from`/`to` value can be a string, `{email, name}` object, or an
array of either (we pick the first).

## What logs to check in Vercel

Vercel → project → **Functions** → filter by path `/api/inbound/email`.
Each delivery is one invocation. Look for:

- `[inbound/email] received:` → request landed (every call)
- `action: "analyzed"` → happy path
- `action: "unknown_sender"` / `"blocked"` → gate denied
- `action: "duplicate"` → idempotent replay (no DB writes)
- `signature verification failed:` → wrong secret on this deploy

For deeper forensics, query `public.inbound_email_log` directly —
sender_email, subject, outcome, error_message, received_at are all
there, one row per delivery.

## What still needs DNS / provider setup

| Item | Required for | Done? |
|---|---|---|
| Pick a provider (Resend recommended) | any automation at all | not yet |
| Add MX + SPF + DKIM records on `checkray.app` (or subdomain) | provider can receive | not yet |
| Set up inbound webhook in the provider dashboard | provider can POST us | not yet |
| Set `RESEND_INBOUND_WEBHOOK_SECRET` in Vercel | signature check works | not yet |
| Apply `20260529120000_add_inbound_email_log.sql` migration | idempotency + audit | not yet |
| Remove IONOS → Gmail forwarding for `ray@…` once provider is live | avoid double-delivery | not yet |
| Confirm `RESEND_API_KEY` is set in Vercel | reply emails go out | already in place for /beta/request |

## Honesty note for the user-facing email

The "approved beta" email (sent at grant time, separate file) tells the
user "you can also email Ray at ray@checkray.app" and adds **"For now,
email checks may be reviewed manually while we finish automatic email
intake."** Keep that copy honest until item A above is fully live.

## Disable / rollback

To pause inbound automation without redeploying code:

1. Vercel env → delete `RESEND_INBOUND_WEBHOOK_SECRET` (Production).
2. Endpoint now returns 503 `webhook_not_configured`. Resend will
   retry then give up — incoming mail effectively pauses.
3. Or pause the inbound route in the Resend dashboard for an instant
   stop.

To fully remove: delete the inbound route in Resend, then delete
`app/api/inbound/email/route.ts` in a follow-up PR.

## Related docs

- `docs/STRIPE_BILLING_SETUP.md` — Stripe webhook pattern (different
  secret, same shape).
- `docs/USAGE_LIMITS.md` — the plan caps Stage 3's gate consumes.
- `docs/ADMIN_BILLING_TEST_MODE.md` — admin tools for flipping plans
  while testing the gate.
- `lib/billing/inbound-reply-email.ts` — the three reply templates.
- `lib/db/user-lookup.ts` — `findUserByEmail` (with auth.users
  fallback + public.users backfill).
