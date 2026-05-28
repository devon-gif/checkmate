/**
 * lib/billing/inbound-reply-email.ts
 *
 * Reply emails sent by the inbound `/api/inbound/email` route. Three
 * shapes, one per outcome:
 *
 *   allowed   → "Ray checked your email" — risk summary + flags + safer step
 *   blocked   → "Finish setting up CheckRay to email Ray" — sign-up prompt
 *   overLimit → "CheckRay limit reached" — point at the dashboard
 *
 * Every send is best-effort. The functions NEVER throw; they return a
 * structured `{ok, error?}` so the inbound route can log the outcome
 * (`reply_failed`) and still 200 the webhook (otherwise Resend would
 * retry forever).
 *
 * Reuses the same Resend client + `RESEND_FROM_EMAIL` env as the rest
 * of the app — no new secrets, no new dependencies.
 *
 * Honesty rules baked in (the inbound system is at Stage 3; the inbound
 * pipeline is real but the analyzer's job-vs-bill classification is
 * still imperfect, so every reply includes the standard "Ray can be
 * wrong" disclaimer).
 */
import 'server-only'

import { Resend } from 'resend'

import type { RiskLevel } from '@/lib/checkmate-shared'

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'CheckRay <noreply@checkray.app>'

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://checkray.app'
).replace(/\/$/, '')

const SIGN_IN_URL = `${APP_URL}/sign-in`
const BETA_REQUEST_URL = `${APP_URL}/beta`
const DASHBOARD_URL = `${APP_URL}/dashboard`

const DISCLAIMER =
  'Ray can be wrong. Verify important decisions through official sources.'

type ReplyResult =
  | { ok: true }
  | { ok: false; error: 'resend_not_configured' | 'resend_send_failed'; message: string }

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendOrLog(
  to: string,
  subject: string,
  text: string,
  html: string,
  scope: string
): Promise<ReplyResult> {
  const client = resendClient()
  if (!client) {
    console.warn(
      `[${scope}] RESEND_API_KEY is not set; skipping reply to ${to}.`
    )
    return {
      ok: false,
      error: 'resend_not_configured',
      message: 'Email service is not configured on this deployment.'
    }
  }

  try {
    await client.emails.send({ from: FROM_EMAIL, to, subject, html, text })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[${scope}] Resend send failed:`, message)
    return { ok: false, error: 'resend_send_failed', message }
  }
}

/* ── Allowed reply ─────────────────────────────────────────────────────── */

export interface AllowedReplyArgs {
  toEmail: string
  originalSubject?: string | null
  riskLevel: RiskLevel
  riskScore: number
  summary: string
  topRedFlags: string[]
  safeReply?: string | null
  recommendedActions?: string[]
  caseId?: string | null
  attachmentNotice?: boolean
}

function riskLabel(level: RiskLevel) {
  switch (level) {
    case 'very_high':
      return 'Critical risk'
    case 'high':
      return 'High risk'
    case 'medium':
      return 'Medium risk'
    case 'low':
      return 'Low risk'
  }
}

export async function sendInboundAllowedReply(
  args: AllowedReplyArgs
): Promise<ReplyResult> {
  const dashboardLink = args.caseId
    ? `${APP_URL}/cases/${args.caseId}`
    : `${APP_URL}/dashboard`

  const subjectPrefix = args.originalSubject?.trim()
    ? `Ray checked your email — "${args.originalSubject.trim().slice(0, 60)}"`
    : 'Ray checked your email'

  const topFlags = (args.topRedFlags ?? []).slice(0, 5)
  const saferStep =
    (args.recommendedActions ?? [])[0] ??
    args.safeReply?.trim() ??
    "Don't reply until you've verified the sender through an official channel."
  const attachmentNotice = args.attachmentNotice
    ? 'Note: attachments are not supported in the email beta yet. Ray checked the message text only.'
    : null

  const text = [
    `Ray checked the email you forwarded. ${riskLabel(args.riskLevel)} (${args.riskScore}/100).`,
    '',
    'Summary:',
    args.summary || '(no summary)',
    '',
    'Top red flags Ray noticed:',
    topFlags.length
      ? topFlags.map(flag => `  • ${flag}`).join('\n')
      : '  • (no specific red flags surfaced)',
    '',
    'Safer next step:',
    `  ${saferStep}`,
    '',
    attachmentNotice,
    attachmentNotice ? '' : null,
    `Open the full report on your dashboard: ${dashboardLink}`,
    '',
    DISCLAIMER,
    '',
    '— Ray @ CheckRay'
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:600px;color:#e5e5e5;line-height:1.55;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(subjectPrefix)}</h1>

  <p style="margin:0 0 14px;font-size:15px;color:#ececec;">
    <strong style="color:#7ae2cf;">${escapeHtml(riskLabel(args.riskLevel))}</strong>
    <span style="color:rgba(255,255,255,0.5);">(${args.riskScore}/100)</span>
  </p>

  <p style="margin:0 0 18px;font-size:14px;color:rgba(255,255,255,0.78);">
    ${escapeHtml(args.summary || '(no summary)')}
  </p>

  <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#7ae2cf;">
    Top red flags Ray noticed
  </p>
  <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;color:rgba(255,255,255,0.7);">
    ${
      topFlags.length
        ? topFlags.map(flag => `<li>${escapeHtml(flag)}</li>`).join('')
        : '<li style="color:rgba(255,255,255,0.45);">(no specific red flags surfaced)</li>'
    }
  </ul>

  <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#7ae2cf;">
    Safer next step
  </p>
  <p style="margin:0 0 22px;font-size:14px;color:rgba(255,255,255,0.78);">
    ${escapeHtml(saferStep)}
  </p>

  ${
    attachmentNotice
      ? `<p style="margin:0 0 22px;font-size:13px;color:rgba(255,255,255,0.62);">${escapeHtml(attachmentNotice)}</p>`
      : ''
  }

  <p style="margin:0 0 22px;">
    <a href="${dashboardLink}" style="display:inline-block;background:#7ae2cf;color:#0d0d0d;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Open the full report</a>
  </p>

  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);">${escapeHtml(DISCLAIMER)}</p>
  <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">— Ray @ CheckRay</p>
</div>`

  return sendOrLog(args.toEmail, subjectPrefix, text, html, 'inbound-reply/allowed')
}

/* ── Blocked reply (unknown / expired beta / no plan) ──────────────────── */

export interface BlockedReplyArgs {
  toEmail: string
  /** Free-form reason for the operator log; not shown verbatim to the user. */
  reasonForLog?: string
}

export async function sendInboundBlockedReply(
  args: BlockedReplyArgs
): Promise<ReplyResult> {
  const subject = 'Finish setting up CheckRay to email Ray'
  const text = [
    'Hey,',
    '',
    'Ray received your email, but this address is not approved for email checks yet.',
    `Sign in or request beta access at ${BETA_REQUEST_URL} using this same email.`,
    '',
    DISCLAIMER,
    '',
    '— Ray @ CheckRay'
  ].join('\n')

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:600px;color:#e5e5e5;line-height:1.55;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
  <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;">Finish setting up CheckRay to email Ray</h1>
  <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.78);">
    Ray received your email, but this address is not approved for email checks yet.
  </p>
  <p style="margin:0 0 22px;font-size:14px;color:rgba(255,255,255,0.78);">
    Sign in or request beta access at
    <a href="${BETA_REQUEST_URL}" style="color:#7ae2cf;">${escapeHtml(BETA_REQUEST_URL)}</a>
    using this same email.
  </p>
  <p style="margin:0;">
    <a href="${SIGN_IN_URL}" style="display:inline-block;background:#7ae2cf;color:#0d0d0d;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Sign in to CheckRay</a>
  </p>
  <p style="margin:22px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">${escapeHtml(DISCLAIMER)}</p>
  <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">— Ray @ CheckRay</p>
</div>`

  return sendOrLog(args.toEmail, subject, text, html, 'inbound-reply/blocked')
}

/* ── Over-limit reply ──────────────────────────────────────────────────── */

export interface OverLimitReplyArgs {
  toEmail: string
}

export async function sendInboundOverLimitReply(
  args: OverLimitReplyArgs
): Promise<ReplyResult> {
  const subject = 'CheckRay limit reached'
  const text = [
    'Hey,',
    '',
    'Ray received your email, but this account has reached its current check limit.',
    `Sign in to view your plan or upgrade: ${DASHBOARD_URL}`,
    '',
    DISCLAIMER,
    '',
    '— Ray @ CheckRay'
  ].join('\n')

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:600px;color:#e5e5e5;line-height:1.55;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
  <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;">CheckRay limit reached</h1>
  <p style="margin:0 0 22px;font-size:14px;color:rgba(255,255,255,0.78);">
    Ray received your email, but this account has reached its current check limit.
    Sign in to view your plan or upgrade.
  </p>
  <p style="margin:0;">
    <a href="${DASHBOARD_URL}" style="display:inline-block;background:#7ae2cf;color:#0d0d0d;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Open dashboard</a>
  </p>
  <p style="margin:22px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">${escapeHtml(DISCLAIMER)}</p>
  <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">— Ray @ CheckRay</p>
</div>`

  return sendOrLog(args.toEmail, subject, text, html, 'inbound-reply/over-limit')
}

