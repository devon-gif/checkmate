'use client'

/**
 * components/checkmate/BillingStatusCard.tsx
 *
 * Small card shown on the dashboard that displays the user's current
 * billing/trial status and provides upgrade or portal CTA buttons.
 *
 * Props are plain serialisable values so the parent Server Component can
 * compute them from the DB and pass them down without sending the full
 * subscription row to the client.
 */

import { useState } from 'react'

import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'

export type BillingStatus = 'trialing' | 'active' | 'expired' | 'unknown'

interface Props {
  status: BillingStatus
  trialEndsAt?: string | null
  /** true when NEXT_PUBLIC_STRIPE_PRICE_ID_PRO is present server-side */
  stripeConfigured: boolean
  /** PlanId from user_billing e.g. 'trial' | 'basic' | 'plus' | 'free' */
  plan?: string | null
  /** Checks used this calendar month */
  checksUsed?: number
  /** Monthly check limit (null = unlimited) */
  checksLimit?: number | null
}

function daysUntil(iso: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
}

export function BillingStatusCard({ status, trialEndsAt, stripeConfigured, plan, checksUsed = 0, checksLimit }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST'
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.message ?? 'Could not start checkout. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/customer-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.message ?? 'Could not open billing portal.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const daysLeft = trialEndsAt ? daysUntil(trialEndsAt) : null

  return (
    <GlassCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <span
          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
            status === 'active'
              ? 'bg-cm-green shadow-[0_0_6px_theme(colors.cm-green)]'
              : status === 'trialing'
                ? 'bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]'
                : 'bg-red-500 shadow-[0_0_6px_theme(colors.red.500)]'
          }`}
        />

        <div>
          {status === 'active' && (() => {
            const isPlus = plan === 'plus' || plan === 'plus_yearly'
            const isBasic = plan === 'basic' || plan === 'basic_yearly'
            if (isPlus) return (
              <>
                <p className="text-sm font-medium text-white">Plus plan</p>
                <p className="mt-0.5 text-xs text-white/40">Unlimited fair-use checks included.</p>
              </>
            )
            if (isBasic) return (
              <>
                <p className="text-sm font-medium text-white">
                  Basic plan
                  {checksLimit != null && (
                    <span className="ml-2 text-xs font-normal text-white/50">
                      {checksUsed}/{checksLimit} checks this month
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-white/40">25 checks per month.</p>
              </>
            )
            // Generic active (unknown plan)
            return (
              <>
                <p className="text-sm font-medium text-white">Plan active</p>
                <p className="mt-0.5 text-xs text-white/40">Unlimited risk checks included.</p>
              </>
            )
          })()}

          {status === 'unknown' && (
            <>
              <p className="text-sm font-medium text-white">Free</p>
              <p className="mt-0.5 text-xs text-white/40">1 check per month. Start a free trial to unlock more.</p>
            </>
          )}

          {status === 'trialing' && (
            <>
              <p className="text-sm font-medium text-white">
                Free trial
                {daysLeft !== null && (
                  <span className="ml-1.5 text-yellow-400">
                    {daysLeft === 0
                      ? '— expires today'
                      : `— ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-white/40">
                Unlimited checks during your trial. Subscribe to continue after it ends.
              </p>
            </>
          )}

          {(status === 'expired' || status === 'unknown') && (
            <>
              <p className="text-sm font-medium text-red-400">Trial ended</p>
              <p className="mt-0.5 text-xs text-white/40">
                Subscribe to continue running checks with CheckRay.
              </p>
            </>
          )}

          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      </div>

      <div className="flex-shrink-0">
        {status === 'active' ? (
          <GradientButton
            variant="secondary"
            onClick={handlePortal}
            disabled={loading || !stripeConfigured}
          >
            {loading ? 'Loading...' : 'Manage billing'}
          </GradientButton>
        ) : stripeConfigured ? (
          <GradientButton
            variant="primary"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Upgrade to Pro'}
          </GradientButton>
        ) : (
          <span className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/30">
            Billing not configured yet
          </span>
        )}
      </div>
    </GlassCard>
  )
}
