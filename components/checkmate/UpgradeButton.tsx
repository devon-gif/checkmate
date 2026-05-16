'use client'

/**
 * components/checkmate/UpgradeButton.tsx
 *
 * Small client component that starts a Stripe Checkout session.
 * Used on the pricing page for the Pro tier CTA.
 */

import { useState } from 'react'

import { GradientButton } from '@/components/checkmate/GradientButton'

interface Props {
  stripeConfigured: boolean
}

export function UpgradeButton({ stripeConfigured }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (!stripeConfigured) return
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

  if (!stripeConfigured) {
    return (
      <span className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm text-white/30">
        Billing not configured yet
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <GradientButton
        variant="primary"
        onClick={handleClick}
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Loading...' : 'Upgrade to Pro'}
      </GradientButton>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
