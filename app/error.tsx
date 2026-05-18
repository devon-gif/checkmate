'use client'

/**
 * app/error.tsx
 *
 * Root-level client error boundary for the App Router.
 * Catches any unhandled client-side exceptions and shows a branded,
 * friendly message instead of a blank "Application error" screen.
 *
 * This does NOT replace fixing root causes — it is a safety net.
 */

import { useEffect } from 'react'
import Link from 'next/link'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console so it shows up in Vercel Function Logs
    console.error('[CheckRay] Client error boundary caught:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#030e12] px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
        {/* Logo / brand mark */}
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
          ⚠️
        </div>

        <h1 className="mb-2 text-xl font-semibold text-white">
          Something went wrong
        </h1>

        <p className="mb-1 text-sm text-white/50">
          CheckRay hit an unexpected error. Our team has been notified.
        </p>

        {/* Show digest in production but not the raw stack trace */}
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-white/25">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#030e12] transition hover:bg-white/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
