/**
 * POST /api/inbound/email — Stage 3 (gated analysis + reply)
 *
 * Flow:
 *   1. Verify webhook signature (Resend/Svix HMAC).
 *      In dev (NODE_ENV !== production) the secret check is optional so
 *      local curl-based testing works without a Resend account.
 *   2. Parse the incoming JSON, normalize sender/subject/body across
 *      a few common provider envelopes (Resend nested `.data.*`,
 *      Mailgun flat, simple `{from,to,subject,text}`, etc.).
 *   3. Idempotency: insert into `inbound_email_log` using
 *      `provider + provider_msg_id` as the unique key. If we already
 *      have a row for this message id, short-circuit `duplicate` and
 *      return 200 (Resend retries are at-least-once).
 *   4. Gate the sender:
 *        a. spam loop guard (`from == ray@…` or `Auto-Submitted`)
 *        b. is there a `public.users` row for them?
 *        c. is there an active/trialing paid subscription?
 *        d. if not paid, is the email on `beta_access` and still active?
 *        e. resolve plan → monthly limit → check usage_events count
 *      If any gate fails, log the outcome and send the matching reply
 *      email (blocked / over_limit) — never call the analyzer.
 *   5. Allowed path: call `analyzeCase()`, save `cases` + `risk_reports`,
 *      log `usage_events('check_created')`, send the "Ray checked your
 *      email" reply. Persistence failures are logged and the reply
 *      email still goes out so the user isn't ghosted.
 *
 * Return value: ALWAYS 200 once the signature is valid. Inbound
 * providers retry on non-2xx, which would double-bill us. The internal
 * outcome is stored in `inbound_email_log.outcome` for forensics.
 *
 * Cost protection: unknown senders never reach the analyzer. The only
 * paths that call OpenAI are the gated ones, which require a real beta
 * grant or an active/trialing paid subscription.
 */
import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

import { analyzeCase } from '@/lib/checkmate'
import type { CaseCategory } from '@/lib/checkmate-shared'
import { ensureDisclaimer } from '@/lib/checkray-core'
import {
  getActiveBetaAccessForEmail,
  betaPlanToBasePlan,
  normalizeBetaEmail,
  type BetaAccessRow
} from '@/lib/billing/beta-access'
import {
  sendInboundAllowedReply,
  sendInboundBlockedReply,
  sendInboundUnableReply,
  sendInboundOverLimitReply
} from '@/lib/billing/inbound-reply-email'
import { canCreateCheck } from '@/lib/billing/plan-limits'
import { findUserByEmail } from '@/lib/db/user-lookup'
import { saveCase } from '@/lib/db/save-case'
import { saveReport } from '@/lib/db/save-report'
import { logUsageEvent } from '@/lib/db/log-usage-event'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const INBOUND_EMAIL_ADDRESS =
  process.env.INBOUND_EMAIL_ADDRESS ?? 'ray@inbound.checkray.app'
const REPLAY_TOLERANCE_SECONDS = 5 * 60
const MAX_ANALYZABLE_CHARS = 20_000
const MAX_RAW_EMAIL_CHARS = 100_000

// ─── 1. Webhook signature verification ────────────────────────────────────

interface VerifyResult {
  valid: boolean
  reason?: string
}

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

  const secretB64 = secret.startsWith('whsec_')
    ? secret.slice('whsec_'.length)
    : secret
  let keyBytes: Uint8Array
  try {
    keyBytes = new Uint8Array(Buffer.from(secretB64, 'base64'))
  } catch {
    return { valid: false, reason: 'invalid_secret_encoding' }
  }

  const expected = createHmac('sha256', keyBytes)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')

  for (const cand of signatureHeader.split(' ')) {
    const [version, sig] = cand.split(',')
    if (version !== 'v1' || !sig) continue
    try {
      const a = new Uint8Array(Buffer.from(expected, 'base64'))
      const b = new Uint8Array(Buffer.from(sig, 'base64'))
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return { valid: true }
      }
    } catch {
      continue
    }
  }
  return { valid: false, reason: 'signature_mismatch' }
}

// ─── 2. Provider-agnostic payload extraction ──────────────────────────────

interface ParsedInbound {
  providerMessageId: string | null
  fromEmail: string | null
  toEmail: string | null
  subject: string
  text: string
  html: string
  hasAttachments: boolean
  /** Standard auto-reply hint header — caller uses this for loop detection. */
  autoSubmitted: string | null
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function pickEmail(value: unknown): string | null {
  if (typeof value === 'string') {
    const angleMatch = value.match(/<([^<>@\s]+@[^<>\s]+)>/)
    if (angleMatch?.[1]) return angleMatch[1]

    const plainMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    return plainMatch?.[0] ?? value
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.email === 'string') return obj.email
    if (typeof obj.address === 'string') return obj.address
  }
  if (Array.isArray(value) && value.length > 0) return pickEmail(value[0])
  return null
}

