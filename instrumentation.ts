/**
 * instrumentation.ts
 *
 * Next.js instrumentation hook. Loads Sentry server/edge configs at
 * runtime startup. Requires `experimental.instrumentationHook = true`
 * in `next.config.js` until Next 15 (where it became stable).
 *
 * Both configs are no-op when no DSN is configured, so this file is
 * always safe to ship.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
