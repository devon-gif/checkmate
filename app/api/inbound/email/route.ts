/**
 * POST /api/inbound/email
 *
 * Stage 1 of the inbound-email pipeline. This endpoint is intentionally
 * a SMOKE TEST — it only verifies the Resend webhook signature and logs
 * safe metadata so we can confirm the DNS + webhook plumbing works end
 * to end before adding any expensive behaviour.
 *
 * Future stages (NOT in this route yet, by design):
 *   - look up the sender's CheckRay account
 *   - run lib/billing/access checkAccess + plan limits
 *   - call analyzeCase() (OpenAI)
 *   - save case + risk_reports + usage_events
 *   - send a reply email via Resend
 *
 * Until those stages land, this route MUST stay cheap and side-effect-free:
 * verify, log, 200 OK. That way every webhook hit costs us a function
 * invocation, nothing else — important because unknown senders / spam
 * targeting ray@checkray.app could otherwise drain our OpenAI budget.
 *
 * Security contract:
 *   - RESEND_INBOUND_WEBHOOK_SECRET is server-only. Never logged.
 *   - In production a missing secret returns 503 (won't quietly accept
 *     anonymous POSTs to a public URL).
 *   - In non-production a missing secret logs a warning and accepts the
 *     request so local smoke tests don't need the secret.
 *   - Invalid signature → 401. Bad JSON → 400. Success → 200.
 *   - We NEVER log the email body, HTML, or headers. Only a masked
 *     from/to, subject length, and which body parts were present.
 *
 * Svix signing (Resend uses Svix under the hood):
 *   Headers: svix-id, svix-timestamp, svix-signature ("v1,<b64> ...")
 *   Signed payload: `${id}.${timestamp}.${rawBody}`
 *   HMAC-SHA256 with secret base64-decoded from `whsec_<...>`
 *   We also accept the generic `webhook-*` aliases in case a future
 *   Resend client renames the headers.
 */
import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INBOUND_EMAIL_ADDRESS =
  process.env.INBOUND_EMAIL_ADDRESS ?? 'ray@checkray.app'

// Replay-protection window: Svix recommends 5 minutes either side of now.
const REPLAY_TOLERANCE_SECONDS = 5 * 60

interface VerifyResult {
  valid: boolean
  reason?: string
}

/**
 * Svix-style HMAC verification. Resend's inbound webhook signs each
 * delivery via Svix; the protocol is:
 *   1. Concatenate `${id}.${timestamp}.${rawBody}`
 *   2. HMAC-SHA256 with the base64-decoded secret (strip `whsec_` prefix)
 *   3. Compare base64-encoded result against any `v1,<sig>` token in the
 *      `svix-signature` header (space-separated).
 *
 * Any one matching `v1` signature passes; this lets Resend rotate the
 * signing secret without breaking in-flight deliveries (they send the
 * new sig alongside the old for the rotation window).
 */
function verifySignature({
  secret,
  body,
  headers
}: {
  secret: string
  body: string
  headers: Headers
}): VerifyResult {
  const id = headers.get('svix-id') ?? headers.get('webhook-id')
  const timestamp =
    headers.get('svix-timestamp') ?? headers.get('webhook-timestamp')
  const signatureHeader =
    headers.get('svix-signature') ?? headers.get('webhook-signature')

  if (!id || !timestamp || !signatureHeader) {
    return { valid: false, reason: 'missing_signature_headers' }
  }

  const tsNum = Number(timestamp)
  if (!Number.isFinite(tsNum)) {
    return { valid: false, reason: 'invalid_timestamp' }
  }
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsNum) > REPLAY_TOLERANCE_SECONDS) {
    return { valid: false, reason: 'timestamp_outside_tolerance' }
  }

  // Strip the `whsec_` prefix Resend/Svix adds, then base64-decode.
  const secretB64 = secret.startsWith('whsec_')
    ? secret.slice('whsec_'.length)
    : secret

  // We use Uint8Array (not Buffer) for the HMAC key and signature
  // comparison to keep @types/node happy under strict TS — Buffer is
  // technically a subclass of Uint8Array but the new ArrayBufferLike
  // generic in @types/node makes the implicit cast unsafe.
  let keyBytes: Uint8Array
  try {
    keyBytes = new Uint8Array(Buffer.from(secretB64, 'base64'))
  } catch {
    return { valid: false, reason: 'invalid_secret_encoding' }
  }

  const signedPayload = `${id}.${timestamp}.${body}`
  const expected = createHmac('sha256', keyBytes)
    .update(signedPayload)
    .digest('base64')

  // Try every `v1,<sig>` token in the header.
  const candidates = signatureHeader.split(' ')
  for (const cand of candidates) {
    const [version, sig] = cand.split(',')
    if (version !== 'v1' || !sig) continue
    try {
      const expectedBuf = new Uint8Array(Buffer.from(expected, 'base64'))
      const candBuf = new Uint8Array(Buffer.from(sig, 'base64'))
      if (
        expectedBuf.length === candBuf.length &&
        timingSafeEqual(expectedBuf, candBuf)
      ) {
        return { valid: true }
      }
    } catch {
      // Bad base64 in the candidate — skip it, try the next.
      continue
    }
  }

  return { valid: false, reason: 'signature_mismatch' }
}

