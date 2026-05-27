'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import { GlassCard } from '@/components/checkmate/GlassCard'
import type { BetaAccessRow, BetaPlan } from '@/lib/billing/beta-access'

interface Props {
  betaUsers: BetaAccessRow[]
}

const PLAN_OPTIONS: { value: BetaPlan; label: string; hint: string }[] = [
  { value: 'beta_basic', label: 'Beta Basic', hint: '10 / month' },
  { value: 'beta_plus', label: 'Beta Plus', hint: '50 / month' },
  { value: 'beta_family', label: 'Beta Family', hint: 'Unlimited fair-use' }
]

const EXPIRATION_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: 'none', label: 'No expiration' }
]

function formatDate(iso: string | null) {
  if (!iso) return 'No expiration'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Invalid date'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function planLabel(plan: string) {
  return PLAN_OPTIONS.find(option => option.value === plan)?.label ?? plan
}

export function BetaTestersPanel({ betaUsers }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<BetaPlan>('beta_plus')
  const [expiration, setExpiration] = useState('30')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function grantBeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('grant')
    setMessage(null)

    try {
      const res = await fetch('/api/admin/beta-testers/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan, expiration, notes })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(`Could not grant beta access: ${data.message ?? data.error}`)
        return
      }
      setEmail('')
      setNotes('')
      // Show the email-status detail alongside the grant confirmation.
      // The grant itself succeeded either way (beta_access is the source
      // of truth); the approval email is best-effort.
      if (data.email_sent === true) {
        setMessage('Beta access granted and approval email sent.')
      } else {
        const reason = typeof data.email_error === 'string'
          ? ` (${data.email_error})`
          : ''
        setMessage(
          `Beta access granted, but the approval email could not be sent${reason}.`
        )
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setBusy(null)
    }
  }

  async function revokeBeta(targetEmail: string) {
    setBusy(targetEmail)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/beta-testers/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(`Could not revoke beta access: ${data.message ?? data.error}`)
        return
      }
      setMessage(`Beta access revoked for ${targetEmail}.`)
      startTransition(() => router.refresh())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setBusy(null)
    }
  }

  /**
   * Re-send the approval email for an existing active beta tester. No
   * DB writes happen — beta_access is read-only here. Useful when the
   * original send failed (Resend outage, mistyped sender) or the user
   * lost the original message.
   */
  async function resendApprovalEmail(targetEmail: string) {
    setBusy(`resend:${targetEmail}`)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/beta-testers/resend-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.email_sent !== true) {
        const reason = data.email_error ?? data.message ?? data.error
        setMessage(
          `Could not resend approval email${reason ? ` (${reason})` : ''}.`
        )
        return
      }
      setMessage(`Approval email re-sent to ${targetEmail}.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <GlassCard className="space-y-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-white">Beta testers</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">
          Grant free beta access by email. This does not create, cancel, or
          modify any Stripe subscription.
        </p>
      </div>

      <form onSubmit={grantBeta} className="grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr]">
        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/35">
            User email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="tester@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-cm-green/45"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/35">
            Beta plan
          </span>
          <select
            value={plan}
            onChange={event => setPlan(event.target.value as BetaPlan)}
            className="w-full rounded-xl border border-white/10 bg-[#071112] px-3 py-2 text-sm text-white outline-none focus:border-cm-green/45"
          >
            {PLAN_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/35">
            Expiration
          </span>
          <select
            value={expiration}
            onChange={event => setExpiration(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#071112] px-3 py-2 text-sm text-white outline-none focus:border-cm-green/45"
          >
            {EXPIRATION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 lg:col-span-3">
          <span className="text-xs font-medium uppercase tracking-wider text-white/35">
            Admin note
          </span>
          <textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Optional context for this beta grant"
            rows={3}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-cm-green/45"
          />
        </label>

        <div className="lg:col-span-3">
          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex rounded-xl bg-cm-green px-5 py-2.5 text-sm font-semibold text-cm-bg transition hover:bg-cm-green/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === 'grant' ? 'Granting…' : 'Grant beta access'}
          </button>
        </div>
      </form>

      {message && (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-medium uppercase tracking-wider text-white/35 max-md:hidden">
          <span>Email</span>
          <span>Plan</span>
          <span>Expires</span>
          <span>Status</span>
        </div>
        {betaUsers.length ? (
          betaUsers.map(row => {
            const expired =
              row.expires_at && new Date(row.expires_at).getTime() <= Date.now()
            const active = row.status === 'active' && !expired
            return (
              <div
                key={row.id}
                className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr] gap-3 border-b border-white/6 px-4 py-4 text-sm last:border-b-0 max-md:grid-cols-1"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium text-white/85">{row.email}</p>
                  {row.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-white/35">
                      {row.notes}
                    </p>
                  )}
                </div>
                <p className="text-white/65">{planLabel(row.plan)}</p>
                <p className="text-white/55">{formatDate(row.expires_at)}</p>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={
                      active
                        ? 'text-cm-green'
                        : row.status === 'revoked'
                          ? 'text-orange-300'
                          : 'text-white/40'
                    }
                  >
                    {active ? 'active' : row.status === 'revoked' ? 'revoked' : 'expired'}
                  </span>
                  {row.status === 'active' && (
                    <>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => resendApprovalEmail(row.email)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/55 transition hover:border-cm-green/40 hover:text-cm-green disabled:cursor-not-allowed disabled:opacity-50"
                        title="Re-send the approval email to this tester"
                      >
                        {busy === `resend:${row.email}`
                          ? 'Sending…'
                          : 'Resend approval email'}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => revokeBeta(row.email)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/55 transition hover:border-orange-300/40 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === row.email ? 'Revoking…' : 'Revoke'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <p className="px-4 py-6 text-sm text-white/45">
            No beta testers yet.
          </p>
        )}
      </div>
    </GlassCard>
  )
}
