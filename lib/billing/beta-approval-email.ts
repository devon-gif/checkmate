/**
 * lib/billing/beta-approval-email.ts
 *
 * Server-only helper that sends the "you're approved for CheckRay beta"
 * notification via Resend. Shared between:
 *   - /api/admin/beta-testers/grant          (manual email grant)
 *   - /api/admin/beta-requests/approve       (approval of /beta form request)
 *   - /api/admin/beta-testers/resend-approval (manual resend)
 *
 * The function NEVER throws — callers should still mark the grant as
 * succeeded even when the email fails. Beta access is the source of
 * truth; the email is a courtesy notification. Failure information is
 * returned in a structured shape so the admin UI can tell the operator
 * "granted ✓ / email ✗" without ambiguity.
 *
 * Honesty rules baked into the copy below:
 *   - We do NOT claim email-to-Ray is automatic. /api/inbound/email is
 *     wired through Stage 1 only (signature verify + log) so the line
 *     in the email reads "may be reviewed manually while we finish
 *     automatic email intake."
 *   - We do NOT claim SMS/texting is live. The Ray phone number is
 *     described as "coming next" and only mentioned at all so betas
 *     know to expect it.
 */
import 'server-only'

import { Resend } from 'resend'

import { type BetaPlan } from './beta-access'

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'CheckRay <noreply@checkray.app>'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://checkray.app').replace(
  /\/$/,
  ''
)

const SIGN_UP_URL = `${APP_URL}/sign-up`
const SIGN_IN_URL = `${APP_URL}/sign-in`

// Keep this default in sync with the inbound route
// (app/api/inbound/email/route.ts), which also defaults to
// ray@inbound.checkray.app. Production sets INBOUND_EMAIL_ADDRESS, so this
// fallback only matters when the env var is unset — but a mismatched
// default would tell approved users the wrong address to email Ray.
const RAY_INBOUND_ADDRESS =
  process.env.INBOUND_EMAIL_ADDRESS ?? 'ray@inbound.checkray.app'

function planLabelForEmail(plan: BetaPlan): string {
  switch (plan) {
    case 'beta_basic':
      return 'Beta Basic'
    case 'beta_plus':
      return 'Beta Plus'
    case 'beta_family':
      return 'Beta Family Protection'
  }
}

function formatExpirationDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export interface SendBetaApprovalEmailArgs {
  toEmail: string
  /** Optional recipient name. Falls back to a generic "Hey,". */
  toName?: string | null
  plan: BetaPlan
  /** ISO timestamp. If present, included in the copy. */
  expiresAt?: string | null
}

export type SendBetaApprovalEmailResult =
  | { ok: true }
  | { ok: false; error: 'resend_not_configured' | 'resend_send_failed'; message: string }

