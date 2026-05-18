# Observability — TODO

## Priority

Add observability **before** any significant marketing launch or load.
You cannot fix what you cannot see.

---

## 1. Sentry (highest priority)

**Package**: `@sentry/nextjs`

**Captures**:
- Client-side JavaScript errors (the "Application error: client-side exception" events)
- Server-side / Edge runtime errors
- API route unhandled exceptions
- Performance traces

**Setup**:
```bash
pnpm add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add to `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...  # for source maps (server-only)
```

**Priority captures to instrument**:
- `app/api/analyze-case/route.ts` — wrap `handlePost` in `Sentry.captureException` on error
- `lib/checkmate.ts` — log AI fallback events as Sentry breadcrumbs
- `app/error.tsx` — call `Sentry.captureException(error)` in the error boundary

---

## 2. Vercel Web Analytics + Speed Insights

Enable in Vercel project settings (free on Pro plan):
- **Web Analytics** — page views, bounce rate, top pages
- **Speed Insights** — Core Web Vitals per route

No code changes required unless using the `@vercel/analytics` package:
```bash
pnpm add @vercel/analytics @vercel/speed-insights
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
// ... inside <body>:
<Analytics />
<SpeedInsights />
```

---

## 3. Custom Metrics to Track

### Analyzer

| Metric | How |
|---|---|
| `analyze_latency_p95` | Sentry performance / Vercel logs |
| `analyze_error_rate` | Sentry error rate |
| `openai_failure_rate` | Log `[checkmate] AI analyzer failed` events |
| `fallback_usage_rate` | Track `analysis.used_fallback === true` in usage_events |
| `supabase_save_failure_rate` | Log errors in `save-case.ts` / `save-report.ts` |

### Growth

| Metric | How |
|---|---|
| `signup_conversion_rate` | Vercel Analytics: `/` → `/sign-up` → `/dashboard` funnel |
| `trial_to_paid_rate` | Supabase / Stripe webhook events |
| `dashboard_load_error_rate` | Sentry |
| `support_ticket_submissions` | `support_tickets` table row count |
| `cost_per_analysis` | OpenAI usage dashboard / billing |

---

## 4. Vercel Runtime Log Review Checklist

After every production deploy, review:
1. Vercel → Functions tab → check for 500 errors
2. Vercel → Functions tab → check `/api/analyze-case` duration (should be <8s)
3. Vercel → Functions tab → check `/api/stripe/webhook` for failures
4. Supabase → Logs → Auth → check for spike in failed logins
5. Supabase → Logs → API → check for RLS policy errors

---

## 5. Alerting (Phase 2)

- Sentry: alert on >1% error rate on `/api/analyze-case`
- Sentry: alert on any new client-side error type
- Upstash / Redis: alert on rate limit hit spike (if implemented)
- Vercel: enable email alerts on deployment failures