/** "alice@example.com" → "a***@example.com" — safe to log. */
function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '(none)'
  return email.replace(
    /^(.).*?(@.*)$/,
    (_m, first: string, domain: string) => `${first}***${domain}`
  )
}

/**
 * The Resend inbound payload shape isn't fully stable yet — extract
 * common fields from the most likely envelopes without crashing on a
 * shape we haven't seen. Anything we can't find becomes `null`, and
 * that null shows up in the safe log line so we can tune later.
 */
function extractSafeFields(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return {
      providerMessageId: null,
      fromEmail: null,
      toEmail: null,
      subjectLength: 0,
      hasText: false,
      hasHtml: false
    }
  }

  const root = payload as Record<string, unknown>
  const data =
    (root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : null) ??
    (root.message && typeof root.message === 'object'
      ? (root.message as Record<string, unknown>)
      : null) ??
    root

  const pickEmail = (value: unknown): string | null => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      if (typeof obj.email === 'string') return obj.email
    }
    if (Array.isArray(value) && value.length > 0) {
      return pickEmail(value[0])
    }
    return null
  }

  return {
    providerMessageId:
      (typeof data.id === 'string' && data.id) ||
      (typeof data.message_id === 'string' && data.message_id) ||
      (typeof root.id === 'string' && root.id) ||
      null,
    fromEmail: pickEmail(data.from ?? root.from),
    toEmail: pickEmail(data.to ?? root.to ?? INBOUND_EMAIL_ADDRESS),
    subjectLength: typeof data.subject === 'string' ? data.subject.length : 0,
    hasText: typeof data.text === 'string' && data.text.length > 0,
    hasHtml: typeof data.html === 'string' && data.html.length > 0
  }
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  const isProd = process.env.NODE_ENV === 'production'

  // In production, refuse to accept anonymous POSTs. The URL is public;
  // without a signature check, anything could hit it.
  if (!secret) {
    if (isProd) {
      console.error(
        '[inbound/email] RESEND_INBOUND_WEBHOOK_SECRET is not set; refusing request in production.'
      )
      return NextResponse.json(
        {
          ok: false,
          error: 'webhook_not_configured',
          message: 'Inbound email webhook is not configured on this deployment.'
        },
        { status: 503 }
      )
    }
    console.warn(
      '[inbound/email] RESEND_INBOUND_WEBHOOK_SECRET is not set; accepting request because NODE_ENV is not production.'
    )
  }

  // Read the raw body BEFORE JSON parsing — the signature is computed
  // over the exact bytes Resend sent.
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch (err) {
    console.warn(
      '[inbound/email] could not read request body:',
      err instanceof Error ? err.message : 'unknown'
    )
    return NextResponse.json(
      { ok: false, error: 'invalid_request' },
      { status: 400 }
    )
  }

  if (secret) {
    const result = verifySignature({
      secret,
      body: rawBody,
      headers: req.headers
    })
    if (!result.valid) {
      console.warn(
        `[inbound/email] signature verification failed: reason=${result.reason ?? 'unknown'}`
      )
      return NextResponse.json(
        { ok: false, error: 'invalid_signature' },
        { status: 401 }
      )
    }
  }

  // Parse JSON for the safe-fields extraction. Malformed body is a bug
  // upstream — log and 400.
  let payload: unknown
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {}
  } catch {
    console.warn('[inbound/email] body is not valid JSON')
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 }
    )
  }

  const safe = extractSafeFields(payload)

  // Single structured log line. Never includes the email body, HTML,
  // headers, or any token. provider_msg_id is opaque (just a UUID-ish
  // identifier Resend gives us) so it's safe to log raw.
  console.log(
    '[inbound/email] received: ' +
      `provider_msg_id=${safe.providerMessageId ?? '(none)'} ` +
      `from=${maskEmail(safe.fromEmail)} ` +
      `to=${maskEmail(safe.toEmail)} ` +
      `subject_len=${safe.subjectLength} ` +
      `has_text=${safe.hasText} ` +
      `has_html=${safe.hasHtml}`
  )

  return NextResponse.json({ ok: true, received: true })
}
