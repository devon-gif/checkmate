# Rate Limiting — TODO

Rate limiting is **not yet enforced** at the HTTP layer. The billing access gate
(`lib/billing/access.ts`) provides DB-level usage limits per user. This document
tracks what needs to be added for abuse prevention and scale.

---

## Recommended Rate Limits

### Anonymous (unauthenticated)

| Endpoint | Limit | Enforcement |
|---|---|---|
| `/api/analyze-case` | 1 free check per browser session (cookie) | ✅ Already enforced via `ANON_COOKIE_NAME` |
| `/api/analyze-case` | 5 attempts / hour / IP before soft block | ❌ TODO |
| `/api/support/submit` | 5 submissions / hour / IP | ❌ TODO |
| `/sign-up` | 10 attempts / hour / IP | Handled by Supabase — do not override |
| `/sign-in` | 10 attempts / hour / IP | Handled by Supabase — do not override |

### Signed-in (Free plan / trial)

| Endpoint | Limit | Enforcement |
|---|---|---|
| `/api/analyze-case` | 1 check / month (trial) | ✅ DB gate |
| `/api/analyze-case` | 25 checks / month (Basic) | ✅ DB gate |

### Signed-in (Pro / Plus)

| Endpoint | Limit | Enforcement |
|---|---|---|
| `/api/analyze-case` | Unlimited / fair-use (200/day soft cap initially) | ❌ TODO (soft cap) |

### Admin endpoints

| Endpoint | Limit |
|---|---|
| `/api/admin/*` | Admin email whitelist only; no extra rate limit needed for MVP |

---

## When to Add CAPTCHA

- When sign-up abuse appears (bot accounts, fake email flood)
- When `/api/support/submit` is spammed
- When anonymous analysis abuse is detected despite cookie-based limit
- Recommended provider: hCaptcha (privacy-friendly) or Cloudflare Turnstile

Do **not** override Supabase auth limits directly. Let Supabase handle
brute-force protection on sign-in. Add CAPTCHA at the UI layer before submit.

---

## Implementation Plan

### Option A — Upstash Redis (recommended for Vercel)
- `@upstash/ratelimit` + `@upstash/redis`
- Sliding window per IP or user ID
- Works at the edge / serverless without a persistent server
- Zero infrastructure to manage

### Option B — Supabase DB counter (current pattern)
- Increment a `rate_limit_hits` counter in a `rate_limit_buckets` table
- Simpler, no new vendor, but adds DB round-trips on every request
- Acceptable for MVP if Upstash is not yet set up

### Option C — Vercel Edge Middleware
- Use the middleware.ts layer to reject requests before they hit the route
- Requires either Upstash (for distributed counters) or a simple in-memory
  approach (resets per cold-start — not reliable for strict limits)

---

## Stub: lib/rate-limit/

A stub is in place for future implementation. See `lib/rate-limit/`.
