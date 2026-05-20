/**
 * components/auth-setup-notice.tsx
 *
 * Friendly fallback rendered on /sign-in and /sign-up when Supabase
 * public env vars are missing. Avoids the client-side Supabase client
 * throwing on render. Never displays the actual env var values.
 */

import Link from 'next/link'

export function AuthSetupNotice({ action }: { action: 'sign-in' | 'sign-up' }) {
  const verb = action === 'sign-in' ? 'sign in' : 'create an account'
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-green/80">
        CheckRay
      </p>
      <h1 className="mb-3 text-2xl font-normal text-white">
        Accounts are not available yet
      </h1>
      <p className="mb-6 text-sm text-white/65">
        We're still wiring up authentication on this deployment. You can&apos;t{' '}
        {verb} right now, but the free scam-check on the homepage works
        without an account.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/try"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-[#030E12] transition hover:bg-white/90"
        >
          Try a free check
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-white/15 px-4 text-sm text-white transition hover:border-white/30"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
