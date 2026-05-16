import { cookies } from 'next/headers'

import { auth } from '@/auth'
import { GlassCard } from '@/components/checkmate/GlassCard'
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
      </div>

      {/* Form card */}
      <GlassCard className="p-6">
        <NewCaseForm />
      </GlassCard>
    </div>
  )
}
