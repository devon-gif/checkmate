'use client'

/**
 * app/global-error.tsx
 *
 * App Router global error boundary. Catches unhandled rendering errors
 * that escape route-level boundaries and forwards them to Sentry (no-op
 * if Sentry DSN is unset). Always renders a friendly fallback so users
 * never see a blank page.
 */

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100vh',
          margin: 0,
          padding: '4rem 1.5rem',
          background: '#030E12',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#7AE2CF',
              marginBottom: 12
            }}
          >
            CheckRay
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>
            Something went wrong on our end.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 24 }}>
            Ray hit an unexpected error. Try again, or head back to the
            homepage.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: 10,
                border: 0,
                cursor: 'pointer',
                background: '#7AE2CF',
                color: '#030E12',
                fontWeight: 500
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: 10,
                lineHeight: '40px',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                textDecoration: 'none'
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
