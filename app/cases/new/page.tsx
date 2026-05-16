import { cookies } from 'next/headers'
import Link from 'next/link'

import { auth } from '@/auth'
import { checkAccess, ANON_COOKIE_NAME } from '@/lib/billing/access'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { NewCaseForm } from './new-case-form'

export const metadata = {
  title: 'New Risk Check | CheckRay',
  description:
    'Paste suspicious text, a link, or both. Ray reads it and gives you a plain-English risk report.'
}

export default async function NewCasePage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })
  const isLoggedIn = Boolean(session?.user?.id)

  const anonymousId = cookieStore.get(ANON_COOKIE_NAME)?.value ?? null

  // Pre-check access so we can render the gate server-side if already blocked.
  const access = await checkAccess({
    userId: session?.user?.id ?? null,
    anonymousId
  })

  // ── Blocked gate ──────────────────────────────────────────────────────────
  if (!access.canAnalyze) {
    const isAnonBlocked = access.accessStatus === 'anonymous_used'
    const isTrialExpired = access.accessStatus === 'expired'

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <GlassCard className="flex flex-col items-center gap-6 p-10 text-center">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-3xl">
            {isAnonBlocked ? '🔒' : '⏰'}
          </div>

          {isAnonBlocked && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  You&apos;ve used your free check
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Create a free account to unlock your 7-day trial. No credit card required.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <GradientButton href="/sign-up" variant="primary">
                  Create free account
                </GradientButton>
                <GradientButton href="/sign-in" variant="secondary">
                  Sign in
                </GradientButton>
              </div>
            </>
          )}

          {isTrialExpired && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Your trial has ended
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Upgrade to continue running risk checks with CheckRay.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <GradientButton href="/pricing" variant="primary">
                  View plans
                </GradientButton>
                <GradientButton href="/dashboard" variant="secondary">
                  Back to dashboard
                </GradientButton>
              </div>
            </>
          )}

          {/* Fallback for other blocked states */}
          {!isAnonBlocked && !isTrialExpired && (
            <>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Access restricted
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  {access.reason ?? 'You do not have access to run checks right now.'}
                </p>
              </div>
              <GradientButton href="/pricing" variant="primary">
                View plans
              </GradientButton>
            </>
          )}

          <p className="text-xs text-white/25">
            Questions?{' '}
            <Link
              href="/contact"
              className="underline underline-offset-2 hover:text-white/50"
            >
              Contact support
            </Link>
          </p>
        </GlassCard>
      </div>
    )
  }

  // ── Normal path — render form ─────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div>
        <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 text-xs font-medium text-cm-green">
          {isLoggedIn ? 'New risk check' : 'No account needed'}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Ask Ray for a risk check
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          Paste the exact wording and add a URL if one was included. Ray looks
          for possible red flags and tells you what to watch out for.
          {!isLoggedIn && (
            <>
              {' '}
              <span className="text-white/25">
                Create a free account to save results.
              </span>
            </>
          )}
        </p>

        {/* Trial status hint */}
        {access.accessStatus === 'trialing' && access.reason && (
          <p className="mt-2 text-xs text-white/30">{access.reason}</p>
        )}
        {!isLoggedIn && access.accessStatus === 'anonymous_free' && (
          <p className="mt-2 text-xs text-yellow-500/60">
            1 free check available. Create an account to unlock unlimited checks during a 7-day trial.
          </p>
        )}
      </div>

      {/* Form card */}
      <GlassCard className="p-6">
        <NewCaseForm />
      </GlassCard>
    </div>
  )
}
