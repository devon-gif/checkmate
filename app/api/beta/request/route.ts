/**
 * app/api/beta/request/route.ts
 *
 * POST /api/beta/request — public beta access request
 *
 * Validates the form, persists the request to `public.beta_requests`
 * with status='pending', then sends a notification email to Devon via
 * Resend. Does NOT create a beta_access row or assign any plan — that
 * happens only when an admin approves the request from /admin via the
 * /api/admin/beta-requests/approve route.
 *
 * Ordering note: we persist BEFORE we email so a Resend outage can
 * never lose a submission. The email is best-effort; the row in
 * beta_requests is the durable source of truth that drives the admin UI.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

import { betaServiceClient } from '@/lib/billing/beta-access'

const NOTIFY_EMAIL = 'devonavich0@gmail.com'
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'CheckRay <noreply@checkray.app>'

const USE_CASES: Record<string, string> = {
  jobs: 'Job offers / recruiter messages',
  texts: 'Suspicious texts',
  bills: 'Bills or payment requests',
  phishing: 'Phishing links',
  marketplace: 'Marketplace or rental listings',
  family: 'Family safety',
  other: 'Other'
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const {
    name,
    email,
    useCase,
    note,
    understood
  } = body as {
    name?: string
    email?: string
    useCase?: string
    note?: string
    understood?: boolean
  }

  // ── Server-side validation ──────────────────────────────────────────────
  const errors: string[] = []

  if (!name?.trim()) errors.push('Name is required.')
  if (!email?.trim()) errors.push('Email is required.')
  else if (!isValidEmail(email)) errors.push('A valid email address is required.')
  if (!useCase || !USE_CASES[useCase]) errors.push('Please select a use case.')
  if (!understood) errors.push('Please confirm you understand CheckRay is informational only.')

  if (errors.length > 0) {
    // Include `message` (not just `error`) so the client — which now renders
    // `message` — shows the specific validation text to the user.
    return NextResponse.json(
      { error: 'validation_failed', message: errors[0] },
      { status: 422 }
    )
  }

  const cleanName = name!.trim().slice(0, 120)
  const cleanEmail = email!.trim().toLowerCase().slice(0, 254)
  const cleanNote = (note ?? '').trim().slice(0, 1000)
  const useCaseLabel = USE_CASES[useCase!]
  const submittedAt = new Date().toISOString()

  // ── Persist the request first (durable source of truth) ───────────────
  //
  // We insert into beta_requests BEFORE attempting to send the notification
  // email. A Resend outage must never make a request disappear — the admin
  // page reads from beta_requests, so persistence is the contract that
  // backs the admin UI. Email is best-effort.
  //
  // The Supabase client used here is the service-role client. RLS on
  // beta_requests blocks anonymous writes; admin-gating for this PUBLIC
  // route is therefore enforced by the route itself (validation +
  // server-only secret + no auto-grant) rather than by RLS policies.
  const sb = betaServiceClient()
  if (!sb) {
    console.error(
      '[beta/request] Supabase service-role env vars missing — cannot persist request.'
    )
    return NextResponse.json(
      {
        error: 'storage_unavailable',
        message:
          "We couldn't save your request. Please email support@checkray.app."
      },
      { status: 503 }
    )
  }

  // Upsert (not insert) on the unique email column so a user who submits the
  // form twice updates their existing pending row instead of erroring on a
  // duplicate or creating a messy second row. We do NOT overwrite `status`
  // here — if the request was already approved/rejected, re-submitting must
  // not silently flip it back to 'pending'. onConflict matches the
  // beta_requests_email_key unique constraint (migration 20260529170000).
  const { data: insertedRow, error: insertError } = await sb
    .from('beta_requests' as any)
    .upsert(
      {
        name: cleanName,
        email: cleanEmail,
        use_case: useCase,
        note: cleanNote || null
      },
      { onConflict: 'email' }
    )
    .select('id, created_at')
    .maybeSingle()

  if (insertError) {
    // Never surface the raw DB error to the user — log it server-side and
    // return a friendly, actionable message instead.
    console.error(
      '[beta/request] beta_requests upsert failed:',
      insertError.message
    )
    return NextResponse.json(
      {
        error: 'storage_failed',
        message:
          "We couldn't save your request. Please email support@checkray.app."
      },
      { status: 500 }
    )
  }

  // Safe, non-PII log: confirm persistence without writing the email/name/note
  // body to logs. `request_id` is an opaque UUID.
  console.log('[beta/request] saved beta request', {
    request_id: (insertedRow as { id?: string } | null)?.id ?? null,
    use_case: useCase
  })

  const requestId = (insertedRow as { id?: string } | null)?.id ?? null

  // ── Send email via Resend ───────────────────────────────────────────────
  let emailSent = false
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      const resend = new Resend(resendKey)
      await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: 'New CheckRay beta request',
        html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0d;padding:32px;border-radius:12px;max-width:560px;color:#e5e5e5;">
  <div style="margin-bottom:24px;">
    <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7ae2cf;">CheckRay</p>
    <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">New beta access request</h1>
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);width:110px;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Name</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;color:#fff;">${cleanName}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;color:#7ae2cf;">${cleanEmail}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Use case</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;color:#fff;">${useCaseLabel}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Note</td>
      <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.07);font-size:14px;color:#fff;">${cleanNote}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td>
      <td style="padding:10px 0;font-size:14px;color:rgba(255,255,255,0.5);">${submittedAt}</td>
    </tr>
  </table>

  <div style="margin-top:24px;padding:16px;background:rgba(122,226,207,0.07);border:1px solid rgba(122,226,207,0.18);border-radius:10px;">
    <p style="margin:0;font-size:13px;color:rgba(122,226,207,0.9);">
      <strong>Next step:</strong> Approve this user manually in the admin beta tester panel at <a href="https://checkray.app/admin" style="color:#7ae2cf;">/admin</a>.
    </p>
  </div>
</div>`,
        text: `New CheckRay beta request\n\nName: ${cleanName}\nEmail: ${cleanEmail}\nUse case: ${useCaseLabel}\nNote: ${cleanNote}\nSubmitted: ${submittedAt}\n\nApprove this user manually in the admin beta tester panel at /admin.`
      })
      emailSent = true
    } catch (err) {
      // Email failure should not block the user response — the request is
      // already saved in beta_requests and visible in /admin. Log and
      // continue. The client receives a `warning` so the support team can
      // surface it if needed.
      console.warn(
        '[beta/request] admin notification email failed (request already saved):',
        err instanceof Error ? err.message : 'unknown error'
      )
    }
  } else {
    // No email configured — the request is already saved in beta_requests and
    // visible in /admin, which is the durable record. Log only non-PII so we
    // don't write the applicant's name/email/note to server logs.
    console.warn(
      '[beta/request] RESEND_API_KEY not set — admin notification skipped. Request is saved in beta_requests.',
      { request_id: requestId, use_case: useCase }
    )
  }

  return NextResponse.json({
    ok: true,
    request_id: requestId,
    // The client doesn't strictly need this, but surfacing the email
    // delivery state lets the front-end show a "we received it but
    // couldn't email Devon — we'll review manually" hint if needed.
    email_sent: emailSent
  })
}