function parseInbound(payload: unknown, headers: Headers): ParsedInbound {
  const root = (payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>)
    : {}) as Record<string, unknown>

  // Resend / Svix wrap delivery in `data`; some providers use `message`.
  // We probe both, then fall back to the root for the flat shape.
  const data =
    (root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : null) ??
    (root.message && typeof root.message === 'object'
      ? (root.message as Record<string, unknown>)
      : null) ??
    root

  const subject = pickString(data.subject ?? root.subject)
  const text = pickString(data.text ?? root.text ?? root.body_plain)
  const html = pickString(data.html ?? root.html ?? root.body_html)

  // attachments[] (Resend), Attachment-Count (Mailgun) — either signal is fine
  const attachmentsRaw = data.attachments ?? root.attachments
  const attachmentCount =
    typeof root['attachment-count'] === 'string'
      ? Number(root['attachment-count'])
      : 0
  const hasAttachments =
    (Array.isArray(attachmentsRaw) && attachmentsRaw.length > 0) ||
    attachmentCount > 0

  const autoSubmitted =
    headers.get('auto-submitted') ??
    (typeof (data as any)['Auto-Submitted'] === 'string'
      ? (data as any)['Auto-Submitted']
      : null)

  return {
    providerMessageId:
      pickString(data.id ?? data.message_id ?? root.id ?? root.message_id) ||
      null,
    fromEmail: pickEmail(data.from ?? root.from),
    toEmail: pickEmail(data.to ?? root.to ?? INBOUND_EMAIL_ADDRESS),
    subject,
    text,
    html,
    hasAttachments,
    autoSubmitted
  }
}

/**
 * Best-effort plain-text extraction. Prefer the `text` part the provider
 * sent; fall back to a very minimal HTML→text strip when only HTML is
 * available. We cap at 20k chars to mirror the API zod limit.
 */
function deriveAnalyzableText(p: ParsedInbound): string {
  const fromText = p.text.trim()
  if (fromText.length > 0) return fromText.slice(0, MAX_ANALYZABLE_CHARS)

  if (p.html) {
    const stripped = p.html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return stripped.slice(0, MAX_ANALYZABLE_CHARS)
  }
  return ''
}

function isRawEmailTooLarge(p: ParsedInbound): boolean {
  return p.text.length + p.html.length > MAX_RAW_EMAIL_CHARS
}

function pickCategoryHint(input: string): CaseCategory {
  if (/https?:\/\/|www\./i.test(input)) return 'phishing_url'
  if (
    /\b(job|recruiter|resume|interview|hiring|position|role|remote work|employment|offer letter|equipment deposit)\b/i.test(
      input
    )
  ) {
    return 'job_scam_or_ghost_job'
  }
  if (
    /\b(invoice|bill|fee|payment|pay now|final notice|amount due|charge|deposit|receipt)\b/i.test(
      input
    )
  ) {
    return 'bill_or_fee'
  }
  return 'email'
}

function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '(none)'
  return email.replace(
    /^(.).*?(@.*)$/,
    (_m, first: string, domain: string) => `${first}***${domain}`
  )
}

// ─── 3. Service-role client + logging helpers ─────────────────────────────

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

type Outcome =
  | 'analyzed'
  | 'unknown_sender'
  | 'beta_expired'
  | 'over_limit'
  | 'past_due'
  | 'no_user_record'
  | 'duplicate'
  | 'rejected_spam'
  | 'webhook_invalid'
  | 'analyzer_error'
  | 'save_failed'
  | 'reply_failed'

interface LogPayload {
  provider?: string
  provider_msg_id?: string | null
  sender_email?: string | null
  to_email?: string | null
  subject?: string | null
  matched_user_id?: string | null
  case_id?: string | null
  outcome: Outcome
  http_status?: number
  error_message?: string | null
}

async function logInbound(sb: SupabaseClient | null, payload: LogPayload) {
  if (!sb) return
  const { error } = await sb.from('inbound_email_log' as any).insert({
    provider: payload.provider ?? 'resend',
    provider_msg_id: payload.provider_msg_id ?? null,
    sender_email: payload.sender_email ?? null,
    to_email: payload.to_email ?? null,
    subject: payload.subject ?? null,
    matched_user_id: payload.matched_user_id ?? null,
    case_id: payload.case_id ?? null,
    outcome: payload.outcome,
    http_status: payload.http_status ?? 200,
    error_message: payload.error_message ?? null
  })
  if (error) {
    console.error('[inbound/email] inbound_email_log insert failed:', error.message)
  }
}

