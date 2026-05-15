import Link from 'next/link'
import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { GlassCard } from '@/components/checkmate/GlassCard'
import { GradientButton } from '@/components/checkmate/GradientButton'
import { NewCaseForm } from './new-case-form'

export default async function NewCasePage() {
  const cookieStore = cookies()
  const session = await auth({ cookieStore })

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center px-6 py-16">
        <GlassCard className="w-full p-10">
          <span className="mb-5 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-medium text-xs text-amber-300">
            Sign in required
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Create an account to analyze cases.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            CheckMate stores your cases privately — only your signed-in account
            can read them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GradientButton href="/sign-in" variant="primary">
              Sign in
            </GradientButton>
            <GradientButton href="/sign-up" variant="secondary">
              Create account
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      {/* Page header */}
      <div>
        <span className="mb-3 inline-block rounded-full border border-cm-green/30 bg-cm-green/10 px-3 py-1 font-medium text-xs text-cm-green">
          New risk check
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Analyze a suspicious message or link
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
          Paste the exact wording and add a URL if one was included. CheckMate
          will look for possible risk signals and common red flags.
        </p>
      </div>

      {/* Form card */}
      <GlassCard className="p-6">
        <NewCaseForm />
      </GlassCard>
    </div>
  )
}