export async function sendBetaApprovalEmail(
  args: SendBetaApprovalEmailArgs
): Promise<SendBetaApprovalEmailResult> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // Treat the missing-key state as a structured failure (not a throw)
    // so the admin UI can tell the operator clearly: granted ✓, email ✗
    // because Resend is not configured on this deployment.
    console.warn(
      '[beta-approval-email] RESEND_API_KEY is not set; skipping send.'
    )
    return {
      ok: false,
      error: 'resend_not_configured',
      message: 'Email service is not configured on this deployment.'
    }
  }

  const planLabel = planLabelForEmail(args.plan)
  const expirationDate = formatExpirationDate(args.expiresAt ?? null)
  const expirationLine = expirationDate
    ? `Your beta access is currently set to expire on ${expirationDate}.`
    : null

  const greeting = args.toName?.trim() ? `Hey ${args.toName.trim()},` : 'Hey,'

  // Plaintext body — every email client renders this correctly. The
  // copy is kept honest about what is and isn't live yet (no SMS, no
  // fully-automated email-to-Ray) per the product brief.
  const text = [
    greeting,
    '',
    "You're approved for the CheckRay beta.",
    '',
    `Plan: ${planLabel}`,
    ...(expirationLine ? [expirationLine] : []),
    '',
    'Sign up (or sign in if you already have an account) using this SAME email address — your beta access is tied to it:',
    `Sign up: ${SIGN_UP_URL}`,
    `Sign in: ${SIGN_IN_URL}`,
    '',
    "Once you're in, you can start testing Ray by pasting suspicious texts, job offers, links, bills, emails, or sketchy messages before you click, pay, reply, or apply.",
    '',
    'Your beta access includes:',
    '  • No card required',
    '  • Free beta checks during the test period',
    '  • Access to the CheckRay dashboard',
    '  • Saved risk readouts and safer next steps',
    '',
    `You can also email Ray at: ${RAY_INBOUND_ADDRESS}`,
    'For now, email checks may be reviewed manually while we finish automatic email intake. Texting Ray is coming next — once your phone number is connected, we’ll send you the Ray phone number and instructions.',
    '',
    'Reminder: CheckRay is a second opinion, not a guarantee. Ray can be wrong, so always verify important decisions through official sources.',
    '',
    'Thanks for helping test it,',
    'Devon',
    'CheckRay'
  ].join('\n')

  // HTML body — same content, styled to match the existing beta-request
  // notification email (dark card, mint accent). Plain-text fallback above
  // is what most readers will actually see in their preview pane.
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:600px;color:#e5e5e5;line-height:1.55;">
  <div style="margin-bottom:24px;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">You&rsquo;re approved for the CheckRay beta</h1>
  </div>

  <p style="margin:0 0 14px;font-size:15px;color:#ececec;">${escapeHtml(greeting)}</p>

  <p style="margin:0 0 14px;font-size:15px;color:#ececec;">
    You&rsquo;re approved for the CheckRay beta on
    <strong style="color:#7ae2cf;">${escapeHtml(planLabel)}</strong>.${
      expirationLine ? ` ${escapeHtml(expirationLine)}` : ''
    }
  </p>

  <p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.65);">
    Sign up using this <strong style="color:#fff;">same email address</strong> — your beta access is tied to it. (Already have an account? Just sign in.)
  </p>
  <p style="margin:0 0 24px;">
    <a href="${SIGN_UP_URL}" style="display:inline-block;background:#7ae2cf;color:#0d0d0d;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Sign up for CheckRay</a>
    <a href="${SIGN_IN_URL}" style="display:inline-block;margin-left:8px;background:transparent;border:1px solid rgba(122,226,207,0.4);color:#7ae2cf;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px;text-decoration:none;">Sign in</a>
  </p>

  <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.75);">
    Once you&rsquo;re in, start testing Ray by pasting suspicious texts, job offers, links, bills, emails, or sketchy messages before you click, pay, reply, or apply.
  </p>

  <div style="margin:20px 0;padding:14px 16px;background:rgba(122,226,207,0.06);border:1px solid rgba(122,226,207,0.15);border-radius:10px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#7ae2cf;">Your beta access includes</p>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:rgba(255,255,255,0.7);">
      <li>No card required</li>
      <li>Free beta checks during the test period</li>
      <li>Access to the CheckRay dashboard</li>
      <li>Saved risk readouts and safer next steps</li>
    </ul>
  </div>

  <p style="margin:0 0 6px;font-size:14px;color:rgba(255,255,255,0.65);">
    You can also email Ray at
    <a href="mailto:${escapeHtml(RAY_INBOUND_ADDRESS)}" style="color:#7ae2cf;">${escapeHtml(RAY_INBOUND_ADDRESS)}</a>.
  </p>
  <p style="margin:0 0 18px;font-size:12px;color:rgba(255,255,255,0.45);">
    For now, email checks may be reviewed manually while we finish
    automatic email intake. Texting Ray is coming next &mdash; once your
    phone number is connected, we&rsquo;ll send you the Ray phone number
    and instructions.
  </p>

  <p style="margin:0 0 22px;font-size:12px;color:rgba(255,255,255,0.45);">
    Reminder: CheckRay is a second opinion, not a guarantee. Ray can be
    wrong, so always verify important decisions through official sources.
  </p>

  <p style="margin:0;font-size:14px;color:#ececec;">Thanks for helping test it,</p>
  <p style="margin:4px 0 0;font-size:14px;color:#ececec;">Devon</p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">CheckRay</p>
</div>`

  try {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: args.toEmail,
      subject: "You're approved for the CheckRay beta",
      html,
      text
    })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[beta-approval-email] Resend send failed:', message)
    return {
      ok: false,
      error: 'resend_send_failed',
      message
    }
  }
}

/**
 * Minimal HTML-escape used for any values interpolated into the HTML
 * body above. Plan label and expiration string come from our own
 * constants so they don't strictly need escaping, but escaping is
 * cheap and keeps us safe if a future caller wires in user-supplied
 * data (e.g. a personalised greeting from beta_requests.name).
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
