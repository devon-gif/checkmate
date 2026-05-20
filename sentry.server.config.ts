/**
 * sentry.server.config.ts
 *
 * Server runtime Sentry initialization (Node.js runtime).
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

    tracesSampleRate: 0.1,

    // Never serialize request bodies or headers — they can contain
    // analyzer input, auth cookies, or service-role keys.
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
