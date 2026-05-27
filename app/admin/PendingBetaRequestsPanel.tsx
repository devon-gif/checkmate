'use client'

/**
 * Pending beta requests panel, rendered above BetaTestersPanel on /admin.
 *
 * Data flow:
 *   - Parent server component (/admin/page.tsx) fetches rows via
 *     `listBetaRequests()` and passes them in as `requests`.
 *   - Action buttons POST to /api/admin/beta-requests/{approve,reject}
 *     (admin-gated server-side; this component does not enforce auth).
 *   - On success we `router.refresh()` so the server re-fetches.
 *
 * The panel renders ALL requests, but only `pending` rows show action
 * buttons — approved/rejected rows are kept visible for audit context.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { GlassCard } from '@/components/checkmate/GlassCard'
import type {
  BetaPlan,
  BetaRequestRow,
  BetaRequestStatus
} from '@/lib/billing/beta-access'

interface Props {
  requests: BetaRequestRow[]
}

// Mirror BetaTestersPanel's PLAN_OPTIONS so admins see consistent
// language across both panels.
const PLAN_OPTIONS: { value: BetaPlan; label: string }[] = [
  { value: 'beta_basic', label: 'Basic' },
  { value: 'beta_plus', label: 'Plus' },
  { value: 'beta_family', label: 'Family' }
]

const STATUS_STYLES: Record<BetaRequestStatus, string> = {
  pending:
    'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
  approved:
    'border-cm-green/30 bg-cm-green/10 text-cm-green',
  rejected:
    'border-red-400/25 bg-red-400/10 text-red-200'
}

const USE_CASE_LABELS: Record<string, string> = {
  jobs: 'Job offers / recruiter messages',
  texts: 'Suspicious texts',
  bills: 'Bills or payment requests',
  phishing: 'Phishing links',
  marketplace: 'Marketplace or rental listings',
  family: 'Family safety',
  other: 'Other'
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function PendingBetaRequestsPanel({ requests }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok')

  const pending = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  async function approve(id: string, plan: BetaPlan) {
    setBusy(`approve:${id}:${plan}`)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/beta-requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plan, expiration: '30' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessageTone('error')
        setMessage(
          `Could not approve: ${data.message ?? data.error ?? res.statusText}`
        )
        return
      }
      // Differentiate "granted + emailed" from "granted but email
      // failed". The grant itself succeeded in either case — beta_access
      // is the source of truth — but the operator deserves to know.
      if (data.email_sent === true) {
        setMessageTone('ok')
        setMessage('Beta access granted and approval email sent.')
      } else {
        setMessageTone('ok')
        const reason = typeof data.email_error === 'string'
          ? ` (${data.email_error})`
          : ''
        setMessage(
          `Beta access granted, but the approval email could not be sent${reason}.`
        )
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setBusy(null)
    }
  }

  async function reject(id: string) {
    setBusy(`reject:${id}`)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/beta-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessageTone('error')
        setMessage(
          `Could not reject: ${data.message ?? data.error ?? res.statusText}`
        )
        return
      }
      setMessageTone('ok')
      setMessage('Beta request rejected.')
      startTransition(() => router.refresh())
    } catch (err) {
      setMessageTone('error')
      setMessage(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Pending beta requests
          </h2>
          <p className="mt-1 text-xs text-white/45">
            Submissions from the public <code className="rounded bg-white/5 px-1 py-0.5">/beta</code>{' '}
            form. Approve to grant access via the existing beta tester
            system.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/55">
          {pending.length} pending
        </span>
      </div>

      {message && (
        <div
          role="status"
          className={[
            'mb-4 rounded-xl border px-4 py-3 text-sm',
            messageTone === 'ok'
              ? 'border-cm-green/25 bg-cm-green/8 text-cm-green'
              : 'border-red-400/25 bg-red-400/8 text-red-200'
          ].join(' ')}
        >
          {message}
        </div>
      )}

      {/* Pending list */}
      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">
          No pending beta requests.
        </p>
      ) : (
        <ul className="space-y-3">
          {pending.map(row => (
            <li
              key={row.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-white">
                      {row.name}
                    </span>
                    <span className="text-white/30">·</span>
                    <a
                      href={`mailto:${row.email}`}
                      className="text-cm-green/85 underline-offset-2 hover:underline"
                    >
                      {row.email}
                    </a>
                  </div>
                  <p className="text-xs text-white/45">
                    Submitted {formatDateTime(row.created_at)} · Use case:{' '}
                    <span className="text-white/65">
                      {USE_CASE_LABELS[row.use_case] ?? row.use_case}
                    </span>
                  </p>
                  {row.note && (
                    <p className="mt-2 rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs leading-relaxed text-white/55">
                      {row.note}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 sm:items-end">
                  <div className="flex flex-wrap gap-1.5">
                    {PLAN_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={busy !== null}
                        onClick={() => approve(row.id, opt.value)}
                        className="inline-flex items-center rounded-lg border border-cm-green/30 bg-cm-green/8 px-3 py-1.5 text-xs font-medium text-cm-green transition hover:border-cm-green/55 hover:bg-cm-green/12 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === `approve:${row.id}:${opt.value}`
                          ? 'Approving…'
                          : `Approve ${opt.label}`}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => reject(row.id)}
                    className="inline-flex items-center rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/55 transition hover:border-red-400/35 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy === `reject:${row.id}` ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Resolved history (collapsed by default would be nicer but
          this keeps the panel simple — only ~last 10 are shown). */}
      {resolved.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-widest text-white/35">
            Recently decided
          </p>
          <ul className="divide-y divide-white/5 rounded-xl border border-white/8">
            {resolved.slice(0, 10).map(row => (
              <li
                key={row.id}
                className="flex flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white/80">{row.name}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white/55">{row.email}</span>
                  </div>
                  <p className="text-[11px] text-white/35">
                    {formatDateTime(row.reviewed_at)} by{' '}
                    {row.reviewed_by ?? '—'}
                  </p>
                </div>
                <span
                  className={[
                    'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                    STATUS_STYLES[row.status]
                  ].join(' ')}
                >
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  )
}
