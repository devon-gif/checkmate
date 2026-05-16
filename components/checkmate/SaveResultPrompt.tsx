'use client'

import Link from 'next/link'

interface SaveResultPromptProps {
  /** Pre-fill sign-in return URL so users land back on /cases/new after login */
  returnPath?: string
}

export function SaveResultPrompt({
  returnPath = '/cases/new'
}: SaveResultPromptProps) {
  const signUpHref = `/sign-up?next=${encodeURIComponent(returnPath)}`
  const signInHref = `/sign-in?next=${encodeURIComponent(returnPath)}`

  return (
    <div className="rounded-xl border border-cm-green/20 bg-cm-green/5 p-5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cm-green/30 bg-cm-green/10 text-cm-green">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-medium text-white">
            Create a free account to save this result
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Your check wasn&apos;t saved because you&apos;re not signed in. Sign
            up to keep a history of all your risk checks, revisit past reports,
            and track cases over time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={signUpHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cm-green px-4 py-2 text-xs font-semibold text-cm-bg shadow-[0_0_16px_rgba(122,226,207,0.25)] transition hover:bg-cm-green/90"
            >
              Create free account
            </Link>
            <Link
              href={signInHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
