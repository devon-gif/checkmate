/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
    // Required so Next.js loads `instrumentation.ts` on Next 13.4.
    // (Hook became stable in Next 15.)
    instrumentationHook: true
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.githubusercontent.com'
      }
    ]
  }
}

// Wrap with @sentry/nextjs.
// - `withSentryConfig` is safe to apply even when the DSN is unset;
//   Sentry's runtime init in `sentry.*.config.ts` is the gate.
// - Source map upload is skipped automatically when SENTRY_AUTH_TOKEN is
//   missing, so local builds and PRs from forks don't break.
let exportedConfig = nextConfig
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withSentryConfig } = require('@sentry/nextjs')
  exportedConfig = withSentryConfig(nextConfig, {
    silent: !process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Don't ship the Sentry tunnel by default — it can mask CSP issues.
    tunnelRoute: undefined,
    // Hide source maps in the public client bundle.
    hideSourceMaps: true,
    disableLogger: true
  })
} catch (e) {
  // @sentry/nextjs not installed — proceed without it.
}

module.exports = exportedConfig
