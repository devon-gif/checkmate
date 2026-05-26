'use client'

/**
 * Client island for /admin/billing-test.
 *
 * Renders the action buttons and POSTs to the admin-gated routes:
 *   POST /api/admin/billing-test/set-plan      { state }
 *   POST /api/admin/billing-test/reset-usage
 *
 * Both routes are independently gated server-side; this component does
 * not enforce anything by itself. It only renders if the parent server
 * component decided the current user is allowed in.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { GlassCard } from '@/components/checkmate/GlassCard'

type AdminPlanState =
  | 'free'
  | 'basic'
  | 'plus'
  | 'family'
  | 'trial_basic'
  | 'trial_plus'
  | 'trial_family'
  | 'past_due'
  | 'canceled'

interface StateButton {
  state: AdminPlanState
  label: string
  hint: string
  tone: 'free' | 'paid' | 'trial' | 'warn'
}

const PAID_STATES: StateButton[] = [
  { state: 'free', label: 'Set Free', hint: '1 / month', tone: 'free' },
  { state: 'basic', label: 'Set Basic', hint: '10 / month', tone: 'paid' },
  { state: 'plus', label: 'Set Plus', hint: '50 / month', tone: 'paid' },
  { state: 'family', label: 'Set Family', hint: 'Unlimited', tone: 'paid' }
]

const TRIAL_STATES: StateButton[] = [
  {
    state: 'trial_basic',
    label: 'Set Basic Trial',
    hint: '7 days · 10 / month',
    tone: 'trial'
  },
  {
    state: 'trial_plus',
    label: 'Set Plus Trial',
    hint: '7 days · 50 / month',
    tone: 'trial'
  },
  {
    state: 'trial_family',
    label: 'Set Family Trial',
    hint: '7 days · unlimited',
    tone: 'trial'
  }
]

const WARN_STATES: StateButton[] = [
  {
    state: 'past_due',
    label: 'Set Past Due',
    hint: 'Keeps plan, status=past_due',
    tone: 'warn'
  },
  {
    state: 'canceled',
    label: 'Set Canceled / downgrade to Free',
    hint: 'Same as Stripe deletion',
    tone: 'warn'
  }
]

function toneClasses(tone: StateButton['tone']) {
  switch (tone) {
    case 'free':
      return 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
    case 'paid':
      return 'border-cm-green/30 bg-cm-green/10 text-cm-green hover:bg-cm-green/15'
    case 'trial':
      return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200 hover:bg-yellow-400/15'
    case 'warn':
      return 'border-orange-400/30 bg-orange-400/10 text-orange-200 hover:bg-orange-400/15'
  }
}

export function BillingTestPanel() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function applyState(state: AdminPlanState) {
    setBusy(state)
    setMessage(null)
    setWarning(null)
    try {
      const res = await fetch('/api/admin/billing-test/set-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(
          `❌ ${data.message ?? data.error ?? `Request failed (${res.status})`}`
        )
        return
      }
      setMessage(`✅ Applied: ${state}. Reload the dashboard to verify.`)
      if (typeof data.warning === 'string' && data.warning) {
        setWarning(data.warning)
      }
      // Refresh the server component so the "Current state" card re-reads
      // the updated user_billing row.
      startTransition(() => router.refresh())
    } catch (err) {
      setMessage(
        `❌ Network error: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setBusy(null)
    }
  }

  async function resetUsage() {
    setBusy('reset')
    setMessage(null)
    setWarning(null)
    try {
      const res = await fetch('/api/admin/billing-test/reset-usage', {
        method: 'POST'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(
          `❌ ${data.message ?? data.error ?? `Request failed (${res.status})`}`
        )
        return
      }
      setMessage(
        '✅ Usage reset for the current month. Saved cases and reports were NOT deleted.'
      )
      startTransition(() => router.refresh())
    } catch (err) {
      setMessage(
        `❌ Network error: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setBusy(null)
    }
  }

  function renderRow(title: string, items: StateButton[]) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-white/35">
          {title}
        </p>
        <div className="flex flex-wrap gap-2">
          {items.map(b => (
            <button
              key={b.state}
              type="button"
              disabled={busy !== null}
              onClick={() => applyState(b.state)}
              className={`group inline-flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses(
                b.tone
              )}`}
            >
              <span className="font-medium">
                {busy === b.state ? 'Applying…' : b.label}
              </span>
              <span className="text-[10px] opacity-70">{b.hint}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <GlassCard className="space-y-5 p-5">
      <div>
        <h2 className="text-sm font-medium text-white">Override billing state</h2>
        <p className="mt-1 text-xs text-white/40">
          Writes to <code className="text-white/60">user_billing</code> only.
          Stripe customer / subscription IDs are preserved. Saved cases and
          risk reports are never touched.
        </p>
      </div>

      {renderRow('Paid (active)', PAID_STATES)}
      {renderRow('Trial (7-day)', TRIAL_STATES)}
      {renderRow('Edge states', WARN_STATES)}

      <div className="border-t border-white/10 pt-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-white/35">
          Usage
        </p>
        <button
          type="button"
          disabled={busy !== null}
          onClick={resetUsage}
          className="mt-2 inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'reset' ? 'Resetting…' : 'Reset usage count (this month)'}
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          {message}
        </p>
      )}
      {warning && (
        <p className="rounded-lg border border-yellow-400/30 bg-yellow-400/5 px-3 py-2 text-xs text-yellow-200">
          {warning}
        </p>
      )}
    </GlassCard>
  )
}
