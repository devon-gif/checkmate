# INBOUND_EMAIL_SETUP.md — `ray@checkray.app` (Stage 1)

This is the operational guide for the **smoke-test** stage of the
inbound-email pipeline. The endpoint at `/api/inbound/email` is live
and verifies Resend's webhook signature, but it deliberately does NOT:

- look up the sender's CheckRay account
- enforce plan / usage limits
- call OpenAI / the analyzer
- save a case or report
- send a reply email

Those stages will land in subsequent commits. Stage 1 only confirms
DNS → Resend → our webhook works end to end.

## Webhook URL

```
https://www.checkray.app/api/inbound/email
```

(Or `https://checkray.app/api/inbound/email` — both must point to the
same Vercel deployment; use whichever matches your canonical domain.)

## Required Vercel env vars

| Variable | Scope | Value | Notes |
|---|---|---|---|
| `RESEND_INBOUND_WEBHOOK_SECRET` | **Sensitive** (server-only) | `whsec_...` | Copy from Resend → Inbound → your route → Signing secret. Server-only — never expose. |
| `INBOUND_EMAIL_ADDRESS` | Server | `ray@checkray.app` | Used in copy / loop-detection later. Optional in Stage 1. |

After setting these, redeploy with build cache disabled (Vercel →
Deployments → ⋯ → Redeploy → uncheck "Use existing Build Cache").
Server env vars are read at runtime, but the redeploy ensures the
runtime workers pick up the new values on the next request.

## Resend setup steps (one-time)

1. **Verify a domain.** Resend dashboard → **Domains** → add
   `checkray.app` (or a dedicated subdomain like `inbound.checkray.app`).
2. **Add DNS records** Resend prints — typically:
   - `MX` → `feedback-smtp.<region>.amazonses.com`
   - `TXT` (SPF) → `v=spf1 include:amazonses.com ~all`
   - `CNAME` × 3 (DKIM)
   - Optional `TXT` (DMARC) → `v=DMARC1; p=quarantine; rua=mailto:dmarc@checkray.app`
3. **Wait for verification** — usually a few minutes; Resend shows ✅.
4. **Create the inbound route.** Resend → **Inbound** → **+ Add inbound**:
   - Match address: `ray@checkray.app`
   - Destination type: **Webhook**
   - URL: `https://www.checkray.app/api/inbound/email`
5. **Copy the signing secret** Resend generates (starts with `whsec_`).
   Paste it into Vercel as `RESEND_INBOUND_WEBHOOK_SECRET` for the
   **Production** scope.
6. **Redeploy** with build cache disabled.

## Signature verification

We verify the signature ourselves using Node's `crypto`, no `svix`
dependency required. The check:

- Headers: `svix-id`, `svix-timestamp`, `svix-signature`
  (we also accept the generic `webhook-*` aliases).
- Signed payload: `${svix_id}.${svix_timestamp}.${rawBody}`.
- HMAC-SHA256 with the secret base64-decoded from `whsec_<base64>`.
- Compare base64 result against any `v1,<sig>` token in the header
  (Svix sends multiple during a key rotation).
- Reject deliveries whose timestamp is > 5 minutes out of sync — basic
  replay protection.

| Condition | Response |
|---|---|
| Secret unset in Production | `503 webhook_not_configured` |
| Secret unset in dev | warn + accept (so local smoke tests work without the secret) |
| Headers missing | `401 invalid_signature` |
| Timestamp too old/future | `401 invalid_signature` |
| HMAC mismatch | `401 invalid_signature` |
| Body not JSON | `400 invalid_json` |
| Valid | `200 { ok: true, received: true }` |

## What we log (and what we don't)

**Per request, exactly one structured log line:**

```
[inbound/email] received: provider_msg_id=msg_abc123 from=a***@example.com to=r***@checkray.app subject_len=42 has_text=true has_html=true
```

**Never logged:**
- The webhook secret
- The email body / HTML
- Full email headers
- Full from/to addresses (always masked as `first-char + *** + @domain`)
- Subject text (only its length)

If you need to debug a specific email's content during Stage 1, do it
in Resend's dashboard — they store the inbound payload there for ~30
days. We do not.

## How to test

### Live test (after Resend setup is done)

1. Send an email from any inbox to `ray@checkray.app`.
2. Open Vercel → **your project → Functions → Logs** and filter for
   `[inbound/email]`. You should see one structured line within a few
   seconds.
3. The endpoint returns 200 immediately, but Stage 1 sends no reply.
   You won't get an email back yet — that's normal.

### Sanity check with curl (no signature)

```bash
# In production this should return 401 (no signature) — verifying that
# the endpoint isn't accepting unauthenticated POSTs.
curl -i -X POST https://www.checkray.app/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected: `HTTP/2 401` and `{"ok":false,"error":"invalid_signature"}`.
If you get `503 webhook_not_configured`, the env var hasn't been set
or the deployment is stale.

### Local test (with secret missing)

```bash
# In NODE_ENV=development the endpoint logs a warning and accepts.
curl -i -X POST http://localhost:3000/api/inbound/email \
  -H 'Content-Type: application/json' \
  -d '{"data":{"from":"you@example.com","to":"ray@checkray.app","subject":"test","text":"hello"}}'
```

Expected: `200 {"ok":true,"received":true}` and a `[inbound/email]
received:` log line in your `pnpm dev` console.

## What logs to check in Vercel

- Vercel → project → **Functions** tab → filter by path
  `/api/inbound/email`. Each delivery is one invocation.
- Look for `[inbound/email] received:` → success.
- Look for `[inbound/email] signature verification failed` → wrong
  secret or replay.
- Look for `[inbound/email] body is not valid JSON` → Resend changed
  payload encoding (rare).
- Look for `RESEND_INBOUND_WEBHOOK_SECRET is not set` → env var missing
  in this environment.

## Security guarantees

- Webhook secret is `RESEND_INBOUND_WEBHOOK_SECRET` (no `NEXT_PUBLIC_`
  prefix) so it cannot reach the client bundle.
- Endpoint never reads `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
  or any Stripe key in Stage 1.
- Endpoint touches no database table in Stage 1. Cost per request is
  one Vercel function invocation and that's it.
- Endpoint never modifies billing state, never weakens admin auth,
  never changes the analyzer response shape.

## Disable / rollback

To disable the endpoint without redeploying code:

1. Vercel → env vars → **delete** `RESEND_INBOUND_WEBHOOK_SECRET` in
   Production.
2. Next request returns 503 with `webhook_not_configured`.
3. Resend will retry per its policy; once it gives up, deliveries are
   effectively paused. (Or: pause the route in Resend's dashboard for
   an immediate stop.)

To fully remove: delete the inbound route in Resend, then delete
`app/api/inbound/email/route.ts` in the next PR.

## Related docs

- `docs/STRIPE_BILLING_SETUP.md` — Stripe webhook setup (different
  webhook secret, different route, same general pattern).
- `docs/USAGE_LIMITS.md` — the plan caps that Stage 4 will enforce
  when a known sender hits the endpoint.
- `docs/SECURITY_BOUNDARIES.md` — server-only / client boundary rules.
