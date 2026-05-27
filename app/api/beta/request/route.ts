/**
 * app/api/beta/request/route.ts
 *
 * POST /api/beta/request — public beta access request
 *
 * Validates the form, sends a notification email to Devon via Resend,
 * and returns success. Does NOT create a beta_access row or assign any plan.
 * Manual approval still happens in /admin.
 */
import 'server-only'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
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
    return NextResponse.json({ error: errors[0] }, { status: 422 })
  }

  const cleanName = name!.trim().slice(0, 120)
  const cleanEmail = email!.trim().toLowerCase().slice(0, 254)
  const cleanNote = note!.trim().slice(0, 1000)
  const useCaseLabel = USE_CASES[useCase!]
  const submittedAt = new Date().toISOString()

  // ── Send email via Resend ───────────────────────────────────────────────
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
    } catch (err) {
      // Email failure should not block the user response — log and continue
      console.error('[beta/request] Resend error:', err)
    }
  } else {
    // No email configured — log the request server-side for manual review
    console.log('[beta/request] RESEND_API_KEY not set. Request received:', {
      name: cleanName,
      email: cleanEmail,
      useCase: useCaseLabel,
      note: cleanNote,
      submittedAt
    })
  }

  return NextResponse.json({ ok: true })
}
