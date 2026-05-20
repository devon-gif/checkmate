# CheckRay — Sentry Setup

Minimal, opt-in Sentry foundation. **When `NEXT_PUBLIC_SENTRY_DSN` is not
set, Sentry is a true no-op** — no network calls, no overhead, no
PII collection.

## What's wired up

- `@sentry/nextjs` (^8) in `package.json`.
- `sentry.client.config.ts` — browser. Disables Session Replay by default.
- `sentry.server.config.ts` — Node.js server runtime.
- `sentry.edge.config.ts` — Edge runtime (middleware + edge routes).
- `instrumentation.ts` — Next.js hook that loads the server/edge configs.
- `next.config.js` — sets `experimental.instrumentationHook = true` (required
  on Next 13.4; stable on Next 15) and wraps the config in
  `withSentryConfig` when `@sentry/nextjs` is installed.
- `app/global-error.tsx` — App Router global error boundary that forwards
  unhandled rendering errors to Sentry and shows a friendly fallback.

## Required env vars

Set these on Vercel (Project → Settings → Environment Variables). Source
map upload only happens when `SENTRY_AUTH_TOKEN` is present, so local
builds and forks build cleanly without them.

| Variable | Scope | Required for | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Runtime capture | Missing → no events captured. Safe to commit (it is public). |
| `SENTRY_AUTH_TOKEN` | **Sensitive** | Build-time source map upload | Generate at https://sentry.io/settings/account/api/auth-tokens/. |
| `SENTRY_ORG` | Server | Source map upload | Your Sentry org slug. |
| `SENTRY_PROJECT` | Server | Source map upload | Your Sentry project slug. |

## What is collected

- Unhandled exceptions on the client (caught by `global-error.tsx` and
  Sentry's browser SDK).
- Unhandled exceptions on the server / edge runtime.
- 10% of traces (`tracesSampleRate: 0.1`) for the server and client; 5%
  on the edge. Adjust once we have a traffic baseline.

## What is NOT collected

- **Session Replay** — disabled (`replaysSessionSampleRate: 0`,
  `replaysOnErrorSampleRate: 0`). Do not enable without masking text +
  blocking media + auditing where user-submitted scam content appears in
  the DOM.
- Request bodies — `beforeSend` strips `event.request.data`.
- Cookies — `beforeSend` strips `event.request.cookies`.
- Request headers on the server/edge — stripped to avoid leaking auth
  tokens or service role keys if they ever end up in a header.
- User-submitted scam content (`/api/analyze-case` payloads). The
  analyze route does not call Sentry directly; only unhandled exceptions
  reach Sentry, and those are scrubbed.

## Verification

### 1. Local — confirm Sentry stays quiet without a DSN

```bash
# DSN unset → Sentry init returns immediately, no network traffic.
unset NEXT_PUBLIC_SENTRY_DSN
unset SENTRY_DSN
pnpm run build
pnpm run start
```

Open the browser devtools Network tab → there should be **zero**
requests to any `*.sentry.io` host.

### 2. Local — confirm Sentry captures with a DSN

```bash
export NEXT_PUBLIC_SENTRY_DSN="https://<your-dsn>"
pnpm run build
pnpm run start
```

Trigger an error by visiting a route that intentionally throws (or run
`Sentry.captureMessage('test')` in the browser console). Confirm the
event lands in the Sentry dashboard within ~1 minute.

### 3. Build — confirm source maps upload (CI / Vercel)

With all four `SENTRY_*` variables set, watch the build log for:

```
> Successfully uploaded source maps to Sentry
```

If it's missing, the build will still succeed but stack traces in
Sentry will be minified.

## Operational notes

- **Sample rates** are conservative. Once we have traffic baselines we
  can raise `tracesSampleRate` on the server.
- **Session Replay** stays off until we add field-level masking inside
  the analyzer UI. The analyzer accepts user-submitted scam messages —
  recording those would be a privacy regression.
- **Source maps** are uploaded but `hideSourceMaps: true` keeps them out
  of the public bundle. Only Sentry's symbolicator can read them.
- **Auth token rotation:** rotate `SENTRY_AUTH_TOKEN` if it ever
  appears in a build log. Use a project-scoped token, not an org-wide
  one.