/* ── Unable-to-check reply (empty / too large / attachment-only) ───────── */

export interface UnableReplyArgs {
  toEmail: string
  reason: 'empty' | 'too_large' | 'attachments_unsupported'
}

export async function sendInboundUnableReply(
  args: UnableReplyArgs
): Promise<ReplyResult> {
  const subject = 'Ray could not check that email'
  const detail =
    args.reason === 'attachments_unsupported'
      ? 'Attachments are not supported in the email beta yet, and Ray could not find enough message text to analyze.'
      : args.reason === 'too_large'
        ? 'That email was too large for the email beta to process safely.'
        : 'Ray could not find enough message text to analyze.'

  const text = [
    'Hey,',
    '',
    detail,
    'Please forward the suspicious message as plain text or paste it into your CheckRay dashboard.',
    '',
    DISCLAIMER,
    '',
    '— Ray @ CheckRay'
  ].join('\n')

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:600px;color:#e5e5e5;line-height:1.55;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
  <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#ffffff;">Ray could not check that email</h1>
  <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.78);">
    ${escapeHtml(detail)}
  </p>
  <p style="margin:0 0 22px;font-size:14px;color:rgba(255,255,255,0.78);">
    Please forward the suspicious message as plain text or paste it into your CheckRay dashboard.
  </p>
  <p style="margin:0;">
    <a href="${DASHBOARD_URL}" style="display:inline-block;background:#7ae2cf;color:#0d0d0d;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Open CheckRay</a>
  </p>
  <p style="margin:22px 0 0;font-size:11px;color:rgba(255,255,255,0.4);">${escapeHtml(DISCLAIMER)}</p>
  <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">— Ray @ CheckRay</p>
</div>`

  return sendOrLog(args.toEmail, subject, text, html, 'inbound-reply/unable')
}
