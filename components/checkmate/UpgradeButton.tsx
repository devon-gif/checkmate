'use client'

/**
 * components/checkmate/UpgradeButton.tsx
 *
 * Orange "Upgrade now" CTA.
 *
 * - If Stripe is configured: calls /api/billing/create-checkout-session.
 * - If Stripe is not configured yet: links safely to /pricing.
 *
 * Used in both the dashboard hero and on the pricing page.
 * No Stripe backend routes are modified here.
 */

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  stripeConfigured: boolean
  /** Optional label override — defaults to "Upgrade now". */
  label?: string
  /** Optional additional class names. */
  className?: string
}

export function UpgradeButton({ stripeConfigured, label = 'Upgrade now', className = '' }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const baseClass =
    `inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] ${className}`

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        // Endpoint responded but no URL — fall back to pricing.
        setError(data.message ?? null)
        window.location.href = '/pricing'
      }
    } catch {
      window.location.href = '/pricing'
    } finally {
      setLoading(false)
    }
  }

  if (!stripeConfigured) {
    return (
      <Link href="/pricing" className={baseClass}>
        {label}
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`${baseClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {loading ? 'Loading...' : label}
      </button>
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  )
}
