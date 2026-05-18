# lib/rate-limit

Rate limiting stubs. Not yet enforced in production routes.

## Current state

- `types.ts` — `RateLimitConfig` and `RateLimitResult` interfaces
- `policy.ts` — policy constants + stub `checkRateLimit()` that always allows

## How to activate

1. Pick an implementation backend (see `RATE_LIMITING_TODO.md`)
2. Replace the `checkRateLimit` stub body with real logic
3. Call `checkRateLimit(ANON_ANALYZE_POLICY, clientIp)` in `app/api/analyze-case/route.ts`
   before the `checkAccess` call
4. Return a 429 response if `!result.allowed`

## Example (Upstash)

```ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true
})

const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
const { success, remaining, reset } = await ratelimit.limit(ip)
if (!success) {
  return NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 })
}
```
