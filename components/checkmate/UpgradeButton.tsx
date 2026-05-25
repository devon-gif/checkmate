/**
 * components/checkmate/UpgradeButton.tsx
 *
 * Orange "Upgrade now" CTA. Always routes the user to the pricing page so
 * they can pick a plan + billing interval explicitly. The actual Stripe
 * Checkout call happens from the pricing card buttons, not from here.
 *
 * Used in the dashboard hero and on the pricing page.
 * The `stripeConfigured` prop is retained for backwards compatibility with
 * existing call sites but no longer changes behaviour — both paths link
 * to /pricing now.
 */

import Link from 'next/link'

interface Props {
  /** Kept for back-compat with existing dashboard call sites; unused. */
  stripeConfigured?: boolean
  /** Optional label override — defaults to "Upgrade now". */
  label?: string
  /** Optional additional class names. */
  className?: string
}

export function UpgradeButton({ label = 'Upgrade now', className = '' }: Props) {
  const baseClass =
    `inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] ${className}`

  return (
    <Link href="/pricing" className={baseClass}>
      {label}
    </Link>
  )
}
