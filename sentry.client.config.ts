/**
 * sentry.client.config.ts
 *
 * Client-side Sentry initialization for CheckRay.
 *
 * Auto-loaded by @sentry/nextjs at build time. When NEXT_PUBLIC_SENTRY_DSN
 * is not set, init is a no-op — no network calls, no overhead.
 *
 * NOTE: On Next.js 15+ this file is renamed to `instrumentation-client.ts`.
 * We're on Next 13.4 today; keep this filename until we upgrade.
 *
 * Privacy:
 * - Session Replay is DISABLED by default. Do not enable without
 *   masking text + blocking media + reviewing what fields appear in
 *   the analyzer UI (user-submitted scam content must never leave the
 *   browser).
 * - We do not send `report` bodies, OpenAI prompts, or auth cookies.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

    // Performance — sample lightly. Bump later when we have traffic baselines.
    tracesSampleRate: 0.1,

    // Privacy: keep these OFF until we audit user-submitted content paths.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Drop noisy / non-actionable events.
    ignoreErrors: [
      // Browser extensions throw these inside iframes; not our bug.
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      // Network noise from ad-blockers and aborted fetches.
      'AbortError',
      'NetworkError when attempting to fetch resource.'
    ],

    // Strip anything that could leak user submissions before send.
    beforeSend(event) {
      // Never include raw request bodies in client breadcrumbs.
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
      }
      return event
    }
  })
}
