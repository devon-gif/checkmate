/**
 * app/feedback/email/page.tsx
 *
 * Thank-you / thumbs-down form page for email feedback.
 *
 * Query-param states:
 *   r=ok             — accurate: simple thank-you
 *   r=form&caseId=…&token=…  — not right: show reason form
 *   r=done           — thumbs-down form submitted
 *   r=error|invalid  — something went wrong
 *
 * The form (r=form state) uses a Server Action to update the
 * case_feedback row and redirect back to ?r=done.
 *
 * No scam text is shown, stored, or returned here.
 */
import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

import { verifyFeedbackToken } from '@/lib/feedback-token'

export const metadata = {
  title: 'Feedback | CheckRay',
  robots: { index: false, follow: false }
}

// ── Inline server action (runs on the server, never exposed client-side) ──

async function submitReason(formData: FormData) {
  'use server'

  const caseId = formData.get('caseId')?.toString() ?? ''
  const token = formData.get('token')?.toString() ?? ''
  const reason = formData.get('reason')?.toString() || null
  const note = formData.get('note')?.toString().trim() || null

  if (!caseId || !token || !verifyFeedbackToken(caseId, token)) {
    redirect('/feedback/email?r=invalid')
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const VALID_REASONS = [
    'too_risky',
    'not_risky_enough',
    'missed_red_flag',
    'wrong_category',
    'confusing_explanation',
    'other'
  ] as const

  const safeReason =
    reason && (VALID_REASONS as readonly string[]).includes(reason)
      ? (reason as (typeof VALID_REASONS)[number])
      : null

  await (sb as any)
    .from('case_feedback')
    .update({
      reason: safeReason,
      note: note ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('token', token)

  redirect('/feedback/email?r=done')
}

// ── Layout wrapper ─────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0d0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <div
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px 36px',
          maxWidth: '480px',
          width: '100%',
          color: '#e5e5e5'
        }}
      >
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#7ae2cf'
          }}
        >
          CheckRay
        </p>
        {children}
      </div>
    </div>
  )
}

// ── State views ────────────────────────────────────────────────────────────

function AccurateThankYou() {
  return (
    <Shell>
      <h1 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700, color: '#fff' }}>
        Thanks — feedback received.
      </h1>
      <p style={{ margin: '0', fontSize: '14px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>
        Your feedback helps Ray improve. We review every rating to catch false positives and missed red flags.
      </p>
    </Shell>
  )
}

function ThankYouDone() {
  return (
    <Shell>
      <h1 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700, color: '#fff' }}>
        Got it — thanks for the detail.
      </h1>
      <p style={{ margin: '0', fontSize: '14px', color: 'rgba(255,255,255,0.62)', lineHeight: 1.6 }}>
        We&apos;ll use your feedback to improve Ray&apos;s accuracy over time.
      </p>
    </Shell>
  )
}

const REASONS = [
  { value: 'too_risky', label: 'Too risky' },
  { value: 'not_risky_enough', label: 'Not risky enough' },
  { value: 'missed_red_flag', label: 'Missed a red flag' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'confusing_explanation', label: 'Confusing explanation' },
  { value: 'other', label: 'Other' }
]

function NotRightForm({ caseId, token }: { caseId: string; token: string }) {
  return (
    <Shell>
      <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: '#fff' }}>
        What was wrong?
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        This helps us improve Ray&apos;s accuracy. All fields are optional.
      </p>

        <form
          // Server action — Next.js injects a hidden input at build time
          action={submitReason as unknown as string}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
        <input type="hidden" name="caseId" value={caseId} />
        <input type="hidden" name="token" value={token} />

        <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
          <legend
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '10px'
            }}
          >
            What should Ray have done differently?
          </legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {REASONS.map(({ value, label }) => (
              <label
                key={value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="reason"
                  value={value}
                  style={{ accentColor: '#7ae2cf', width: '16px', height: '16px', flexShrink: 0 }}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="feedback-note"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '8px'
            }}
          >
            What should Ray have noticed? <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
          </label>
          <textarea
            id="feedback-note"
            name="note"
            rows={3}
            maxLength={500}
            placeholder="Describe what Ray missed or got wrong…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#e5e5e5',
              fontSize: '14px',
              padding: '10px 12px',
              lineHeight: 1.55,
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: '#7ae2cf',
            color: '#0d0d0d',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            cursor: 'pointer',
            alignSelf: 'flex-start'
          }}
        >
          Send feedback
        </button>
      </form>
    </Shell>
  )
}

function ErrorView() {
  return (
    <Shell>
      <h1 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
        That link has expired or is invalid.
      </h1>
      <p style={{ margin: '0', fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
        Feedback links are tied to individual email reports. If you think this is a mistake, open your{' '}
        <a
          href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://checkray.app'}/dashboard`}
          style={{ color: '#7ae2cf' }}
        >
          CheckRay dashboard
        </a>{' '}
        to rate the case directly.
      </p>
    </Shell>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function EmailFeedbackPage({
  searchParams
}: {
  searchParams: { r?: string; caseId?: string; token?: string }
}) {
  const r = searchParams.r ?? ''
  const caseId = searchParams.caseId ?? ''
  const token = searchParams.token ?? ''

  if (r === 'ok') return <AccurateThankYou />
  if (r === 'done') return <ThankYouDone />
  if (r === 'error' || r === 'invalid') return <ErrorView />

  if (r === 'form' && caseId && token && verifyFeedbackToken(caseId, token)) {
    return <NotRightForm caseId={caseId} token={token} />
  }

  // Unknown state — treat as error
  return <ErrorView />
}