/* ─── POST handler ────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  const isProd = process.env.NODE_ENV === 'production'

  // ── 1. Signature ──────────────────────────────────────────────────────
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
    const v = verifySignature({ secret, body: rawBody, headers: req.headers })
    if (!v.valid) {
      console.warn(
        `[inbound/email] signature verification failed: reason=${v.reason ?? 'unknown'}`
      )
      // Try to log this too — but with no body parse yet, we just store
      // the outcome. The service client may be null if Supabase env is
      // missing; that's fine, logging is best-effort.
      await logInbound(serviceClient(), {
        outcome: 'webhook_invalid',
        http_status: 401,
        error_message: v.reason ?? null
      })
      return NextResponse.json(
        { ok: false, error: 'invalid_signature' },
        { status: 401 }
      )
    }
  }

  let payload: unknown
  try {
    payload = rawBody.length > 0 ? JSON.parse(rawBody) : {}
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 }
    )
  }

  const parsed = parseInbound(payload, req.headers)
  const fromEmail = normalizeBetaEmail(parsed.fromEmail)

  // One structured log line per request — safe fields only.
  console.log(
    `[inbound/email] received: provider_msg_id=${parsed.providerMessageId ?? '(none)'} ` +
      `from=${maskEmail(fromEmail)} to=${maskEmail(parsed.toEmail)} ` +
      `subject_len=${parsed.subject.length} has_text=${parsed.text.length > 0} ` +
      `has_html=${parsed.html.length > 0} has_attachments=${parsed.hasAttachments}`
  )

  const sb = serviceClient()
  if (!sb) {
    // Without Supabase we can neither look up the sender nor analyze.
    // Return 200 so the provider doesn't retry; the operator will see
    // the warning above in the function logs.
    console.warn(
      '[inbound/email] Supabase service-role env missing — short-circuiting at 200 without action.'
    )
    return NextResponse.json({ ok: true, received: true, action: 'noop' })
  }

  // ── Loop / spam guards ──────────────────────────────────────────────
  if (parsed.autoSubmitted && parsed.autoSubmitted !== 'no') {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail || null,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      outcome: 'rejected_spam',
      error_message: `auto-submitted=${parsed.autoSubmitted}`
    })
    return NextResponse.json({ ok: true, received: true, action: 'rejected_spam' })
  }
  if (
    fromEmail &&
    fromEmail.toLowerCase() === INBOUND_EMAIL_ADDRESS.toLowerCase()
  ) {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      outcome: 'rejected_spam',
      error_message: 'sender == inbound address (loop guard)'
    })
    return NextResponse.json({ ok: true, received: true, action: 'rejected_spam' })
  }

  // ── 3. Idempotency: have we already processed this provider_msg_id? ──
  if (parsed.providerMessageId) {
    const { data: existing } = await sb
      .from('inbound_email_log' as any)
      .select('id, outcome')
      .eq('provider_msg_id', parsed.providerMessageId)
      .maybeSingle()
    if (existing) {
      console.log(
        `[inbound/email] duplicate delivery for provider_msg_id=${parsed.providerMessageId}; ignoring.`
      )
      // We do NOT write a new row — the unique index would reject it and
      // we don't want noise. Just 200 and short-circuit.
      return NextResponse.json({
        ok: true,
        received: true,
        action: 'duplicate'
      })
    }
  }

  // ── 4. Gating ────────────────────────────────────────────────────────
  if (!fromEmail || !fromEmail.includes('@')) {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail || null,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      outcome: 'unknown_sender',
      error_message: 'no parseable from address'
    })
    return NextResponse.json({ ok: true, received: true, action: 'unknown_sender' })
  }

  // 4a. Beta access — keyed by email, no user row required.
  let betaRow: BetaAccessRow | null = null
  try {
    betaRow = await getActiveBetaAccessForEmail(fromEmail, sb)
  } catch (err) {
    console.error(
      '[inbound/email] beta_access lookup threw (non-fatal):',
      err instanceof Error ? err.message : String(err)
    )
  }

  // 4b. Resolve auth user (so we can write cases / count usage). For beta
  //     users this may backfill `public.users` from `auth.users`.
  const user = await findUserByEmail(sb, fromEmail, {
    ensurePublicUserRow: true
  })

  // 4c. Look up active billing — paid (active) or paid-trial (trialing).
  let billing: {
    plan: string | null
    status: string | null
    isPaid: boolean
    isPastDue: boolean
  } = { plan: null, status: null, isPaid: false, isPastDue: false }

  if (user) {
    const { data: billingRow } = await sb
      .from('user_billing' as any)
      .select('plan, status')
      .eq('user_id', user.id)
      .maybeSingle()
    const b = billingRow as { plan: string | null; status: string | null } | null
    billing = {
      plan: b?.plan ?? null,
      status: b?.status ?? null,
      isPaid: b?.status === 'active' || b?.status === 'trialing',
      isPastDue: b?.status === 'past_due'
    }
  }

  // Compose final allow decision. Active/trialing paid access wins when
  // both exist so a beta grant cannot accidentally downgrade a paid user.
  const allowedByBeta = Boolean(betaRow)
  const allowedByPaid = billing.isPaid
  const effectivePlan = allowedByPaid
    ? billing.plan
    : betaRow
      ? betaPlanToBasePlan(betaRow.plan)
      : null
  const effectiveStatus = allowedByPaid ? billing.status : betaRow ? 'active' : null

  // Past-due is its own messaging path even when neither beta nor paid is
  // technically "allowed" — we want the user to see the right blocker.
  if (!allowedByBeta && !allowedByPaid) {
    const outcome: Outcome = billing.isPastDue
      ? 'past_due'
      : user
        ? 'unknown_sender' // user exists but no plan and no beta — treat as not-approved
        : 'unknown_sender'
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user?.id ?? null,
      outcome,
      error_message: billing.isPastDue
        ? 'subscription past_due'
        : 'no active beta_access and no active subscription'
    })
    const reply = await sendInboundBlockedReply({ toEmail: fromEmail })
    if (!reply.ok) {
      await logInbound(sb, {
        provider_msg_id: parsed.providerMessageId,
        sender_email: fromEmail,
        to_email: parsed.toEmail,
        subject: parsed.subject,
        matched_user_id: user?.id ?? null,
        outcome: 'reply_failed',
        error_message: reply.message
      })
    }
    return NextResponse.json({ ok: true, received: true, action: 'blocked' })
  }

  // We need a public.users row to write usage_events / cases / reports.
  // If the lookup couldn't backfill it (auth.users miss), log and still
  // send the allowed reply WITHOUT persisting — better than dropping the
  // user's email on the floor while they wait for sign-in to land.
  if (!user) {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      outcome: 'no_user_record',
      error_message: 'beta or paid but no auth.users row to attach to'
    })
    // Treat as blocked for now — sending a reply with analysis but no
    // dashboard link is worse than asking them to sign in first.
    await sendInboundBlockedReply({ toEmail: fromEmail })
    return NextResponse.json({
      ok: true,
      received: true,
      action: 'no_user_record'
    })
  }

  // 4d. Monthly usage gate.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: usedCount } = await sb
    .from('usage_events' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('event_type', 'check_created')
    .gte('created_at', monthStart)
  const usedThisMonth = usedCount ?? 0

  const gate = canCreateCheck({
    plan: effectivePlan,
    status: effectiveStatus,
    usedThisMonth
  })

  if (!gate.allowed) {
    const outcome: Outcome =
      gate.reason === 'past_due' ? 'past_due' : 'over_limit'
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user.id,
      outcome,
      error_message: gate.reasonText ?? null
    })
    const reply =
      outcome === 'past_due'
        ? await sendInboundBlockedReply({ toEmail: fromEmail })
        : await sendInboundOverLimitReply({ toEmail: fromEmail })
    if (!reply.ok) {
      await logInbound(sb, {
        provider_msg_id: parsed.providerMessageId,
        sender_email: fromEmail,
        to_email: parsed.toEmail,
        subject: parsed.subject,
        matched_user_id: user.id,
        outcome: 'reply_failed',
        error_message: reply.message
      })
    }
    return NextResponse.json({ ok: true, received: true, action: outcome })
  }

  // ── 5. Allowed path: analyze + save + reply ─────────────────────────
  if (isRawEmailTooLarge(parsed)) {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user.id,
      outcome: 'analyzer_error',
      error_message: 'email text/html content exceeded local processing limit'
    })
    const reply = await sendInboundUnableReply({
      toEmail: fromEmail,
      reason: 'too_large'
    })
    if (!reply.ok) {
      await logInbound(sb, {
        provider_msg_id: parsed.providerMessageId,
        sender_email: fromEmail,
        to_email: parsed.toEmail,
        subject: parsed.subject,
        matched_user_id: user.id,
        outcome: 'reply_failed',
        error_message: reply.message
      })
    }
    return NextResponse.json({ ok: true, received: true, action: 'too_large' })
  }

  const submittedText = deriveAnalyzableText(parsed)
  const combinedForAnalyzer = parsed.subject
    ? `${parsed.subject}\n\n${submittedText}`.slice(0, MAX_ANALYZABLE_CHARS)
    : submittedText

  if (!combinedForAnalyzer.trim()) {
    // Nothing to analyze. Log and bail — but still 200 so Resend doesn't
    // retry forever for an attachment-only or empty body.
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user.id,
      outcome: 'analyzer_error',
      error_message: parsed.hasAttachments
        ? 'attachment-only email — text extraction unsupported'
        : 'empty body'
    })
    const reply = await sendInboundUnableReply({
      toEmail: fromEmail,
      reason: parsed.hasAttachments ? 'attachments_unsupported' : 'empty'
    })
    if (!reply.ok) {
      await logInbound(sb, {
        provider_msg_id: parsed.providerMessageId,
        sender_email: fromEmail,
        to_email: parsed.toEmail,
        subject: parsed.subject,
        matched_user_id: user.id,
        outcome: 'reply_failed',
        error_message: reply.message
      })
    }
    return NextResponse.json({ ok: true, received: true, action: 'empty_body' })
  }

  let analysis
  try {
    analysis = await analyzeCase({
      text: combinedForAnalyzer,
      categoryHint: pickCategoryHint(combinedForAnalyzer)
    })
  } catch (err) {
    console.error(
      '[inbound/email] analyzeCase threw:',
      err instanceof Error ? err.message : String(err)
    )
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user.id,
      outcome: 'analyzer_error',
      error_message: err instanceof Error ? err.message : String(err)
    })
    return NextResponse.json({ ok: true, received: true, action: 'analyzer_error' })
  }

  // Persist case + report + usage event. Failures are non-fatal — we
  // still send the user their reply email.
  let savedCaseId: string | null = null
  let saveError: string | null = null
  try {
    const createdCase = await saveCase(sb as any, {
      userId: user.id,
      analysis,
      submittedText: combinedForAnalyzer,
      submittedUrl: '',
      source: 'inbound_email',
      title: `Emailed check: ${parsed.subject || maskEmail(fromEmail)}`.slice(0, 72)
    })
    if (createdCase) {
      savedCaseId = createdCase.id
      const savedReport = await saveReport(sb as any, {
        caseId: createdCase.id,
        userId: user.id,
        analysis,
        submittedText: combinedForAnalyzer
      })
      if (!savedReport) saveError = 'risk_reports insert returned null'
      await logUsageEvent(sb as any, {
        userId: user.id,
        eventType: 'check_created',
        caseId: createdCase.id
      })
    } else {
      saveError = 'cases insert returned null'
    }
  } catch (err) {
    saveError = err instanceof Error ? err.message : String(err)
    console.error('[inbound/email] save chain threw:', saveError)
  }

  await logInbound(sb, {
    provider_msg_id: parsed.providerMessageId,
    sender_email: fromEmail,
    to_email: parsed.toEmail,
    subject: parsed.subject,
    matched_user_id: user.id,
    case_id: savedCaseId,
    outcome: saveError ? 'save_failed' : 'analyzed',
    error_message: saveError
  })

  const reply = await sendInboundAllowedReply({
    toEmail: fromEmail,
    originalSubject: parsed.subject,
    riskLevel: analysis.risk_level,
    riskScore: analysis.risk_score,
    summary: analysis.summary,
    topRedFlags: analysis.red_flags,
    recommendedActions: analysis.recommended_actions,
    safeReply: ensureDisclaimer(analysis.safe_reply ?? '') || null,
    caseId: savedCaseId,
    attachmentNotice: parsed.hasAttachments
  })

  if (!reply.ok) {
    await logInbound(sb, {
      provider_msg_id: parsed.providerMessageId,
      sender_email: fromEmail,
      to_email: parsed.toEmail,
      subject: parsed.subject,
      matched_user_id: user.id,
      case_id: savedCaseId,
      outcome: 'reply_failed',
      error_message: reply.message
    })
  }

  return NextResponse.json({
    ok: true,
    received: true,
    action: 'analyzed',
    case_id: savedCaseId,
    save_error: saveError,
    reply_sent: reply.ok
  })
}
