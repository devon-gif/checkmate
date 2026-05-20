/**
 * sentry.edge.config.ts
 *
 * Edge runtime Sentry initialization (middleware + edge API routes).
 * No-op when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is missing.
 *
 * Loaded via `instrumentation.ts`.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.05,

    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        delete event.request.headers
      }
      return event
    }
  })
}
